// @vitest-environment node

import crypto from 'node:crypto'

import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createApp } from './app.js'

const INITIAL_PASSWORD = 'TestPassword!123'
const CHANGED_PASSWORD = 'ChangedPassword!456'

function emptyState() {
  return {
    version: 1,
    progress: {},
    annotations: [],
    activity: {},
    settings: {
      theme: 'light', readingSize: 'comfortable', pageLayout: 'spread', focusMode: false, notesOpen: true,
    },
  }
}

async function loginAndChangePassword(agent, username, currentPassword, newPassword = CHANGED_PASSWORD) {
  await agent.post('/api/auth/login').send({ username, password: currentPassword }).expect(200)
  await agent.post('/api/auth/change-password').send({ currentPassword, newPassword }).expect(200)
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

  it('serves all 501 questions while preserving the existing question ids', async () => {
    const health = await request(app).get('/api/health').expect(200)
    expect(health.body).toMatchObject({ storage: 'sqlite', banks: 9, questions: 501 })
    const catalog = await request(app).get('/api/catalog').expect(200)
    expect(catalog.body.banks).toHaveLength(9)
    expect(catalog.body.banks.map((bank) => bank.id)).toEqual([
      'interview', 'javascript', 'git-engineering', 'vue-core', 'react-core',
      'frontend-engineering', 'backend-fullstack', 'database-cache', 'network-deployment',
    ])
    const questions = catalog.body.sections.flatMap((section) => section.questions)
    expect(questions).toHaveLength(501)
    expect(questions[0].id).toBe('q-1')
    expect(questions.some((question) => question.id === 'q-1')).toBe(true)
    expect(questions.some((question) => question.id === 'js-q-100')).toBe(true)
    expect(questions.find((question) => question.library === 'vue-core').id)
      .toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    await request(app).get('/api/me/state').expect(401)
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
    await learner.post('/api/banks').send({}).expect(403)

    const editor = request.agent(app)
    await loginAndChangePassword(editor, 'editor.one', editorResult.body.temporaryPassword, 'EditorPassword!456')
    await editor.get('/api/users').expect(403)
    await editor.post('/api/banks').send({
      id: 'test-bank', title: '测试题库', shortTitle: '测试', kicker: 'TEST BANK',
      category: '测试', description: '集成测试题库', baseTags: ['Test'], tone: 'green', visibility: 'public',
    }).expect(201)
  }, 20_000)

  it('isolates user progress and annotations', async () => {
    const admin = request.agent(app)
    await loginAndChangePassword(admin, 'admin', INITIAL_PASSWORD)
    const first = await admin.post('/api/users').send({ username: 'one', displayName: 'One', role: 'learner' }).expect(201)
    const second = await admin.post('/api/users').send({ username: 'two', displayName: 'Two', role: 'learner' }).expect(201)
    const one = request.agent(app)
    const two = request.agent(app)
    await loginAndChangePassword(one, 'one', first.body.temporaryPassword, 'LearnerOnePassword!1')
    await loginAndChangePassword(two, 'two', second.body.temporaryPassword, 'LearnerTwoPassword!2')

    const state = emptyState()
    state.progress['q-1'] = { status: 'mastered', favorite: true, note: 'private', readCount: 2, seconds: 60 }
    state.annotations.push({
      id: 'annotation-one', questionId: 'q-1', quote: '私有批注', note: '只属于 one', color: 'yellow',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })
    await one.put('/api/me/state').send(state).expect(200)
    const oneState = await one.get('/api/me/state').expect(200)
    const twoState = await two.get('/api/me/state').expect(200)
    expect(oneState.body.progress['q-1'].note).toBe('private')
    expect(oneState.body.annotations).toHaveLength(1)
    expect(twoState.body.progress).toEqual({})
    expect(twoState.body.annotations).toEqual([])
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
    await loginAndChangePassword(admin, 'admin', INITIAL_PASSWORD)
    const local = emptyState()
    local.progress['q-1'] = {
      status: 'review', favorite: false, note: '', readCount: 3, seconds: 30,
      lastOpenedAt: '2026-07-17T00:00:00.000Z',
    }
    local.activity['2026-07-17'] = 4
    const contentHash = crypto.createHash('sha256').update(JSON.stringify(local)).digest('hex')
    const first = await admin.post('/api/me/import-local').send({ state: local, contentHash }).expect(200)
    const second = await admin.post('/api/me/import-local').send({ state: local, contentHash }).expect(200)
    expect(first.body.repeated).toBe(false)
    expect(second.body.repeated).toBe(true)
    expect(second.body.state.progress['q-1'].readCount).toBe(3)
    expect(second.body.state.activity['2026-07-17']).toBe(4)
  }, 20_000)
})
