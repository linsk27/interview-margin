// @vitest-environment node

import crypto from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDatabase } from './database.js'
import { COMMUNITY_INTERVIEW_BANKS } from './content/community-banks/index.js'
import { denseProseBlocks } from './content/readability.js'

const COMMUNITY_BANK_COUNTS = {
  'frontend-ai-interviews': 40,
  'java-foundations': 50,
  'java-backend-interviews': 48,
  'java-ai-applications': 30,
}

const COMMUNITY_BANK_IDS = Object.keys(COMMUNITY_BANK_COUNTS)
const JAVA_CURATED_GUIDE_BANK_IDS = new Set(['java-foundations', 'java-backend-interviews', 'java-ai-applications'])
const INTERVIEW_SOURCE_BANK_IDS = new Set(['frontend-ai-interviews', 'java-backend-interviews', 'java-ai-applications'])
const NON_TECHNICAL_TITLE = /(?:自我介绍|职业规划|为什么选择(?:我们|公司|岗位)|期望薪资|有什么要问|反问|能否实习|是否接受加班|手里.*offer)/i
const COLD_JAVA_MAIN_TITLE = /(?:NMT|pmap|Shenandoah|ZGC.*(?:染色|指针)|JIT.*阈值|32\s*位寻址|超大文件分发|冷缓存发布|Nacos.*心跳细节)/i
const DIRECT_QUESTION_TITLE = /(?:什么|哪些|怎样|怎么|为什么|如何|区别|关系|作用|是否|应该|能保证|经历)/

function stableUuid(value) {
  const bytes = Buffer.from(crypto.createHash('sha256').update(value).digest().subarray(0, 16))
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

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

  it('contains fourteen banks and 741 unique active questions', () => {
    expect(db.prepare('SELECT COUNT(*) count FROM question_banks').get().count).toBe(14)
    expect(db.prepare('SELECT COUNT(*) count FROM questions WHERE archived_at IS NULL').get().count).toBe(741)
    expect(db.prepare('SELECT COUNT(DISTINCT id) count FROM questions').get().count).toBe(741)
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

  it('locks the Java foundation v2 identity map and its teaching diagrams', () => {
    const questions = db.prepare(`
      SELECT id, display_number, title, body_md
      FROM questions WHERE bank_id='java-foundations' ORDER BY sort_order
    `).all()
    expect(questions).toHaveLength(50)
    const identityMap = questions
      .map((question) => [question.id, question.display_number, question.title].join('|'))
      .join('\n')
    expect(crypto.createHash('sha256').update(identityMap).digest('hex'))
      .toBe('b7f4862e5b7a6038645fc977272658795644b4a01deb54e48e6846f325c94613')

    const diagrams = questions.flatMap((question) => (
      question.body_md.match(/\/content\/diagrams\/[a-z0-9-]+\/[a-z0-9-]+\.svg/g) ?? []
    ))
    expect(diagrams).toEqual([
      '/content/diagrams/java-foundations/object-contract-v1.svg',
      '/content/diagrams/java-foundations/hashmap-put-resize-v2.svg',
      '/content/diagrams/java-foundations/thread-coordination-v1.svg',
      '/content/diagrams/java-backend/thread-pool-admission-v1.svg',
      '/content/diagrams/java-foundations/jvm-memory-v1.svg',
    ])
  })

  it('uses fresh v2 ids for every rebuilt Java question', () => {
    const banks = [
      ['java-foundations', 'java-foundations-v2', 50, 'java-foundations', 100],
      ['java-backend-interviews', 'java-backend-v2', 48, 'java-backend-interviews', 48],
      ['java-ai-applications', 'java-ai-applications-v2', 30, 'java-ai-applications', 40],
    ]

    for (const [bankId, v2Prefix, count, oldPrefix, oldCount] of banks) {
      const actual = db.prepare(`
        SELECT id FROM questions
        WHERE bank_id = ? AND archived_at IS NULL
        ORDER BY sort_order
      `).all(bankId).map((row) => row.id)
      const expected = Array.from({ length: count }, (_, index) => stableUuid(`${v2Prefix}:${index + 1}`))
      const retired = new Set(Array.from(
        { length: oldCount },
        (_, index) => stableUuid(`${oldPrefix}:${index + 1}`),
      ))

      expect(actual, bankId).toEqual(expected)
      expect(actual.filter((id) => retired.has(id)), bankId).toEqual([])
    }
  })

  it('keeps rebuilt Java banks concept-first and free of retired cold topics', () => {
    const questions = db.prepare(`
      SELECT title FROM questions
      WHERE bank_id IN ('java-foundations', 'java-backend-interviews', 'java-ai-applications')
        AND archived_at IS NULL
    `).all()
    const directQuestions = questions.filter((question) => DIRECT_QUESTION_TITLE.test(question.title))

    expect(questions).toHaveLength(128)
    expect(questions.filter((question) => COLD_JAVA_MAIN_TITLE.test(question.title))).toEqual([])
    expect(directQuestions.length / questions.length).toBeGreaterThanOrEqual(0.85)
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
        expect(question.body_md.length).toBeGreaterThanOrEqual(620)
        expect(question.body_md.length).toBeLessThanOrEqual(2_600)
        expect(question.read_minutes).toBeGreaterThanOrEqual(1)

        const kinds = db.prepare(
          'SELECT DISTINCT source_kind FROM source_refs WHERE question_id = ?',
        ).all(question.id).map((source) => source.source_kind)
        expect(kinds, `${bankId}: ${question.title}`).toContain('official')
        if (JAVA_CURATED_GUIDE_BANK_IDS.has(bankId)) {
          expect(kinds, `${bankId}: ${question.title}`).toContain('curated-guide')
        }
        if (INTERVIEW_SOURCE_BANK_IDS.has(bankId)) {
          expect(kinds, `${bankId}: ${question.title}`).toContain('community-interview')
        }
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

  it('keeps generated community Markdown sources identical to their reviewed source objects', () => {
    for (const bank of COMMUNITY_INTERVIEW_BANKS) {
      const expectedQuestions = bank.sections.flatMap((section) => section.questions)
      const actualQuestions = db.prepare(
        'SELECT id, title FROM questions WHERE bank_id = ? AND archived_at IS NULL ORDER BY sort_order',
      ).all(bank.id)
      expect(actualQuestions, bank.id).toHaveLength(expectedQuestions.length)

      expectedQuestions.forEach((expectedQuestion, index) => {
        const expectedTitle = expectedQuestion.title.replace(/`([^`]*)`/g, '$1')
        expect(actualQuestions[index].title).toBe(`Q${index + 1}：${expectedTitle}`)
        const expectedSources = expectedQuestion.sources
          .map((source) => `${source.kind}|${source.url}`)
          .sort()
        const actualSources = db.prepare(
          'SELECT source_kind, url FROM source_refs WHERE question_id = ? ORDER BY source_kind, url',
        ).all(actualQuestions[index].id)
          .map((source) => `${source.source_kind}|${source.url}`)
        expect(actualSources, `${bank.id} Q${index + 1}`).toEqual(expectedSources)
      })
    }
  })

  it('gives every added question complete interview sections and official sources', () => {
    const generated = db.prepare(
      `SELECT * FROM questions WHERE bank_id NOT IN (
        'interview','javascript','360-ai-frontend',
        'frontend-ai-interviews','java-foundations','java-backend-interviews','java-ai-applications'
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
