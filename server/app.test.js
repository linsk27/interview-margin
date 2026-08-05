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
      theme: 'light', readingSize: 'comfortable', readingFont: 'serif', pageLayout: 'spread', focusMode: false, notesOpen: true,
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
        bootstrap: { username: 'admin', password: INITIAL_PASSWORD, skipCredentialFile: true },
      },
    })
    app = created.app
    db = created.database.db
  })

  afterEach(() => db.close())

  it('serves all 801 questions while preserving the existing question ids', async () => {
    const health = await request(app).get('/api/health').expect(200)
    expect(health.body).toMatchObject({ storage: 'sqlite', banks: 14, questions: 801 })
    const catalog = await request(app).get('/api/catalog').set('Accept-Encoding', 'gzip').expect(200)
    expect(health.headers['cache-control']).toBe('no-store')
    expect(catalog.headers['cache-control']).toBe('no-store')
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
    expect(questions).toHaveLength(801)
    expect(questions[0].id).toBe('q-1')
    expect(questions.some((question) => question.id === 'q-1')).toBe(true)
    expect(questions.some((question) => question.id === 'js-q-100')).toBe(true)
    expect(questions.find((question) => question.library === 'vue-core').id)
      .toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    await request(app).get('/api/me/state').expect(401)
    await request(app).put('/api/me/state').send(emptyState()).expect(401)
    await request(app).post('/api/me/import-local')
      .send({ state: emptyState(), contentHash: '0'.repeat(64) }).expect(401)
    await request(app).post('/api/banks').send({}).expect(401)
  })

  it('requires a password change and enforces admin, editor and learner permissions', async () => {
    const admin = request.agent(app)
    await admin.post('/api/auth/login').send({ username: 'admin', password: INITIAL_PASSWORD }).expect(200)
    await admin.get('/api/users').expect(428)
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
    await learner.post('/api/banks').send({}).expect(403)

    const editor = request.agent(app)
    await loginAndChangePassword(editor, 'editor.one', editorResult.body.temporaryPassword, 'EditorPassword!456')
    await editor.get('/api/users').expect(403)
    await editor.get('/api/admin/invitations').expect(403)
    await editor.get('/api/backups').expect(403)
    await editor.get('/api/audit').expect(403)
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
    const adminCatalog = await admin.get('/api/catalog').expect(200)
    expect(adminCatalog.body.banks.some((bank) => bank.id === 'private-bank')).toBe(true)
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
