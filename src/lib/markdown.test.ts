import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { flattenQuestions, parseInterviewMarkdown } from './markdown'

const source = readFileSync(resolve(process.cwd(), 'public/interview.md'), 'utf8')
const javascriptSource = readFileSync(resolve(process.cwd(), 'public/javascript-100.md'), 'utf8')

describe('interview markdown parser', () => {
  it('keeps every question from the source document', () => {
    const sections = parseInterviewMarkdown(source)
    const questions = flattenQuestions(sections)

    expect(sections).toHaveLength(5)
    expect(questions).toHaveLength(81)
    expect(questions[0]).toMatchObject({ id: 'q-1', number: '1' })
    expect(questions.at(-1)).toMatchObject({ id: 'q-80', number: '80' })
  })

  it('preserves decimal question numbers and infers useful tags', () => {
    const questions = flattenQuestions(parseInterviewMarkdown(source))
    const nginxQuestion = questions.find((question) => question.id === 'q-71-1')
    const bleQuestion = questions.find((question) => question.id === 'q-72')

    expect(nginxQuestion?.number).toBe('71.1')
    expect(nginxQuestion?.tags).toContain('工程化')
    expect(bleQuestion?.tags).toContain('IoT')
  })

  it('stores question body without swallowing the next heading', () => {
    const questions = flattenQuestions(parseInterviewMarkdown(source))
    const first = questions[0]

    expect(first.body).toContain('Object.defineProperty')
    expect(first.body).not.toContain('Q2：')
    expect(first.plainText.length).toBeGreaterThan(100)
  })

  it('loads 100 JavaScript questions with isolated IDs', () => {
    const questions = flattenQuestions(parseInterviewMarkdown(javascriptSource, {
      library: 'javascript',
      idPrefix: 'js',
      baseTags: ['JavaScript'],
    }))

    expect(questions).toHaveLength(100)
    expect(questions[0]).toMatchObject({ id: 'js-q-1', library: 'javascript', number: '1' })
    expect(questions.at(-1)).toMatchObject({ id: 'js-q-100', library: 'javascript', number: '100' })
    expect(questions[0].tags).toContain('JavaScript')
  })
})
