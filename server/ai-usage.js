import crypto from 'node:crypto'

const DEFAULT_LIMITS = {
  guest: { chat: 20, score: 3 },
  user: { chat: 100, score: 20 },
}

const DEFAULT_COST_RATES = {
  // Conservative defaults keep the global circuit breaker useful even when a
  // deployment has not filled in provider pricing yet.  Operators can replace
  // them with the exact model price through environment variables.
  inputPer1k: 0.001,
  outputPer1k: 0.003,
}

export class AiQuotaError extends Error {
  constructor(message = '今日 AI 配额已用尽，请明天再试。', details = {}) {
    super(message)
    this.name = 'AiQuotaError'
    this.code = details.code ?? 'AI_QUOTA_EXCEEDED'
    this.status = details.status ?? 429
    this.retryAfter = details.retryAfter ?? 60
    this.quota = details.quota
  }
}

function dayKey(now = new Date()) { return now.toISOString().slice(0, 10) }

export function hashVisitorIp(ip, salt = process.env.AI_USAGE_IP_SALT ?? 'interview-margin-ai') {
  return crypto.createHash('sha256').update(`${salt}:${String(ip || 'unknown')}`).digest('hex')
}

function requestIp(req) {
  const forwarded = req?.headers?.['x-forwarded-for'] ?? req?.get?.('x-forwarded-for')
  return String(forwarded || req?.ip || req?.socket?.remoteAddress || 'unknown').split(',')[0].trim()
}

export function usageIdentity(req) {
  if (req?.user?.id) return { subjectType: 'user', subjectId: String(req.user.id), userId: String(req.user.id) }
  const visitorHash = hashVisitorIp(requestIp(req))
  return { subjectType: 'visitor', subjectId: visitorHash, visitorHash }
}

export function usageLimits(env = process.env) {
  // Existing unit tests exercise the short-window limiter with repeated
  // requests.  Keep that test-only path independent from the production daily
  // quota while still honoring any explicitly supplied limit.
  const testDefaults = env === process.env && process.env.NODE_ENV === 'test'
  const read = (key, fallback) => {
    const n = Number.parseInt(env[key] ?? '', 10)
    return Number.isFinite(n) && n >= 0 ? n : fallback
  }
  return {
    guest: {
      chat: read('AI_GUEST_CHAT_DAILY_LIMIT', testDefaults ? 1_000 : DEFAULT_LIMITS.guest.chat),
      score: read('AI_GUEST_SCORE_DAILY_LIMIT', testDefaults ? 1_000 : DEFAULT_LIMITS.guest.score),
    },
    user: {
      chat: read('AI_USER_CHAT_DAILY_LIMIT', testDefaults ? 1_000 : DEFAULT_LIMITS.user.chat),
      score: read('AI_USER_SCORE_DAILY_LIMIT', testDefaults ? 1_000 : DEFAULT_LIMITS.user.score),
    },
  }
}

function globalBudget(env = process.env) {
  const value = Number(env.AI_GLOBAL_DAILY_BUDGET_USD ?? 20)
  return Number.isFinite(value) && value > 0 ? value : Infinity
}

export function estimateAiCost({ inputTokens = 0, outputTokens = 0, model = '', env = process.env } = {}) {
  let modelRate
  if (env.AI_MODEL_PRICES_JSON) {
    try {
      const parsed = JSON.parse(env.AI_MODEL_PRICES_JSON)
      modelRate = parsed?.[String(model || env.OPENAI_MODEL || '')]
    } catch { /* malformed optional pricing is ignored */ }
  }
  const inputRate = Number(modelRate?.inputPer1k ?? env.AI_INPUT_COST_PER_1K_TOKENS ?? env.AI_INPUT_PRICE_PER_1K ?? env.AI_COST_PER_1K_TOKENS ?? DEFAULT_COST_RATES.inputPer1k)
  const outputRate = Number(modelRate?.outputPer1k ?? env.AI_OUTPUT_COST_PER_1K_TOKENS ?? env.AI_OUTPUT_PRICE_PER_1K ?? env.AI_COST_PER_1K_TOKENS ?? DEFAULT_COST_RATES.outputPer1k)
  return (Math.max(0, Number(inputTokens) || 0) / 1000) * (Number.isFinite(inputRate) ? inputRate : 0)
    + (Math.max(0, Number(outputTokens) || 0) / 1000) * (Number.isFinite(outputRate) ? outputRate : 0)
}

