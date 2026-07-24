// @vitest-environment node

import crypto from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDatabase } from './database.js'

describe('question catalog seed quality', () => {
  let db
  beforeEach(() => { db = createDatabase({ filename: ':memory:', bootstrap: false }).db })
  afterEach(() => db.close())

  it('contains exactly ten banks and 578 unique questions', () => {
    expect(db.prepare('SELECT COUNT(*) count FROM question_banks').get().count).toBe(10)
    expect(db.prepare('SELECT COUNT(*) count FROM questions').get().count).toBe(578)
    expect(db.prepare('SELECT COUNT(DISTINCT id) count FROM questions').get().count).toBe(578)
    expect(db.prepare("SELECT COUNT(*) count FROM questions WHERE id IN ('q-1','js-q-100')").get().count).toBe(2)
    const ids = db.prepare('SELECT id FROM questions ORDER BY id').all().map((row) => row.id).join(' ')
    expect(crypto.createHash('sha256').update(ids).digest('hex'))
      .toBe('2e84868f7477b661cec3e07380dd97fc3fb584965ac57a0c3a989949b4918182')
    expect(db.prepare("SELECT COUNT(*) count FROM questions WHERE body_md LIKE '%/content/diagrams/%'").get().count)
      .toBe(19)
  })

  it('gives every added question complete interview sections and official sources', () => {
    const generated = db.prepare(
      "SELECT * FROM questions WHERE bank_id NOT IN ('interview','javascript','360-ai-frontend')",
    ).all()
    expect(generated).toHaveLength(320)
    for (const question of generated) {
      expect(question.body_md).toContain('**短回答：**')
      expect(question.body_md).toContain('**原理：**')
      expect(question.body_md).toContain('**代码 / 场景：**')
      expect(question.body_md).toContain('**递进追问：**')
      expect(question.body_md).toContain('**易错点：**')
      expect(db.prepare('SELECT COUNT(*) count FROM source_refs WHERE question_id=?').get(question.id).count).toBeGreaterThanOrEqual(2)
    }
  })

  it('keeps the 360 AI frontend bank complete, substantial and independently sourced', () => {
    const questions = db.prepare(
      "SELECT * FROM questions WHERE bank_id = '360-ai-frontend' ORDER BY sort_order",
    ).all()
    expect(questions).toHaveLength(77)
    for (const question of questions) {
      expect(question.body_md).toContain('**短回答：**')
      expect(question.body_md).toContain('**原理：**')
      expect(question.body_md).toContain('**代码 / 场景：**')
      expect(question.body_md).toContain('**递进追问：**')
      expect(question.body_md).toContain('**易错点：**')
      expect(question.body_md).toContain('**参考来源：**')
      expect(question.body_md.length).toBeGreaterThanOrEqual(800)
      expect(question.read_minutes).toBeGreaterThanOrEqual(2)
      expect(db.prepare('SELECT COUNT(*) count FROM source_refs WHERE question_id=?').get(question.id).count)
        .toBeGreaterThanOrEqual(2)
    }
  })
})
