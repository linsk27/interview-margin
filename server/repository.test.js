// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createDatabase } from './database.js'
import { getStudyState, saveStudyState } from './repository.js'

describe('study state and archived questions', () => {
  let db
  let userId

  beforeEach(() => {
    const database = createDatabase({
      filename: ':memory:',
      usePrecompiledSeed: true,
      bootstrap: {
        username: 'admin',
        password: 'ContentCheckPassword!1',
        skipCredentialFile: true,
      },
    })
    db = database.db
    userId = db.prepare("SELECT id FROM users WHERE username = 'admin'").get().id
  })

  afterEach(() => db.close())

  it('hides archived Java state without deleting its history on the next save', () => {
    const [archivedQuestion, activeQuestion] = db.prepare(`
      SELECT id FROM questions
      WHERE bank_id = 'java-foundations' AND archived_at IS NULL
      ORDER BY sort_order LIMIT 2
    `).all()
    const now = new Date().toISOString()

    db.prepare('UPDATE questions SET archived_at = ? WHERE id = ?').run(now, archivedQuestion.id)
    const insertProgress = db.prepare(`
      INSERT INTO progress(
        user_id, question_id, status, favorite, note, read_count, seconds,
        last_opened_at, due_at, scroll_top, spread_index, updated_at
      ) VALUES(?, ?, 'learning', 1, ?, 1, 30, ?, NULL, 0, 0, ?)
    `)
    insertProgress.run(userId, archivedQuestion.id, '旧 Java 学习记录', now, now)
    insertProgress.run(userId, activeQuestion.id, '当前学习记录', now, now)
    const insertAnnotation = db.prepare(`
      INSERT INTO annotations(
        id, user_id, question_id, quote, note, color, created_at, updated_at, deleted_at
      ) VALUES(?, ?, ?, ?, ?, 'yellow', ?, ?, NULL)
    `)
    insertAnnotation.run('archived-note', userId, archivedQuestion.id, '旧题摘录', '保留', now, now)
    insertAnnotation.run('active-note', userId, activeQuestion.id, '当前摘录', '可见', now, now)

    const visible = getStudyState(db, userId)
    expect(Object.keys(visible.progress)).toEqual([activeQuestion.id])
    expect(visible.annotations.map((item) => item.id)).toEqual(['active-note'])

    saveStudyState(db, userId, {
      ...visible,
      progress: {
        [activeQuestion.id]: {
          ...visible.progress[activeQuestion.id],
          status: 'mastered',
        },
      },
    })

    expect(db.prepare(`
      SELECT note FROM progress WHERE user_id = ? AND question_id = ?
    `).get(userId, archivedQuestion.id).note).toBe('旧 Java 学习记录')
    expect(db.prepare(`
      SELECT deleted_at FROM annotations WHERE user_id = ? AND id = 'archived-note'
    `).get(userId).deleted_at).toBeNull()
    expect(db.prepare(`
      SELECT status FROM progress WHERE user_id = ? AND question_id = ?
    `).get(userId, activeQuestion.id).status).toBe('mastered')
  })
})