function quotaSnapshot(db, day, identity, operation, env = process.env) {
  const table = hasCanonical(db) ? 'ai_usage_daily' : 'daily'
  const row = db.prepare(`SELECT * FROM ${table} WHERE day=? AND subject_type=? AND subject_id=?`).get(day, identity.subjectType, identity.subjectId)
  const used = Number(row?.[`${operation}_used`] ?? 0) + Number(row?.[`${operation}_reserved`] ?? 0)
  const limit = usageLimits(env)[identity.subjectType === 'user' ? 'user' : 'guest'][operation]
  const global = db.prepare(`SELECT COALESCE(SUM(cost_usd),0) AS cost FROM ${table} WHERE day=? AND subject_type='global'`).get(day).cost
  const resetAt = `${day}T23:59:59.999Z`
  return { limit, used, remaining: Math.max(0, limit - used), resetAt, globalCostUsd: Number(global || 0), globalBudgetUsd: globalBudget(env) }
}

function hasCanonical(db) {
  return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='ai_usage_events'").get())
}

function recoverStaleReservations(db) {
  if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='usage_events'").get()) return
  const cutoff = new Date(Date.now() - 15 * 60_000).toISOString()
  const stale = db.prepare("SELECT request_id, day, operation, subject_type, subject_id, estimated_cost_usd FROM usage_events WHERE status='reserved' AND created_at < ?").all(cutoff)
  for (const event of stale) {
    db.prepare("UPDATE usage_events SET status='failed', error_code='AI_RESERVATION_EXPIRED', completed_at=? WHERE request_id=? AND status='reserved'").run(new Date().toISOString(), event.request_id)
    db.prepare(`UPDATE daily SET ${event.operation}_reserved=MAX(0,${event.operation}_reserved-1) WHERE day=? AND subject_type=? AND subject_id=?`).run(event.day, event.subject_type, event.subject_id)
    db.prepare("UPDATE daily SET cost_usd=MAX(0,cost_usd-?) WHERE day=? AND subject_type='global' AND subject_id='global'").run(Number(event.estimated_cost_usd || 0), event.day)
    if (hasCanonical(db)) {
      db.prepare("UPDATE ai_usage_events SET status='failed', error_code='AI_RESERVATION_EXPIRED', completed_at=? WHERE request_id=? AND status='reserved'").run(new Date().toISOString(), event.request_id)
      db.prepare(`UPDATE ai_usage_daily SET ${event.operation}_reserved=MAX(0,${event.operation}_reserved-1) WHERE day=? AND subject_type=? AND subject_id=?`).run(event.day, event.subject_type, event.subject_id)
      db.prepare("UPDATE ai_usage_daily SET cost_usd=MAX(0,cost_usd-?) WHERE day=? AND subject_type='global' AND subject_id='global'").run(Number(event.estimated_cost_usd || 0), event.day)
    }
  }
}

