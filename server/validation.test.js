// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { questionCreateSchema, questionPatchSchema, settingsSchema } from './validation.js'

const question = {
  sectionTitle: '浏览器',
  title: '事件循环是什么？',
  body: '![事件循环](/content/diagrams/javascript/event-loop-v1.svg "任务与微任务")',
  tags: ['JavaScript'],
  difficulty: 'intermediate',
  sources: [],
}

describe('question Markdown validation', () => {
  it('accepts curated same-origin diagrams for create and patch', () => {
    expect(questionCreateSchema.safeParse(question).success).toBe(true)
    expect(questionPatchSchema.safeParse({ version: 1, body: question.body }).success).toBe(true)
  })

  it.each([
    '![远程追踪图](https://example.com/a.svg)',
    '![](/content/diagrams/javascript/event-loop-v1.svg)',
    '<svg onload="alert(1)"></svg>',
  ])('rejects unsafe diagram Markdown', (body) => {
    const result = questionCreateSchema.safeParse({ ...question, body })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.some((issue) => issue.path[0] === 'body')).toBe(true)
    expect(questionPatchSchema.safeParse({ version: 1, body }).success).toBe(false)
  })
})

describe('reader font theme validation', () => {
  const base = {
    theme: 'light',
    readingSize: 'comfortable',
    pageLayout: 'single',
    focusMode: false,
    notesOpen: true,
  }

  it('defaults old settings to the clean theme', () => {
    expect(settingsSchema.parse(base).fontTheme).toBe('clean')
  })

  it('accepts supported themes and rejects unknown ones', () => {
    expect(settingsSchema.safeParse({ ...base, fontTheme: 'flowing' }).success).toBe(true)
    expect(settingsSchema.safeParse({ ...base, fontTheme: 'comic-sans' }).success).toBe(false)
  })
})
