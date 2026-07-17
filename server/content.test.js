// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDatabase } from './database.js'

describe('question catalog seed quality', () => {
  let db
  beforeEach(() => { db = createDatabase({ filename: ':memory:', bootstrap: false }).db })
  afterEach(() => db.close())

  it('contains exactly nine banks and 501 unique questions', () => {
    expect(db.prepare('SELECT COUNT(*) count FROM question_banks').get().count).toBe(9)
    expect(db.prepare('SELECT COUNT(*) count FROM questions').get().count).toBe(501)
    expect(db.prepare('SELECT COUNT(DISTINCT id) count FROM questions').get().count).toBe(501)
    expect(db.prepare("SELECT COUNT(*) count FROM questions WHERE id IN ('q-1','js-q-100')").get().count).toBe(2)
  })

  it('gives every added question complete interview sections and official sources', () => {
    const generated = db.prepare("SELECT * FROM questions WHERE bank_id NOT IN ('interview','javascript')").all()
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
})
