// @vitest-environment node

import crypto from 'node:crypto'

import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createApp } from './app.js'
import { passwordHash } from './database.js'

const INITIAL_PASSWORD = 'TestPassword!123'
const CHANGED_PASSWORD = 'ChangedPassword!456'

function emptyState() {
  return {
    version: 1,
    progress: {},
    annotations: [],
    activity: {},
    settings: {
      theme: 'light', fontTheme: 'clean', readingSize: 'comfortable', readingFont: 'sans', pageLayout: 'spread', focusMode: false, notesOpen: true,
    },
  }
}

async function loginAndChangePassword(agent, username, currentPassword, newPassword = CHANGED_PASSWORD) {
  await agent.post('/api/auth/login').send({ username, password: currentPassword }).expect(200)
  await agent.post('/api/auth/change-password').send({ currentPassword, newPassword }).expect(200)
  const session = await agent.get('/api/auth/session').expect(200)
  return session.body.user.id
}

describe('server API', () => {
  let app
  let db

  beforeEach(() => {
    const created = createApp({
      serveStatic: false,
      secureCookies: false,
      databaseOptions: {
        filename: ':memory:',
        usePrecompiledSeed: true,
        bootstrap: { username: 'admin', password: INITIAL_PASSWORD, skipCredentialFile: true },
      },
    })
    app = created.app
    db = created.database.db
  })

  afterEach(() => db.close())

  it('returns the shared AI error contract when the Express rate limit is exceeded', async () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await request(app).post('/api/ai-chat').send({ messages: [] }).expect(400)
    }

    const limited = await request(app).post('/api/ai-chat').send({ messages: [] }).expect(429)
    expect(limited.body).toEqual({
      error: 'AI 请求过于频繁，请稍后再试。',
      code: 'AI_RATE_LIMITED',
      retryable: true,
    })
  })

  it('accepts privacy-conscious public feedback and lets only admins manage it', async () => {
    const feedback = {
      kind: 'feedback', name: '访客', contact: '', message: '移动端打开申请弹窗时，希望标题再紧凑一点。', consent: true, website: '',
    }
    const created = await request(app).post('/api/contact-requests').send(feedback).expect(201)
    expect(created.body).toMatchObject({ ok: true, id: expect.any(String), createdAt: expect.any(String) })
    expect(JSON.stringify(created.body)).not.toContain(feedback.message)

    await request(app).post('/api/contact-requests').send({
      ...feedback, kind: 'account', message: '正在准备前端面试，希望保存复习进度。',
    }).expect(400)

    await request(app).post('/api/contact-requests').send({ ...feedback, website: 'https://spam.example' }).expect(202)
    expect(db.prepare('SELECT COUNT(*) AS count FROM contact_requests').get().count).toBe(1)
    await request(app).get('/api/admin/contact-requests').expect(401)

    const admin = request.agent(app)
    await loginAndChangePassword(admin, 'admin', INITIAL_PASSWORD)
    const inbox = await admin.get('/api/admin/contact-requests').expect(200)
    expect(inbox.body.requests).toEqual([expect.objectContaining({
      id: created.body.id, kind: 'feedback', name: '访客', contact: '', status: 'new',
    })])

    const updated = await admin.patch(`/api/admin/contact-requests/${created.body.id}`)
      .send({ status: 'resolved' }).expect(200)
    expect(updated.body.request.status).toBe('resolved')
    const auditLog = db.prepare("SELECT metadata_json FROM audit_logs WHERE action = 'contact-request.update'").get()
    expect(auditLog.metadata_json).toBe('{"status":"resolved"}')
    expect(auditLog.metadata_json).not.toContain('移动端')

    db.prepare('UPDATE contact_requests SET updated_at = ? WHERE id = ?').run('2020-01-01T00:00:00.000Z', created.body.id)
    const afterRetentionCleanup = await admin.get('/api/admin/contact-requests').expect(200)
    expect(afterRetentionCleanup.body.requests).toEqual([])

    const disposable = await request(app).post('/api/contact-requests').send({
      ...feedback, message: '这是一条用于验证管理员永久删除能力的反馈。',
    }).expect(201)
    await admin.delete(`/api/admin/contact-requests/${disposable.body.id}`).expect(200)
    await admin.delete(`/api/admin/contact-requests/${disposable.body.id}`).expect(404)
  })

  it('limits public contact submissions and rejects cross-origin writes', async () => {
    const payload = {
      kind: 'account', name: '申请者', contact: 'candidate@example.com',
      message: '正在准备 Java 后端面试，希望保存批注和复习计划。', consent: true, website: '',
    }
    await request(app).post('/api/contact-requests').set('Origin', 'https://evil.example').send(payload).expect(403)
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app).post('/api/contact-requests').send({ ...payload, message: `${payload.message}${attempt}` }).expect(201)
    }
    await request(app).post('/api/contact-requests').send(payload).expect(429)
  })

  it('serves all 762 active questions while preserving the stable non-Java ids', async () => {
    const health = await request(app).get('/api/health').expect(200)
    expect(health.body).toMatchObject({ storage: 'sqlite', banks: 14, questions: 762 })
    const catalog = await request(app).get('/api/catalog').set('Accept-Encoding', 'gzip').expect(200)
    expect(health.headers['cache-control']).toBe('no-store')
    expect(catalog.headers['cache-control']).toBe('public, max-age=0, s-maxage=300, stale-while-revalidate=86400')
    expect(catalog.headers.etag).toMatch(/^W\/["].+[\"]$/)
    expect(catalog.headers['content-encoding']).toBe('gzip')
    expect(catalog.headers.vary).toContain('Accept-Encoding')
    expect(catalog.body.banks).toHaveLength(14)
    expect(catalog.body.banks.map((bank) => bank.id)).toEqual([
      'interview', 'javascript', 'git-engineering', 'vue-core', 'react-core',
      'frontend-engineering', 'backend-fullstack', 'database-cache', 'network-deployment',
      'frontend-ai-interviews', 'java-foundations', 'java-backend-interviews', 'java-ai-applications',
      '360-ai-frontend',
    ])
    const questions = catalog.body.sections.flatMap((section) => section.questions)
    expect(questions).toHaveLength(762)
    expect(questions[0].id).toBe('q-1')
    expect(questions.some((question) => question.id === 'q-1')).toBe(true)
    expect(questions.some((question) => question.id === 'js-q-100')).toBe(true)
    expect(questions.every((question) => !Object.hasOwn(question, 'plainText'))).toBe(true)
    expect(questions.find((question) => question.library === 'vue-core').id)
      .toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    await request(app).get('/api/me/state').expect(401)
    await request(app).put('/api/me/state').send(emptyState()).expect(401)
    await request(app).post('/api/me/import-local')
      .send({ state: emptyState(), contentHash: '0'.repeat(64) }).expect(401)
    await request(app).post('/api/banks').send({}).expect(401)
  })

  it('serves cacheable catalog indexes and bank payloads with stable ETags', async () => {
    const landing = await request(app).get('/api/landing').expect(200)
    expect(landing.headers['cache-control']).toBe('public, max-age=0, s-maxage=300, stale-while-revalidate=86400')
    expect(landing.body).toMatchObject({
      version: 1,
      summary: { banks: 14, questions: 762 },
      tracks: [
        { id: 'frontend', bankCount: 5, questionCount: 300 },
        { id: 'java', bankCount: 4, questionCount: 179 },
        { id: 'ai', bankCount: 3, questionCount: 147 },
      ],
    })
    expect(landing.body.featuredQuestions).toHaveLength(3)
    expect(landing.body.featuredQuestions.map((question) => question.id)).toEqual([
      'q-1',
      '521d047b-e5d6-59b9-907a-cd7ad0de657a',
      '72d8195b-5fad-5cfc-8370-85a1379ca106',
    ])
    expect(landing.body.featuredQuestions.find((question) => question.id === '72d8195b-5fad-5cfc-8370-85a1379ca106').sourceTitle)
      .toContain('牛客')
    expect(JSON.stringify(landing.body)).not.toContain('"body"')

    const index = await request(app).get('/api/catalog/index').expect(200)
    expect(index.headers['cache-control']).toBe('public, max-age=0, s-maxage=300, stale-while-revalidate=86400')
    expect(index.headers.etag).toMatch(/^W\/["].+[\"]$/)
    expect(index.body.version).toBe(1)
    expect(index.body.banks).toHaveLength(14)
    expect(index.body.banks.reduce((total, bank) => total + bank.questionCount, 0)).toBe(762)
    const indexedQuestions = index.body.banks.flatMap((bank) => bank.sections.flatMap((section) => section.questions))
    expect(indexedQuestions).toHaveLength(762)
    expect(indexedQuestions.find((question) => question.id === 'js-q-100')).toMatchObject({ library: 'javascript' })
    expect(JSON.stringify(index.body)).not.toContain('plainText')
    expect(JSON.stringify(index.body)).not.toContain('"body"')

    await request(app).get('/api/catalog/index')
      .set('If-None-Match', index.headers.etag)
      .expect(304)

    const javascript = await request(app).get('/api/catalog/banks/javascript').expect(200)
    expect(javascript.headers['cache-control']).toBe(index.headers['cache-control'])
    expect(javascript.body).toMatchObject({ version: 1, bank: { id: 'javascript' } })
    const questions = javascript.body.sections.flatMap((section) => section.questions)
    expect(questions).toHaveLength(index.body.banks.find((bank) => bank.id === 'javascript').questionCount)
    expect(questions.every((question) => typeof question.body === 'string')).toBe(true)
    expect(questions.every((question) => !Object.hasOwn(question, 'plainText'))).toBe(true)

    await request(app).get('/api/catalog/banks/javascript')
      .set('If-None-Match', javascript.headers.etag)
      .expect(304)
    await request(app).get('/api/catalog/banks/not-a-bank').expect(404)
  }, 20_000)

  it('requires a password change and enforces admin, editor and learner permissions', async () => {
    const admin = request.agent(app)
    await admin.post('/api/auth/login').send({ username: 'admin', password: INITIAL_PASSWORD }).expect(200)
    await admin.get('/api/users').expect(428)
    await admin.get('/api/catalog/index').expect(200)
    await admin.get('/api/catalog/banks/javascript').expect(200)
    await admin.post('/api/auth/change-password')
      .send({ currentPassword: INITIAL_PASSWORD, newPassword: CHANGED_PASSWORD }).expect(200)

    const learnerResult = await admin.post('/api/users').send({
      username: 'learner.one', displayName: '学习者一号', role: 'learner',
    }).expect(201)
    const editorResult = await admin.post('/api/users').send({
      username: 'editor.one', displayName: '编辑一号', role: 'editor',
    }).expect(201)

    const learner = request.agent(app)
    await loginAndChangePassword(learner, 'learner.one', learnerResult.body.temporaryPassword, 'LearnerPassword!456')
    await learner.get('/api/users').expect(403)
    await learner.get('/api/admin/invitations').expect(403)
    await learner.get('/api/backups').expect(403)
    await learner.get('/api/audit').expect(403)
    await learner.get('/api/admin/contact-requests').expect(403)
    await learner.post('/api/banks').send({}).expect(403)

    const editor = request.agent(app)
    await loginAndChangePassword(editor, 'editor.one', editorResult.body.temporaryPassword, 'EditorPassword!456')
    await editor.get('/api/users').expect(403)
    await editor.get('/api/admin/invitations').expect(403)
    await editor.get('/api/backups').expect(403)
    await editor.get('/api/audit').expect(403)
    await editor.get('/api/admin/contact-requests').expect(403)
    await editor.post('/api/banks').send({
      id: 'test-bank', title: '测试题库', shortTitle: '测试', kicker: 'TEST BANK',
      category: '测试', description: '集成测试题库', baseTags: ['Test'], tone: 'green', visibility: 'public',
    }).expect(201)

    await admin.post('/api/banks').send({
      id: 'private-bank', title: '内部题库', shortTitle: '内部', kicker: 'PRIVATE BANK',
      category: '测试', description: '仅编辑人员可见', baseTags: [], tone: 'blue', visibility: 'private',
    }).expect(201)
    const guestCatalog = await request(app).get('/api/catalog').expect(200)
    expect(guestCatalog.body.banks.some((bank) => bank.id === 'private-bank')).toBe(false)
    const guestIndex = await request(app).get('/api/catalog/index').expect(200)
    expect(guestIndex.body.banks.some((bank) => bank.id === 'private-bank')).toBe(false)
    await request(app).get('/api/catalog/banks/private-bank').expect(404)
    const adminCatalog = await admin.get('/api/catalog').expect(200)
    expect(adminCatalog.headers['cache-control']).toBe('private, no-cache')
    expect(adminCatalog.body.banks.some((bank) => bank.id === 'private-bank')).toBe(true)
    const adminIndex = await admin.get('/api/catalog/index').expect(200)
    expect(adminIndex.headers['cache-control']).toBe('private, no-cache')
    expect(adminIndex.headers.vary).toContain('Cookie')
    expect(adminIndex.body.banks.some((bank) => bank.id === 'private-bank')).toBe(true)
    const privateBank = await admin.get('/api/catalog/banks/private-bank').expect(200)
    expect(privateBank.headers['cache-control']).toBe('private, no-cache')
    expect(privateBank.headers.vary).toContain('Cookie')
    expect(privateBank.body.bank.id).toBe('private-bank')
  }, 20_000)

  it('accepts an existing short password and allows upgrading it', async () => {
    const admin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin')
    db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?')
      .run(passwordHash('legacy-test'), admin.id)

    const agent = request.agent(app)
    await agent.post('/api/auth/login').send({ username: 'admin', password: 'legacy-test' }).expect(200)
    await agent.post('/api/auth/change-password')
      .send({ currentPassword: 'legacy-test', newPassword: CHANGED_PASSWORD }).expect(200)
  })

  it('isolates user progress and annotations', async () => {
    const admin = request.agent(app)
    await loginAndChangePassword(admin, 'admin', INITIAL_PASSWORD)
    const first = await admin.post('/api/users').send({ username: 'one', displayName: 'One', role: 'learner' }).expect(201)
    const second = await admin.post('/api/users').send({ username: 'two', displayName: 'Two', role: 'learner' }).expect(201)
    const one = request.agent(app)
    const two = request.agent(app)
    const oneId = await loginAndChangePassword(one, 'one', first.body.temporaryPassword, 'LearnerOnePassword!1')
    const twoId = await loginAndChangePassword(two, 'two', second.body.temporaryPassword, 'LearnerTwoPassword!2')

    const state = emptyState()
    state.progress['q-1'] = { status: 'mastered', favorite: true, note: 'private', readCount: 2, seconds: 60 }
    state.annotations.push({
      id: 'annotation-one', questionId: 'q-1', quote: '私有批注', note: '只属于 one', color: 'yellow',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })
    await one.put('/api/me/state').set('X-Expected-User-Id', oneId).send(state).expect(200)
    const oneState = await one.get('/api/me/state').set('X-Expected-User-Id', oneId).expect(200)
    const twoState = await two.get('/api/me/state').set('X-Expected-User-Id', twoId).expect(200)
    expect(oneState.body.progress['q-1'].note).toBe('private')
    expect(oneState.body.annotations).toHaveLength(1)
    expect(twoState.body.progress).toEqual({})
    expect(twoState.body.annotations).toEqual([])

    const crossAccountState = emptyState()
    crossAccountState.progress['q-1'] = {
      status: 'review', favorite: false, note: 'must-not-write', readCount: 1, seconds: 1,
    }
    const mismatch = { error: '当前登录账号已发生变化，请刷新后重试。', code: 'USER_SESSION_CHANGED' }
    expect((await one.get('/api/me/state').set('X-Expected-User-Id', twoId).expect(409)).body).toEqual(mismatch)
    expect((await one.put('/api/me/state').set('X-Expected-User-Id', twoId)
      .send(crossAccountState).expect(409)).body).toEqual(mismatch)
    await one.get('/api/me/state').expect(409)
    const unchanged = await one.get('/api/me/state').set('X-Expected-User-Id', oneId).expect(200)
    expect(unchanged.body.progress['q-1'].note).toBe('private')
  }, 30_000)

  it('supports question version conflicts, archive and restore', async () => {
    const admin = request.agent(app)
    await loginAndChangePassword(admin, 'admin', INITIAL_PASSWORD)
    await admin.post('/api/banks').send({
      id: 'crud-bank', title: 'CRUD 题库', shortTitle: 'CRUD', kicker: 'CRUD BANK',
      category: '测试', description: 'CRUD 集成测试', baseTags: [], tone: 'blue', visibility: 'public',
    }).expect(201)
    const created = await admin.post('/api/banks/crud-bank/questions').send({
      sectionTitle: '基础', title: '什么是版本冲突？', body: '**短回答：** 使用 version 做乐观锁。',
      tags: ['并发'], difficulty: 'intermediate', sources: [{ title: 'SQLite', url: 'https://sqlite.org/lang_update.html' }],
    }).expect(201)
    await admin.patch(`/api/questions/${created.body.id}`).send({ version: 99, body: 'stale' }).expect(409)
    await admin.patch(`/api/questions/${created.body.id}`).send({ version: 1, body: '**短回答：** 版本正确。' }).expect(200)
    await admin.delete(`/api/questions/${created.body.id}`).expect(200)
    const publicCatalog = await request(app).get('/api/catalog').expect(200)
    expect(publicCatalog.body.sections.flatMap((section) => section.questions).some((item) => item.id === created.body.id)).toBe(false)
    await admin.post(`/api/questions/${created.body.id}/restore`).expect(200)
    const restored = await request(app).get('/api/catalog').expect(200)
    expect(restored.body.sections.flatMap((section) => section.questions).some((item) => item.id === created.body.id)).toBe(true)
  }, 20_000)

  it('merges legacy local state idempotently', async () => {
    const admin = request.agent(app)
    const adminId = await loginAndChangePassword(admin, 'admin', INITIAL_PASSWORD)
    const local = emptyState()
    local.progress['q-1'] = {
      status: 'review', favorite: false, note: '', readCount: 3, seconds: 30,
      lastOpenedAt: '2026-07-17T00:00:00.000Z',
    }
    local.activity['2026-07-17'] = 4
    const contentHash = crypto.createHash('sha256').update(JSON.stringify(local)).digest('hex')
    await admin.post('/api/me/import-local').set('X-Expected-User-Id', 'wrong-user')
      .send({ state: local, contentHash }).expect(409)
    expect(db.prepare('SELECT COUNT(*) AS count FROM import_receipts').get().count).toBe(0)
    const first = await admin.post('/api/me/import-local').set('X-Expected-User-Id', adminId)
      .send({ state: local, contentHash }).expect(200)
    const second = await admin.post('/api/me/import-local').set('X-Expected-User-Id', adminId)
      .send({ state: local, contentHash }).expect(200)
    expect(first.body.repeated).toBe(false)
    expect(second.body.repeated).toBe(true)
    expect(second.body.state.progress['q-1'].readCount).toBe(3)
    expect(second.body.state.activity['2026-07-17']).toBe(4)
  }, 20_000)
})
