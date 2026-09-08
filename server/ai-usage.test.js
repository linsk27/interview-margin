// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDatabase } from './database.js'
import { reserveAiUsage, settleAiUsage, summarizeAiUsage, usageLimits } from './ai-usage.js'

describe('daily AI quota and settlement', () => {
  let db
  const guest = { ip: '192.0.2.10' }
  const env = { AI_GLOBAL_DAILY_BUDGET_USD: '20' }
  const reserve = (requestId, extra = {}) => reserveAiUsage({ db, req: guest, operation: 'chat', requestId, env, ...extra })
  const settle = (requestId, extra = {}) => settleAiUsage({ db, requestId, env, ...extra })
  beforeEach(() => {
    db = createDatabase({ filename: ':memory:', seed: false, enableExtended: true, bootstrap: false }).db
  })
  afterEach(() => { db.close(); vi.useRealTimers() })

  it('keeps production defaults independent of the test environment', () => {
    expect(usageLimits({})).toEqual({ guest: { chat: 20, score: 3 }, user: { chat: 100, score: 20 } })
  })

  it.each(['chat', 'score'])('counts pending %s requests before they complete', (operation) => {
    const limits = { ...env, [`AI_GUEST_${operation.toUpperCase()}_DAILY_LIMIT`]: '1' }
    expect(reserve('first', { operation, env: limits }).quota.remaining).toBe(0)
    expect(() => reserve('second', { operation, env: limits })).toThrow(expect.objectContaining({ code: 'AI_QUOTA_EXCEEDED' }))
    settle('first', { inputTokens: 10, outputTokens: 20 })
    expect(() => reserve('third', { operation, env: limits })).toThrow(expect.objectContaining({ code: 'AI_QUOTA_EXCEEDED' }))
    expect(reserve('other-visitor', { operation, env: limits, req: { ip: '192.0.2.11' } }).quota.remaining).toBe(0)
  })

  it('resets the daily quota at the next UTC day', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-08T23:59:58Z'))
    const limits = { ...env, AI_GUEST_CHAT_DAILY_LIMIT: '1' }
    reserve('today', { env: limits }); settle('today')
    vi.setSystemTime(new Date('2026-09-09T00:00:01Z'))
    expect(reserve('tomorrow', { env: limits }).quota.remaining).toBe(0)
  })

  it('reserves the global budget across visitors and releases the estimate at settlement', () => {
    const budget = { AI_GLOBAL_DAILY_BUDGET_USD: '0.01' }
    reserve('first', { env: budget, estimatedCostUsd: 0.008 })
    expect(() => reserve('second', { env: budget, req: { ip: '192.0.2.12' }, estimatedCostUsd: 0.003 }))
      .toThrow(expect.objectContaining({ code: 'AI_GLOBAL_BUDGET_EXCEEDED' }))
    settle('first', { costUsd: 0.002 })
    expect(reserve('second', { env: budget, estimatedCostUsd: 0.003 }).repeated).toBe(false)
    expect(summarizeAiUsage(db).totalCostUsd).toBeCloseTo(0.005)
  })

  it('settles provider usage once and keeps both ledger versions in sync', () => {
    reserve('usage', { estimatedInputTokens: 1000, estimatedOutputTokens: 1000 })
    settle('usage', { inputTokens: 100, outputTokens: 200, actualTokens: 300, costSource: 'usage' })
    settle('usage', { costUsd: 100 })
    const legacy = db.prepare('SELECT * FROM usage_events').get()
    const canonical = db.prepare('SELECT * FROM ai_usage_events').get()
    expect(canonical).toEqual(legacy)
    expect(canonical).toMatchObject({ status: 'completed', actual_tokens: 300, input_tokens: 100, output_tokens: 200, cost_source: 'usage' })
    expect(canonical.cost_usd).toBeCloseTo(0.0007)
    expect(db.prepare('SELECT * FROM daily ORDER BY subject_type').all()).toEqual(db.prepare('SELECT * FROM ai_usage_daily ORDER BY subject_type').all())
    expect(summarizeAiUsage(db).totalCostUsd).toBeCloseTo(0.0007)
  })

  it('marks missing provider usage as estimated and uses separate input/output estimates', () => {
    reserve('no-usage', { estimatedInputTokens: 100, estimatedOutputTokens: 200 })
    const event = settle('no-usage', { costSource: 'estimate' })
    expect(event.cost_source).toBe('estimate')
    expect(event.input_tokens).toBe(100)
    expect(event.output_tokens).toBe(200)
    expect(event.cost_usd).toBeCloseTo(0.0007, 8)
  })

  it.each(['failed', 'cancelled'])('returns a %s request quota without losing the event', (status) => {
    const limits = { ...env, AI_GUEST_CHAT_DAILY_LIMIT: '1' }
    reserve('failed', { env: limits })
    settle('failed', { status, costUsd: 0, errorCode: 'TEST_INTERRUPTED' })
    expect(reserve('retry', { env: limits }).quota.remaining).toBe(0)
    expect(db.prepare('SELECT status, error_code FROM ai_usage_events WHERE request_id=?').get('failed'))
      .toEqual({ status, error_code: 'TEST_INTERRUPTED' })
  })

  it('does not double reserve a repeated request id', () => {
    reserve('same', { estimatedCostUsd: 0.01 })
    expect(reserve('same', { estimatedCostUsd: 0.01 }).repeated).toBe(true)
    expect(summarizeAiUsage(db).totalCostUsd).toBeCloseTo(0.01)
    expect(db.prepare('SELECT chat_reserved FROM ai_usage_daily WHERE subject_type=?').get('visitor').chat_reserved).toBe(1)
  })
})
