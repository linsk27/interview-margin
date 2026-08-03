// @vitest-environment node

import crypto from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDatabase } from './database.js'
import { denseProseBlocks } from './content/readability.js'

const COMMUNITY_BANK_COUNTS = {
  'frontend-ai-interviews': 40,
  'java-backend-interviews': 48,
  'java-ai-applications': 40,
}

const COMMUNITY_BANK_IDS = Object.keys(COMMUNITY_BANK_COUNTS)
const NON_TECHNICAL_TITLE = /(?:自我介绍|职业规划|为什么选择(?:我们|公司|岗位)|期望薪资|有什么要问|反问|能否实习|是否接受加班|手里.*offer)/i

function normalizedTitle(value) {
  return value
    .replace(/^Q\d+(?:\.\d+)*[：:]?\s*/i, '')
    .replace(/[\s？?，,、：:；;（）()《》“”]/g, '')
    .toLowerCase()
}

describe('question catalog seed quality', () => {
  let db
  beforeEach(() => { db = createDatabase({ filename: ':memory:', bootstrap: false }).db })
  afterEach(() => db.close())

  it('contains thirteen banks and 701 unique questions', () => {
    expect(db.prepare('SELECT COUNT(*) count FROM question_banks').get().count).toBe(13)
    expect(db.prepare('SELECT COUNT(*) count FROM questions').get().count).toBe(701)
    expect(db.prepare('SELECT COUNT(DISTINCT id) count FROM questions').get().count).toBe(701)
    expect(db.prepare("SELECT COUNT(*) count FROM questions WHERE id IN ('q-1','js-q-100')").get().count).toBe(2)
    const ids = db.prepare(`
      SELECT id FROM questions
      WHERE bank_id NOT IN (${COMMUNITY_BANK_IDS.map(() => '?').join(',')})
      ORDER BY id
    `).all(...COMMUNITY_BANK_IDS).map((row) => row.id).join(' ')
    expect(crypto.createHash('sha256').update(ids).digest('hex'))
      .toBe('555e19677287bdd087c9f8a4deaba27d4dd2a65a3f88c79c28e64d3c089f02ed')
    expect(db.prepare("SELECT COUNT(*) count FROM questions WHERE body_md LIKE '%/content/diagrams/%'").get().count)
      .toBeGreaterThanOrEqual(24)
  })

  it('keeps every community interview bank technical, substantial and independently sourced', () => {
    for (const [bankId, expectedCount] of Object.entries(COMMUNITY_BANK_COUNTS)) {
      const questions = db.prepare(
        'SELECT * FROM questions WHERE bank_id = ? AND archived_at IS NULL ORDER BY sort_order',
      ).all(bankId)
      expect(questions, bankId).toHaveLength(expectedCount)
      for (const question of questions) {
        expect(question.title).not.toMatch(NON_TECHNICAL_TITLE)
        expect(question.body_md).toContain('**短回答：**')
        expect(question.body_md).toContain('**原理：**')
        expect(question.body_md).toContain('**代码 / 场景：**')
        expect(question.body_md).toContain('**递进追问：**')
        expect(question.body_md).toContain('**易错点：**')
        expect(question.body_md).toContain('**参考来源：**')
        expect(question.body_md.length).toBeGreaterThanOrEqual(780)
        expect(question.read_minutes).toBeGreaterThanOrEqual(2)

        const kinds = db.prepare(
          'SELECT DISTINCT source_kind FROM source_refs WHERE question_id = ?',
        ).all(question.id).map((source) => source.source_kind)
        expect(kinds, `${bankId}: ${question.title}`).toContain('community-interview')
        expect(kinds, `${bankId}: ${question.title}`).toContain('official')
      }
    }

    const titles = db.prepare('SELECT id, title FROM questions WHERE archived_at IS NULL').all()
    const seen = new Map()
    const duplicates = []
    for (const question of titles) {
      const key = normalizedTitle(question.title)
      if (seen.has(key)) duplicates.push([seen.get(key), question.id, question.title])
      else seen.set(key, question.id)
    }
    expect(duplicates).toEqual([])
  })

  it('gives every added question complete interview sections and official sources', () => {
    const generated = db.prepare(
      `SELECT * FROM questions WHERE bank_id NOT IN (
        'interview','javascript','360-ai-frontend',
        'frontend-ai-interviews','java-backend-interviews','java-ai-applications'
      )`,
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
    expect(questions).toHaveLength(72)
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

  it('keeps every public question free of wall-of-text prose blocks', () => {
    const questions = db.prepare('SELECT id, body_md FROM questions WHERE archived_at IS NULL').all()
    const dense = questions.flatMap((question) => denseProseBlocks(question.body_md)
      .map((paragraph) => ({ id: question.id, length: paragraph.length })))
    expect(dense).toEqual([])
  })
})
