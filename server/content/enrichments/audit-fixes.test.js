// @vitest-environment node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { parseJavascriptQuestionInventory } from '../enrich-javascript-bank.js'
import { GENERATED_BANKS } from '../question-data.js'
import gitEngineering from './git-engineering.js'
import javascriptFirstHalf from './javascript-01-50.js'
import javascriptSecondHalf from './javascript-51-100.js'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const javascriptMarkdown = fs.readFileSync(path.join(rootDir, 'public/javascript-100.md'), 'utf8')

const javascriptEntry = (number) => (
  [...javascriptFirstHalf, ...javascriptSecondHalf].find((entry) => entry.number === number)
)

describe('reviewed JavaScript and Git audit fixes', () => {
  it('renders typeof results as string literals and keeps feature detection valid', () => {
    const q1 = javascriptEntry(1)
    const q4 = javascriptEntry(4)
    const inventory = parseJavascriptQuestionInventory(javascriptMarkdown)

    expect(q1.mechanism).toContain("typeof value === 'object'")
    expect(q1.mechanism).not.toContain('typeof value === object')
    expect(q4.mechanism).toContain("'undefined'")
    expect(q4.followUps[1].answer).toContain("typeof globalThis.SomeAPI === 'function'")
    expect(inventory[0].summary).toContain("'object'")
    expect(inventory[3].summary).toContain("'undefined'")
  })

  it('keeps Q43 focused and gives Q49 a distinct own-key API comparison', () => {
    const q43 = javascriptEntry(43)
    const q49 = javascriptEntry(49)

    expect(q43.title).toBe('Object.keys(obj) 会返回哪些键？')
    expect(q49.title).toContain('Object.getOwnPropertyNames')
    expect(q49.title).toContain('Reflect.ownKeys')
    expect(q49.mechanism).toContain('自有、可枚举的字符串键')
    expect(q49.mechanism).toContain('全部自有字符串键和 Symbol 键')
  })

  it('keeps Promise timing and finally pass-through conditions internally consistent', () => {
    const q67 = javascriptEntry(67)
    const q70 = parseJavascriptQuestionInventory(javascriptMarkdown)[69]

    expect(q67.example).toContain("setTimeout(() => reject(new Error('fail')), 10)")
    expect(q67.example).toContain('10 毫秒后拒绝')
    expect(q70.summary).toContain('既不抛错，也不返回最终会拒绝的 Promise')
    expect(q70.summary).not.toContain('不抛错或返回拒绝 Promise')
  })

  it('answers the reviewed low-severity JavaScript and Git prompts directly', () => {
    const inventory = parseJavascriptQuestionInventory(javascriptMarkdown)
    const gitBank = GENERATED_BANKS.find((bank) => bank.id === 'git-engineering')
    const gitFlow = gitBank.sections.flatMap(([, questions]) => questions)[25]

    expect(inventory[54].summary).toContain('返回 `undefined`')
    expect(inventory[84].title).toBe('执行 `class User {}; typeof User` 会得到什么？')
    expect(javascriptEntry(85).title).toBe(inventory[84].title)
    expect(gitFlow.answer).toContain('不是简单按团队规模贴标签')
  })

  it('keeps the two JavaScript diagrams semantically explicit', () => {
    const coercion = fs.readFileSync(
      path.join(rootDir, 'public/content/diagrams/javascript/type-coercion-v1.svg'),
      'utf8',
    )
    const eventLoop = fs.readFileSync(
      path.join(rootDir, 'public/content/diagrams/javascript/event-loop-v1.svg'),
      'utf8',
    )

    expect(coercion).toContain('[]  →  \'\'')
    expect(coercion).toContain('if ([])  →  true')
    expect(coercion).toContain('0n')
    expect(eventLoop).toContain('① 取出一个 task 进入调用栈')
    expect(eventLoop).toContain('② 栈空')
    expect(eventLoop).toContain('③ 排空')
    expect(eventLoop).toContain('④ 下一轮')
  })

  it('defines Git conflicts as unmergeable changes rather than only same-line edits', () => {
    const gitBank = GENERATED_BANKS.find((bank) => bank.id === 'git-engineering')
    const sourceQuestion = gitBank.sections.flatMap(([, questions]) => questions)[12]
    const enrichment = gitEngineering.find((entry) => entry.number === 13)

    expect(sourceQuestion.answer).toContain('修改/删除')
    expect(sourceQuestion.answer).toContain('目录/文件冲突')
    expect(enrichment.mechanism).toContain('重命名到两个不同目标')
    expect(enrichment.mechanism).toContain('语义冲突')
    expect(enrichment.mechanism).not.toContain('双方对同一区域作不兼容修改，才留下冲突')
  })
})
