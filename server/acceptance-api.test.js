// @vitest-environment node
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from './app.js'

describe('acceptance API contracts', () => {
  let app, db, handlerGate, handlerStarted
  beforeEach(() => {
    handlerGate = undefined; handlerStarted = undefined
    const created = createApp({
      serveStatic: false, secureCookies: false,
      aiUsageEnv: { AI_USER_CHAT_DAILY_LIMIT: '1', AI_GUEST_CHAT_DAILY_LIMIT: '2' },
      aiChatHandler: async (req, res) => {
        handlerStarted?.()
        if (handlerGate) await handlerGate
        req.aiUsage.inputTokens = 10; req.aiUsage.outputTokens = 20
        req.aiUsage.actualTokens = 30; req.aiUsage.usageSource = 'usage'; req.aiUsage.model = 'test-model'
        res.json({ ok: true })
      },
      databaseOptions: { filename: ':memory:', usePrecompiledSeed: true,
        bootstrap: { username: 'acceptance-admin', password: 'TestOnly!123', skipCredentialFile: true } },
    })
    app = created.app; db = created.database.db
  })
  afterEach(() => db.close())

  it('serves identical JSON search results and pagination from both paths', async () => {
    const query = { q: 'Java', limit: 2 }
    const expected = await request(app).get('/api/catalog/search').query(query).expect(200)
    const actual = await request(app).get('/api/search').query(query).expect('Content-Type', /json/).expect(200)
    expect(actual.body).toEqual(expected.body)
    expect(actual.body.results).toHaveLength(2)
    expect(actual.body.hasMore).toBe(true)
    const next = await request(app).get('/api/search').query({ ...query, cursor: actual.body.nextCursor }).expect(200)
    expect(next.body.results.every(item => !actual.body.results.some(first => first.id === item.id))).toBe(true)
    const empty = await request(app).get('/api/search').expect(200)
    expect(empty.body).toMatchObject({ results: [], total: 0, hasMore: false })
  })

  it('hides private and archived banks from guest searches through either path', async () => {
    const question = db.prepare("SELECT q.id, q.bank_id, q.title FROM questions q JOIN question_banks b ON q.bank_id=b.id WHERE b.visibility='public' AND q.archived_at IS NULL LIMIT 1").get()
    const before = await request(app).get('/api/search').query({ q: question.title }).expect(200)
    expect(before.body.results.some(item => item.id === question.id)).toBe(true)
    for (const mutation of ["visibility='private'", "visibility='public', archived_at='2026-09-08T00:00:00Z'"]) {
      db.prepare(`UPDATE question_banks SET ${mutation} WHERE id=?`).run(question.bank_id)
      for (const path of ['/api/search', '/api/catalog/search']) {
        const result = await request(app).get(path).query({ q: question.title }).expect(200)
        expect(result.body.results.every(item => item.id !== question.id)).toBe(true)
      }
    }
  })

  it('rejects a duplicate request while its original provider call is still in flight', async () => {
    let release
    handlerGate = new Promise(resolve => { release = resolve })
    const started = new Promise(resolve => { handlerStarted = resolve })
    const first = request(app).post('/api/ai-chat').set('X-Request-Id', 'concurrent-check').send({ messages: [] }).then(result => result)
    await started
    try {
      const duplicate = await request(app).post('/api/ai-chat').set('X-Request-Id', 'concurrent-check').send({ messages: [] }).expect(409)
      expect(duplicate.body.code).toBe('AI_REQUEST_REPEATED')
      expect(db.prepare('SELECT status FROM ai_usage_events').get().status).toBe('reserved')
    } finally { release() }
    expect((await first).status).toBe(200)
    expect(db.prepare('SELECT COUNT(*) AS count FROM ai_usage_events').get().count).toBe(1)
  })

  it('enforces the signed-in daily limit and restricts usage reports to administrators', async () => {
    await request(app).get('/api/admin/ai-usage').expect(401)
    const admin = request.agent(app)
    await admin.post('/api/auth/login').send({ username: 'acceptance-admin', password: 'TestOnly!123' }).expect(200)
    await admin.post('/api/auth/change-password').send({ currentPassword: 'TestOnly!123', newPassword: 'Changed!456' }).expect(200)
    const first = await admin.post('/api/ai-chat').send({ messages: [] }).expect(200)
    expect(first.headers['x-ai-quota-remaining']).toBe('0')
    const denied = await admin.post('/api/ai-chat').send({ messages: [] }).expect(429)
    expect(denied.body.code).toBe('AI_QUOTA_EXCEEDED')
    expect(denied.body).not.toHaveProperty('model')
    await request(app).post('/api/ai-chat').send({ messages: [] }).expect(200)
    const report = await admin.get('/api/admin/ai-usage').query({ model: 'test-model', operation: 'chat' }).expect(200)
    expect(report.body.events[0]).toMatchObject({ operation: 'chat', status: 'completed', model: 'test-model', count: 2, actual_tokens: 60 })
    const filtered = await admin.get('/api/admin/ai-usage').query({ model: 'another-model' }).expect(200)
    expect(filtered.body.events).toEqual([])
  })
})