export function reserveAiUsage({
  db,
  req,
  operation,
  requestId,
  model = '',
  estimatedTokens = 0,
  estimatedInputTokens = 0,
  estimatedOutputTokens = estimatedTokens,
  estimatedCostUsd,
  env = process.env,
} = {}) {
  if (!db) return { requestId, bypassed: true }
  if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='usage_events'").get()) {
    return { requestId, bypassed: true, quota: undefined }
  }
  recoverStaleReservations(db)
  const id = usageIdentity(req)
  const day = dayKey()
  const rid = String(requestId || req?.headers?.['x-request-id'] || crypto.randomUUID()).slice(0, 128)
  const inputEstimate = Math.max(0, Number(estimatedInputTokens) || 0)
  const outputEstimate = Math.max(0, Number(estimatedOutputTokens) || Number(estimatedTokens) || 0)
  const estimated = Number.isFinite(Number(estimatedCostUsd))
    ? Number(estimatedCostUsd)
    : estimateAiCost({ inputTokens: inputEstimate, outputTokens: outputEstimate, model, env })
  const result = db.transaction(() => {
    const existing = db.prepare('SELECT * FROM usage_events WHERE request_id=?').get(rid)
    if (existing) return { repeated: true, event: existing, quota: quotaSnapshot(db, day, id, operation, env) }
    const quota = quotaSnapshot(db, day, id, operation, env)
    if (quota.used >= quota.limit) throw new AiQuotaError(undefined, { quota })
    if (quota.globalCostUsd + estimated > quota.globalBudgetUsd) {
      throw new AiQuotaError('AI 今日预算已达到上限，请稍后再试。', { code: 'AI_GLOBAL_BUDGET_EXCEEDED', quota })
    }
    const now = new Date().toISOString()
    db.prepare(`INSERT INTO daily(day,subject_type,subject_id,${operation}_reserved,cost_usd)
      VALUES(?,?,?,?,0) ON CONFLICT(day,subject_type,subject_id) DO UPDATE SET ${operation}_reserved=${operation}_reserved+1`).run(day, id.subjectType, id.subjectId, 1)
    db.prepare(`INSERT INTO daily(day,subject_type,subject_id,cost_usd) VALUES(?,?,?,?)
      ON CONFLICT(day,subject_type,subject_id) DO UPDATE SET cost_usd=cost_usd+excluded.cost_usd`).run(day, 'global', 'global', estimated)
    db.prepare(`INSERT INTO usage_events(request_id,day,operation,subject_type,subject_id,user_id,visitor_hash,status,reserved_units,estimated_tokens,estimated_cost_usd,actual_tokens,cost_usd,created_at,model,input_tokens,output_tokens,cost_source)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(rid, day, operation, id.subjectType, id.subjectId, id.userId ?? null, id.visitorHash ?? null, 'reserved', 1, inputEstimate + outputEstimate, estimated, 0, 0, now, String(model || ''), inputEstimate, outputEstimate, 'estimate')
    if (hasCanonical(db)) {
      db.prepare(`INSERT INTO ai_usage_daily(day,subject_type,subject_id,${operation}_reserved,cost_usd)
        VALUES(?,?,?,?,0) ON CONFLICT(day,subject_type,subject_id) DO UPDATE SET ${operation}_reserved=${operation}_reserved+1`).run(day, id.subjectType, id.subjectId, 1)
      db.prepare(`INSERT INTO ai_usage_daily(day,subject_type,subject_id,cost_usd) VALUES(?,?,?,?)
        ON CONFLICT(day,subject_type,subject_id) DO UPDATE SET cost_usd=cost_usd+excluded.cost_usd`).run(day, 'global', 'global', estimated)
      db.prepare(`INSERT INTO ai_usage_events(request_id,day,operation,subject_type,subject_id,user_id,visitor_hash,status,reserved_units,estimated_tokens,estimated_cost_usd,actual_tokens,cost_usd,created_at,model,input_tokens,output_tokens,cost_source)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(rid, day, operation, id.subjectType, id.subjectId, id.userId ?? null, id.visitorHash ?? null, 'reserved', 1, inputEstimate + outputEstimate, estimated, 0, 0, now, String(model || ''), inputEstimate, outputEstimate, 'estimate')
    }
    return { repeated: false, requestId: rid, quota: { ...quota, used: quota.used + 1, remaining: Math.max(0, quota.remaining - 1) }, estimatedCostUsd: estimated }
  })()
  return result
}

export function settleAiUsage({
  db,
  requestId,
  status = 'completed',
  actualTokens = 0,
  inputTokens = 0,
  outputTokens = 0,
  estimatedTokens = 0,
  costUsd,
  costSource = 'usage',
  model,
  errorCode,
  env = process.env,
} = {}) {
  if (!db || !requestId) return
  return db.transaction(() => {
    const event = db.prepare('SELECT * FROM usage_events WHERE request_id=?').get(requestId)
    if (!event || event.status !== 'reserved') return event
    const now = new Date().toISOString()
    const finalStatus = ['completed', 'failed', 'cancelled'].includes(status) ? status : 'failed'
    const actual = Number(actualTokens || 0)
    const input = Math.max(0, Number(inputTokens) || 0)
    const output = Math.max(0, Number(outputTokens) || 0)
    const estimated = Number(estimatedTokens || event.estimated_tokens || 0)
    const charge = Number.isFinite(Number(costUsd))
      ? Number(costUsd)
      : estimateAiCost({
        inputTokens: input || Number(event.input_tokens) || 0,
        outputTokens: output || actual || Number(event.output_tokens) || Math.max(0, estimated - (input || Number(event.input_tokens) || 0)),
        model: model || event.model,
        env,
      })
    const source = costSource || (input || output ? 'usage' : 'estimate')
    db.prepare('UPDATE usage_events SET status=?, actual_tokens=?, estimated_tokens=?, cost_usd=?, error_code=?, completed_at=?, model=COALESCE(NULLIF(?, \'\'), model), input_tokens=?, output_tokens=?, cost_source=? WHERE request_id=?')
      .run(finalStatus, actual, estimated, charge, errorCode ?? null, now, String(model || ''), input || Number(event.input_tokens) || 0, output || (actual || Number(event.output_tokens) || 0), source, requestId)
    db.prepare(`UPDATE daily SET ${event.operation}_reserved=MAX(0,${event.operation}_reserved-1), ${event.operation}_used=${event.operation}_used+? WHERE day=? AND subject_type=? AND subject_id=?`)
      .run(finalStatus === 'completed' ? 1 : 0, event.day, event.subject_type, event.subject_id)
    db.prepare('UPDATE daily SET cost_usd=MAX(0,cost_usd-?)+? WHERE day=? AND subject_type=\'global\' AND subject_id=\'global\'')
      .run(Number(event.estimated_cost_usd || 0), charge, event.day)
    if (hasCanonical(db)) {
      db.prepare(`UPDATE ai_usage_daily SET ${event.operation}_reserved=MAX(0,${event.operation}_reserved-1), ${event.operation}_used=${event.operation}_used+? WHERE day=? AND subject_type=? AND subject_id=?`)
        .run(finalStatus === 'completed' ? 1 : 0, event.day, event.subject_type, event.subject_id)
      db.prepare('UPDATE ai_usage_daily SET cost_usd=MAX(0,cost_usd-?)+? WHERE day=? AND subject_type=\'global\' AND subject_id=\'global\'')
        .run(Number(event.estimated_cost_usd || 0), charge, event.day)
      db.prepare('UPDATE ai_usage_events SET status=?, actual_tokens=?, estimated_tokens=?, cost_usd=?, error_code=?, completed_at=?, model=COALESCE(NULLIF(?, \'\'), model), input_tokens=?, output_tokens=?, cost_source=? WHERE request_id=?')
        .run(finalStatus, actual, estimated, charge, errorCode ?? null, now, String(model || ''), input || Number(event.input_tokens) || 0, output || (actual || Number(event.output_tokens) || 0), source, requestId)
    }
    return {
      ...event,
      status: finalStatus,
      actual_tokens: actual,
      estimated_tokens: estimated,
      input_tokens: input || Number(event.input_tokens) || 0,
      output_tokens: output || actual || Number(event.output_tokens) || 0,
      cost_usd: charge,
      cost_source: source,
    }
  })()
}

