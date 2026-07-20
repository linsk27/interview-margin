// @vitest-environment node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  enrichJavascriptMarkdown,
  parseJavascriptQuestionInventory,
} from './enrich-javascript-bank.js'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const source = fs.readFileSync(path.join(rootDir, 'public/javascript-100.md'), 'utf8')

describe('JavaScript 100 enriched source', () => {
  it('keeps all question numbers and generates idempotently', () => {
    const inventory = parseJavascriptQuestionInventory(source)
    expect(inventory).toHaveLength(100)
    expect(inventory.map((question) => question.number)).toEqual(
      Array.from({ length: 100 }, (_, index) => index + 1),
    )
    expect(enrichJavascriptMarkdown(source)).toBe(source)
  })

  it('gives every question complete, substantial learning sections and sources', () => {
    const inventory = parseJavascriptQuestionInventory(source)
    for (const question of inventory) {
      const next = inventory[question.number]
      const start = source.indexOf(question.heading)
      const end = next ? source.indexOf(next.heading, start + question.heading.length) : source.length
      const body = source.slice(start, end)
      expect(body).toContain('**短回答：**')
      expect(body).toContain('**原理：**')
      expect(body).toContain('**代码 / 场景：**')
      expect(body).toContain('**递进追问：**')
      expect(body).toContain('**易错点：**')
      expect(body).toContain('**参考来源：**')
      expect(body.length).toBeGreaterThan(1_000)
      expect((body.match(/https:\/\//g) ?? []).length).toBeGreaterThanOrEqual(2)
    }
  })

  it('embeds the three JavaScript diagrams in their matching cornerstone questions', () => {
    expect(source).toContain('/content/diagrams/javascript/type-coercion-v1.svg')
    expect(source).toContain('/content/diagrams/javascript/prototype-chain-v1.svg')
    expect(source).toContain('/content/diagrams/javascript/event-loop-v1.svg')
  })
})
