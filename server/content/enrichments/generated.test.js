// @vitest-environment node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { parseQuestionMarkdown } from '../markdown.js'
import { GENERATED_BANKS } from '../question-data.js'
import { GENERATED_ENRICHMENTS } from './index.js'
import { assertEnrichmentEntries } from './format.js'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const oldTemplatePhrases = [
  '这道题的关键是把',
  '先记录可复现输入和关键指标，再做最小实验验证',
  '不要只背术语，也不要把局部优化包装成通用架构',
]

describe('generated bank enrichments', () => {
  it('covers all 320 questions one-to-one with distinct, complete records', () => {
    let total = 0
    for (const bank of GENERATED_BANKS) {
      const questions = bank.sections.flatMap(([, items]) => items)
      const entries = GENERATED_ENRICHMENTS.get(bank.id)
      expect(() => assertEnrichmentEntries(entries, {
        bankId: bank.id,
        expectedQuestions: questions,
      })).not.toThrow()
      expect(new Set(entries.map((entry) => entry.mechanism.trim())).size).toBe(entries.length)
      expect(entries.flatMap((entry) => entry.sources).every((source) => source.url.startsWith('https://'))).toBe(true)
      for (const entry of entries) {
        const joined = `${entry.mechanism}\n${entry.example}\n${entry.followUps.map((item) => item.answer).join('\n')}`
        oldTemplatePhrases.forEach((phrase) => expect(joined).not.toContain(phrase))
      }
      total += entries.length
    }
    expect(total).toBe(320)
  })

  it('keeps generated Markdown in sync with the structured source', () => {
    for (const bank of GENERATED_BANKS) {
      const markdown = fs.readFileSync(path.join(rootDir, bank.source), 'utf8')
      const sections = parseQuestionMarkdown(markdown, {
        idPrefix: bank.id,
        preserveIds: false,
        baseTags: bank.baseTags,
      })
      const questions = sections.flatMap((section) => section.questions)
      expect(questions).toHaveLength(GENERATED_ENRICHMENTS.get(bank.id).length)
      questions.forEach((question) => {
        expect(question.body.length).toBeGreaterThan(1_000)
        expect(question.sources.length).toBeGreaterThanOrEqual(2)
      })
    }
  }, 15_000)

  it('keeps reviewed edge cases and canonical sources fixed', () => {
    const frontend = GENERATED_ENRICHMENTS.get('frontend-engineering')
    const backend = GENERATED_ENRICHMENTS.get('backend-fullstack')
    const network = GENERATED_ENRICHMENTS.get('network-deployment')
    expect(frontend[42].example).toContain(".finally(() =>")
    expect(backend[32].example).toContain('function needsRehash')
    expect(network[12].mechanism).toContain('HTTP/2 extended CONNECT')
    expect(network[12].mechanism).toContain('HTTP/3 extended CONNECT')

    const urls = [...GENERATED_ENRICHMENTS.values()]
      .flatMap((entries) => entries.flatMap((entry) => entry.sources.map((source) => source.url)))
    const retiredUrls = [
      'https://www.w3.org/TR/layout-instability/',
      'https://developer.mozilla.org/en-US/docs/Glossary/Variable_shadowing',
      'https://redis.io/docs/latest/develop/reference/internals/',
      'https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html',
    ]
    retiredUrls.forEach((url) => expect(urls).not.toContain(url))
  })
})