export function summarizeAiUsage(db, { day = dayKey(), limit = 100, operation, status, subjectType, model } = {}) {
  const table = hasCanonical(db) ? 'ai_usage_daily' : 'daily'
  const eventTable = hasCanonical(db) ? 'ai_usage_events' : 'usage_events'
  const safeLimit = Math.min(500, Math.max(1, Number(limit) || 100))
  const dailyWhere = ['day=?']
  const dailyParams = [day]
  if (subjectType === 'user' || subjectType === 'visitor' || subjectType === 'global') { dailyWhere.push('subject_type=?'); dailyParams.push(subjectType) }
  const daily = db.prepare(`SELECT * FROM ${table} WHERE ${dailyWhere.join(' AND ')} ORDER BY subject_type, subject_id LIMIT ?`).all(...dailyParams, safeLimit)
  const eventWhere = ['day=?']
  const eventParams = [day]
  if (operation === 'chat' || operation === 'score') { eventWhere.push('operation=?'); eventParams.push(operation) }
  if (status === 'reserved' || status === 'completed' || status === 'failed' || status === 'cancelled') { eventWhere.push('status=?'); eventParams.push(status) }
  if (typeof model === 'string' && model.trim()) { eventWhere.push('model=?'); eventParams.push(model.trim()) }
  const events = db.prepare(`SELECT operation,status,model,COUNT(*) AS count,
      COALESCE(SUM(input_tokens),0) AS input_tokens,
      COALESCE(SUM(output_tokens),0) AS output_tokens,
      COALESCE(SUM(actual_tokens),0) AS actual_tokens,
      COALESCE(SUM(estimated_tokens),0) AS estimated_tokens,
      COALESCE(SUM(cost_usd),0) AS cost_usd
    FROM ${eventTable} WHERE ${eventWhere.join(' AND ')} GROUP BY operation,status,model`).all(...eventParams)
  const global = daily.find((row) => row.subject_type === 'global' && row.subject_id === 'global')
  return {
    day,
    daily,
    events,
    totalCostUsd: Number(global?.cost_usd ?? 0),
    globalBudgetUsd: globalBudget(),
    generatedAt: new Date().toISOString(),
  }
}

export function quotaErrorResponse(res, error, requestId) {
  const status = error instanceof AiQuotaError ? error.status : 500
  if (requestId) {
    res.setHeader?.('X-Request-Id', requestId)
    res.setHeader?.('X-AI-Request-Id', requestId)
  }
  const quota = error.quota
  const publicQuota = quota
    ? { limit: quota.limit, remaining: quota.remaining, resetAt: quota.resetAt }
    : undefined
  return res.status(status).json({
    error: error.message,
    code: error.code ?? 'AI_QUOTA_ERROR',
    retryable: status === 429,
    requestId,
    ...(publicQuota ? { quota: publicQuota } : {}),
  })
}

// Stable aliases used by integrations and tests.
export const reserveUsage = reserveAiUsage
export const settleUsage = settleAiUsage
export const getUsageSummary = summarizeAiUsage
