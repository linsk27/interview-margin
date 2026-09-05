import crypto from 'node:crypto'

/**
 * Interview practice persistence is deliberately kept separate from the AI
 * provider.  The score endpoint can write a normalized snapshot, while the
 * client can also merge locally collected attempts after signing in.
 */

function parseJson(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback
  try {
    const parsed = JSON.parse(value)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function publicAttempt(row) {
  if (!row) return undefined
  return {
    id: row.id,
    clientId: row.client_id ?? undefined,
    questionId: row.question_id,
    answer: row.answer,
    score: row.score,
    dimensions: parseJson(row.dimensions_json, []),
    corrections: parseJson(row.corrections_json, []),
    strengths: parseJson(row.strengths_json, []),
    gaps: parseJson(row.gaps_json, []),
    nextStep: row.next_step ?? '',
    band: row.band ?? '',
    summary: row.summary ?? '',
    createdAt: row.created_at,
  }
}

function normalizedAttempt(input) {
  const result = input?.result ?? input
  const dimensions = Array.isArray(result?.dimensions) ? result.dimensions.slice(0, 5) : []
  return {
    questionId: String(input?.questionId ?? '').trim().slice(0, 160),
    answer: String(input?.answer ?? '').trim().slice(0, 6_000),
    score: Number.isInteger(result?.score) ? Math.max(0, Math.min(100, result.score)) : null,
    dimensions,
    corrections: Array.isArray(result?.corrections) ? result.corrections.slice(0, 3) : [],
    strengths: Array.isArray(result?.strengths) ? result.strengths.slice(0, 3) : [],
    gaps: Array.isArray(result?.gaps) ? result.gaps.slice(0, 3) : [],
    nextStep: String(result?.nextStep ?? '').slice(0, 300),
    band: String(result?.band ?? '').slice(0, 100),
    summary: String(result?.summary ?? '').slice(0, 300),
  }
}

function attemptInsertValues(db, userId, input, now = new Date().toISOString()) {
  const normalized = normalizedAttempt(input)
  if (!userId || !normalized.questionId || !normalized.answer || normalized.score === null) return undefined
  const clientId = typeof input?.clientId === 'string' && input.clientId.trim()
    ? input.clientId.trim().slice(0, 160)
    : undefined
  const id = crypto.randomUUID()
  try {
    db.prepare(`
      INSERT INTO interview_attempts(
        id, user_id, question_id, client_id, answer, score, dimensions_json,
        corrections_json, strengths_json, gaps_json, next_step, band, summary,
        created_at, updated_at
      ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      normalized.questionId,
      clientId ?? null,
      normalized.answer,
      normalized.score,
      JSON.stringify(normalized.dimensions),
      JSON.stringify(normalized.corrections),
      JSON.stringify(normalized.strengths),
      JSON.stringify(normalized.gaps),
      normalized.nextStep,
      normalized.band,
      normalized.summary,
      now,
      now,
    )
    return publicAttempt(db.prepare('SELECT * FROM interview_attempts WHERE id = ?').get(id))
  } catch (error) {
    // Client IDs make local-to-account merges idempotent.  A duplicate is not
    // an error for the caller; return the canonical server record instead.
    if (error?.code !== 'SQLITE_CONSTRAINT_UNIQUE') throw error
    const existing = clientId
      ? db.prepare('SELECT * FROM interview_attempts WHERE user_id = ? AND client_id = ?').get(userId, clientId)
      : undefined
    return publicAttempt(existing)
  }
}

export function createInterviewAttempt(db, { userId, questionId, answer, result, clientId }) {
  return attemptInsertValues(db, userId, { questionId, answer, result, clientId })
}

export function listInterviewAttempts(db, userId, { questionId, limit = 50 } = {}) {
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 50))
  const normalizedQuestionId = typeof questionId === 'string' && questionId.trim()
    ? questionId.trim().slice(0, 160)
    : undefined
  const rows = normalizedQuestionId
    ? db.prepare(`SELECT * FROM interview_attempts WHERE user_id = ? AND question_id = ? ORDER BY created_at DESC LIMIT ?`)
      .all(userId, normalizedQuestionId, safeLimit)
    : db.prepare(`SELECT * FROM interview_attempts WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`)
      .all(userId, safeLimit)
  return rows.map(publicAttempt)
}

export function deleteInterviewAttempt(db, userId, id) {
  return db.prepare('DELETE FROM interview_attempts WHERE id = ? AND user_id = ?').run(id, userId).changes > 0
}

export function mergeInterviewAttempts(db, userId, attempts) {
  const list = Array.isArray(attempts) ? attempts.slice(0, 100) : []
  let inserted = 0
  let repeated = 0
  const merged = []
  db.transaction(() => {
    for (const input of list) {
      const before = typeof input?.clientId === 'string' && input.clientId.trim()
        ? db.prepare('SELECT id FROM interview_attempts WHERE user_id = ? AND client_id = ?')
          .get(userId, input.clientId.trim().slice(0, 160))
        : undefined
      const item = attemptInsertValues(db, userId, input, typeof input?.createdAt === 'string' ? input.createdAt : undefined)
      if (!item) continue
      if (before) repeated += 1
      else inserted += 1
      merged.push(item)
    }
  })()
  return { inserted, repeated, attempts: merged }
}

function dimensionTotals(rows) {
  const totals = new Map()
  for (const row of rows) {
    const dimensions = parseJson(row.dimensions_json, [])
    if (!Array.isArray(dimensions)) continue
    for (const dimension of dimensions) {
      const key = String(dimension?.key ?? dimension?.label ?? '').trim()
      if (!key) continue
      const score = Number(dimension?.score)
      const maxScore = Number(dimension?.maxScore)
      if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0) continue
      const current = totals.get(key) ?? { key, label: String(dimension?.label ?? key), score: 0, maxScore: 0, count: 0 }
      current.score += score
      current.maxScore += maxScore
      current.count += 1
      totals.set(key, current)
    }
  }
  return [...totals.values()]
    .map((item) => ({ ...item, percentage: Math.round((item.score / item.maxScore) * 100) }))
    .sort((a, b) => a.percentage - b.percentage)
}

export function getLearningInsights(db, userId) {
  const rows = db.prepare(`
    SELECT score, dimensions_json, created_at
    FROM interview_attempts WHERE user_id = ? ORDER BY created_at DESC LIMIT 200
  `).all(userId)
  const scores = rows.map((row) => Number(row.score)).filter(Number.isFinite)
  const trend = new Map()
  for (const row of rows) {
    const day = String(row.created_at).slice(0, 10)
    const item = trend.get(day) ?? { date: day, attempts: 0, totalScore: 0 }
    item.attempts += 1
    item.totalScore += Number(row.score) || 0
    trend.set(day, item)
  }
  return {
    totalAttempts: rows.length,
    averageScore: scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : null,
    latestScore: scores[0] ?? null,
    weakestDimensions: dimensionTotals(rows).slice(0, 3),
    trend: [...trend.values()].map((item) => ({ ...item, averageScore: Math.round(item.totalScore / item.attempts) })).slice(0, 30),
  }
}

