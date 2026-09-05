// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from './app.js'
import { createInterviewAttempt, getLearningInsights, listInterviewAttempts, mergeInterviewAttempts } from './interview-attempts.js'

const score = {
  score: 78,
  band: '主线完整，有少量遗漏',
  summary: '结论正确，但边界还可以说清楚。',
  dimensions: [{ key: 'correctness', label: '技术正确性', score: 26, maxScore: 30 }],
  corrections: [{ evidence: '更快', correction: '需要说明具体指标和条件。' }],
  strengths: ['先给出结论'],
  gaps: ['缺少边界'],
  nextStep: '补充一个失败场景。',
}

describe('interview attempt history', () => {
  let created
  afterEach(() => created?.database.db.close())

  it('stores private score snapshots and deduplicates client merges', () => {
    created = createApp({
      serveStatic: false,
      secureCookies: false,
      databaseOptions: {
        filename: ':memory:', usePrecompiledSeed: true,
        bootstrap: { username: 'history-admin', password: 'HistoryPassword!123', skipCredentialFile: true },
      },
    })
    const db = created.database.db
    const userId = db.prepare('SELECT id FROM users LIMIT 1').get()?.id
    const questionId = db.prepare('SELECT id FROM questions WHERE archived_at IS NULL LIMIT 1').get().id
    const first = createInterviewAttempt(db, { userId, questionId, answer: '我的回答', result: score, clientId: 'local-1' })
    expect(first).toMatchObject({ questionId, score: 78, clientId: 'local-1' })
    const merged = mergeInterviewAttempts(db, userId, [{
      clientId: 'local-1', questionId, answer: '我的回答', score: 78,
      dimensions: score.dimensions, corrections: score.corrections,
      strengths: score.strengths, gaps: score.gaps, nextStep: score.nextStep,
      band: score.band, summary: score.summary,
    }])
    expect(merged.repeated).toBe(1)
    expect(listInterviewAttempts(db, userId, { questionId })).toHaveLength(1)
    expect(getLearningInsights(db, userId)).toMatchObject({ totalAttempts: 1, averageScore: 78, latestScore: 78 })
  })

  it('records an authenticated score without changing the score JSON contract', async () => {
    const password = 'HistoryPassword!123'
    created = createApp({
      serveStatic: false,
      secureCookies: false,
      aiChatHandler: (_req, res) => res.json({
        version: 1, score: 82, band: '主线完整', summary: '回答清楚。', dimensions: [],
        strengths: [], gaps: [], corrections: [], nextStep: '补充边界。', criticalIssues: [],
        confidence: 'high', disclaimer: 'AI 模拟评分。',
      }),
      databaseOptions: {
        filename: ':memory:', usePrecompiledSeed: true,
        bootstrap: { username: 'history-admin', password, skipCredentialFile: true },
      },
    })
    const db = created.database.db
    const questionId = db.prepare('SELECT id FROM questions WHERE archived_at IS NULL LIMIT 1').get().id
    const agent = request.agent(created.app)
    await agent.post('/api/auth/login').send({ username: 'history-admin', password }).expect(200)
    await agent.post('/api/auth/change-password').send({ currentPassword: password, newPassword: 'ChangedPassword!456' }).expect(200)
    const response = await agent.post('/api/ai-score')
      .set('X-Interview-Client-Id', 'test-client-1')
      .send({ questionId, answer: '我的回答' }).expect(200)
    expect(response.body.score).toBe(82)
    expect(response.headers['x-interview-attempt-id']).toEqual(expect.any(String))
    expect(db.prepare('SELECT COUNT(*) AS count FROM interview_attempts').get().count).toBe(1)
    await agent.get(`/api/me/interview-attempts?questionId=${questionId}`).expect(200)
  })
})
