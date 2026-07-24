// @vitest-environment node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { DIAGRAM_URL_PATTERN, inspectMarkdownDiagrams } from './diagram-policy.js'
import { build360AiBankMarkdown } from './import-360-ai-bank.js'
import { parseQuestionMarkdown } from './markdown.js'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const source = fs.readFileSync(
  path.join(rootDir, 'docs/source/360-ai-frontend/answers.md'),
  'utf8',
)

const MARKERS = [
  '**短回答：**',
  '**原理：**',
  '**代码 / 场景：**',
  '**递进追问：**',
  '**易错点：**',
  '**参考来源：**',
]

function parseQuestions(markdown) {
  const headings = [...markdown.matchAll(/^## Q(\d+)[：:][^\n]*$/gm)]
  return headings.map((heading, index) => ({
    number: Number(heading[1]),
    body: markdown.slice(
      heading.index,
      headings[index + 1]?.index ?? markdown.length,
    ),
  }))
}

function markerBlock(body, startMarker, endMarker) {
  const start = body.indexOf(startMarker)
  const end = body.indexOf(endMarker, start + startMarker.length)
  expect(start, `${startMarker} 缺失`).toBeGreaterThanOrEqual(0)
  expect(end, `${endMarker} 缺失或顺序错误`).toBeGreaterThan(start)
  return body
    .slice(start + startMarker.length, end)
    .replace(/\r\n/g, '\n')
    .trim()
}

function assertNoOverusedIdenticalBlocks(questions, startMarker, endMarker) {
  const occurrences = new Map()
  for (const question of questions) {
    const block = markerBlock(question.body, startMarker, endMarker)
    const numbers = occurrences.get(block) ?? []
    numbers.push(question.number)
    occurrences.set(block, numbers)
  }

  const overused = [...occurrences.entries()]
    .filter(([, numbers]) => numbers.length > 3)
    .map(([block, numbers]) => ({
      questions: numbers,
      preview: block.replace(/\s+/g, ' ').slice(0, 100),
    }))

  expect(
    overused,
    `${startMarker} 存在被超过 3 题完全复用的模板块：${JSON.stringify(overused)}`,
  ).toEqual([])
}

describe('360 AI frontend bank importer', () => {
  it('deterministically publishes 67 technical questions while retaining stable source numbers', () => {
    const first = build360AiBankMarkdown(source)
    const second = build360AiBankMarkdown(source)
    const questions = parseQuestions(first)
    const topLevelHeadings = first.match(/^# (?!#).+$/gm) ?? []
    const retiredNumbers = new Set([1, 2, 3, 4, 6, 7, 8, 9, 11, 12])

    expect(second).toBe(first)
    expect(questions).toHaveLength(67)
    expect(questions.map(({ number }) => number)).toEqual(
      Array.from({ length: 77 }, (_, index) => index + 1)
        .filter((number) => !retiredNumbers.has(number)),
    )
    expect(topLevelHeadings).toHaveLength(9)
    expect(new Set(topLevelHeadings.slice(1)).size).toBe(8)
    expect(topLevelHeadings).toContain('# RAG 方案选型')
    expect(topLevelHeadings).toContain('# AI 编程工具安全')
  })

  it('keeps the published IDs of Q5, Q10, Q13 and Q77 stable', () => {
    const sections = parseQuestionMarkdown(build360AiBankMarkdown(source), {
      idPrefix: '360-ai-frontend',
      baseTags: [],
      preserveIds: false,
    })
    const questionsByNumber = new Map(
      sections
        .flatMap((section) => section.questions)
        .map((question) => [question.number, question]),
    )

    expect(questionsByNumber.get('5')?.id).toBe('ac6dcacc-415c-5753-823b-b0b595455a19')
    expect(questionsByNumber.get('10')?.id).toBe('dd550277-dd32-58e2-9d7c-616e9872ec88')
    expect(questionsByNumber.get('13')?.id).toBe('7116e811-18ef-502d-8274-162089d41a07')
    expect(questionsByNumber.get('77')?.id).toBe('0414bff8-fe5e-5733-b668-3ba81ce80268')
  })

  it('gives every question all six learning markers and at least two sources', () => {
    const questions = parseQuestions(build360AiBankMarkdown(source))

    for (const question of questions) {
      for (const marker of MARKERS) {
        expect(
          question.body.split(marker).length - 1,
          `Q${question.number} 的 ${marker} 数量不正确`,
        ).toBe(1)
      }

      const sourcesMarker = '**参考来源：**'
      const sources = question.body.slice(
        question.body.indexOf(sourcesMarker) + sourcesMarker.length,
      )
      const sourceUrls = new Set(
        [...sources.matchAll(/\]\((https:\/\/[^)\s]+)\)/g)].map((match) => match[1]),
      )
      expect(
        sourceUrls.size,
        `Q${question.number} 至少需要两个不同的 HTTPS 来源`,
      ).toBeGreaterThanOrEqual(2)
    }
  })

  it('publishes only generic, resolved learning content', () => {
    const markdown = build360AiBankMarkdown(source)
    const questions = parseQuestions(markdown)

    expect(markdown).not.toMatch(/\[(?:请[^\]]*填写[^\]]*|真实|如果真实)[^\]]*\]/)
    expect(markdown).not.toMatch(/我叫[\p{Script=Han}]{2,4}|(?:大学|学院).{0,20}2026\s*届/u)
    expect(markdown).not.toMatch(/ContextForge|广州深圳|只有在真实|校验日期/u)
    expect(markdown).not.toMatch(/自我介绍|为什么选择 360|异地求职|地点与到岗意愿/u)
    expect(questions[0].number).toBe(5)
    expect(questions[0].body).toContain('为什么使用 RAG')
    expect(questions[1].number).toBe(10)
    expect(questions[1].body).toContain('AI 编程工具')

    for (const question of questions) {
      const shortAnswer = markerBlock(question.body, '**短回答：**', '**原理：**')
      expect(
        shortAnswer,
        `Q${question.number} 的短回答不应再嵌套口述 blockquote`,
      ).not.toMatch(/^\s*>/m)
    }
  })

  it('references exactly seven existing diagrams through safe local paths', () => {
    const markdown = build360AiBankMarkdown(source)
    const inspection = inspectMarkdownDiagrams(markdown)
    const uniqueUrls = [...new Set(inspection.diagrams.map(({ url }) => url))]
    const diagramRoot = path.resolve(rootDir, 'public/content/diagrams')

    expect(inspection.errors).toEqual([])
    expect(inspection.diagrams).toHaveLength(7)
    expect(uniqueUrls).toHaveLength(7)

    for (const diagram of inspection.diagrams) {
      expect(DIAGRAM_URL_PATTERN.test(diagram.url)).toBe(true)
      expect(diagram.url).not.toContain('..')
      expect(diagram.alt.trim().length).toBeGreaterThan(8)

      const filename = path.resolve(rootDir, 'public', `.${diagram.url}`)
      expect(
        filename.startsWith(`${diagramRoot}${path.sep}`),
        `${diagram.url} 必须位于 public/content/diagrams 内`,
      ).toBe(true)
      expect(fs.existsSync(filename), `${diagram.url} 不存在`).toBe(true)
    }
  })

  it('does not mass-reuse identical follow-up or pitfall templates', () => {
    const questions = parseQuestions(build360AiBankMarkdown(source))

    assertNoOverusedIdenticalBlocks(
      questions,
      '**递进追问：**',
      '**易错点：**',
    )
    assertNoOverusedIdenticalBlocks(
      questions,
      '**易错点：**',
      '**参考来源：**',
    )
  })
})
