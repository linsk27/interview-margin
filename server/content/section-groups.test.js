// @vitest-environment node

import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { BUILTIN_BANKS } from './banks.js'
import { parseQuestionMarkdown } from './markdown.js'
import { groupBuiltinSections } from './section-groups.js'

const EXPECTED_GROUP_COUNTS = {
  interview: [22, 34, 17, 8],
  javascript: [20, 30, 20, 30],
  'git-engineering': [20, 10, 10],
  'vue-core': [20, 10, 20],
  'react-core': [20, 20, 10],
  'frontend-engineering': [20, 20, 20],
  'backend-fullstack': [30, 10, 10, 5],
  'database-cache': [20, 10, 10],
  'network-deployment': [13, 5, 7],
  'frontend-ai-interviews': [10, 10, 10, 10],
  'java-foundations': [14, 11, 14, 21],
  'java-backend-interviews': [10, 21, 12, 11],
  'java-ai-applications': [11, 12, 4, 8],
  '360-ai-frontend': [23, 19, 25, 5],
}

describe('built-in section groups', () => {
  it('coarsens every bank without changing question identity or order', () => {
    for (const bank of BUILTIN_BANKS) {
      const source = fs.readFileSync(path.resolve(bank.source), 'utf8')
      const raw = parseQuestionMarkdown(source, {
        idPrefix: bank.idPrefix,
        baseTags: bank.baseTags,
        preserveIds: bank.preserveIds,
      })
      const grouped = groupBuiltinSections(bank.id, raw)
      const rawQuestions = raw.flatMap((section) => section.questions)
      const groupedQuestions = grouped.flatMap((section) => section.questions)

      expect(grouped.map((section) => section.questions.length), bank.id)
        .toEqual(EXPECTED_GROUP_COUNTS[bank.id])
      expect(grouped.length, bank.id).toBeGreaterThanOrEqual(3)
      expect(grouped.length, bank.id).toBeLessThanOrEqual(4)
      expect(groupedQuestions.map((question) => question.id), bank.id)
        .toEqual(rawQuestions.map((question) => question.id))
      expect(groupedQuestions.map((question) => question.order), bank.id)
        .toEqual(rawQuestions.map((question) => question.order))
    }
  })

  it('places systems, algorithms and Go outside the AI frontend group', () => {
    const bank = BUILTIN_BANKS.find(({ id }) => id === '360-ai-frontend')
    const source = fs.readFileSync(path.resolve(bank.source), 'utf8')
    const grouped = groupBuiltinSections(bank.id, parseQuestionMarkdown(source, {
      idPrefix: bank.idPrefix,
      baseTags: bank.baseTags,
      preserveIds: bank.preserveIds,
    }))
    const aiFrontend = grouped.find(({ title }) => title === 'AI 前端与浏览器')
    const foundations = grouped.find(({ title }) => title === '计算机、算法与全栈基础')
    const foundationNumbers = foundations.questions.map(({ number }) => Number(number))

    expect(foundationNumbers).toEqual(expect.arrayContaining([57, 58, 59, 75]))
    expect(aiFrontend.questions.map(({ number }) => Number(number)))
      .not.toEqual(expect.arrayContaining([57, 58, 59, 75]))
  })
})
