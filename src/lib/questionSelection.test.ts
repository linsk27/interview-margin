import { describe, expect, it } from 'vitest'
import type { InterviewQuestion } from '../types'
import { createDefaultState } from './storage'
import { selectLibraryResumeQuestion } from './questionSelection'

function question(id: string, library: string): InterviewQuestion {
  return { id, library } as InterviewQuestion
}

describe('selectLibraryResumeQuestion', () => {
  it('returns the most recently opened question from the requested library', () => {
    const bankAFirst = question('bank-a-1', 'bank-a')
    const bankASecond = question('bank-a-2', 'bank-a')
    const bankBQuestion = question('bank-b-1', 'bank-b')
    const state = createDefaultState()
    state.progress = {
      [bankAFirst.id]: { status: 'learning', favorite: false, note: '', readCount: 1, seconds: 10, lastOpenedAt: '2026-07-01T08:00:00.000Z' },
      [bankASecond.id]: { status: 'learning', favorite: false, note: '', readCount: 1, seconds: 10, lastOpenedAt: '2026-07-02T08:00:00.000Z' },
      [bankBQuestion.id]: { status: 'learning', favorite: false, note: '', readCount: 1, seconds: 10, lastOpenedAt: '2026-08-01T08:00:00.000Z' },
    }

    expect(selectLibraryResumeQuestion(
      [bankAFirst, bankBQuestion, bankASecond],
      state,
      'bank-a',
    )).toBe(bankASecond)
  })

  it('ignores invalid dates and falls back to the first question in the library', () => {
    const otherLibraryQuestion = question('bank-b-1', 'bank-b')
    const bankFirst = question('bank-a-1', 'bank-a')
    const bankSecond = question('bank-a-2', 'bank-a')
    const state = createDefaultState()
    state.progress = {
      [otherLibraryQuestion.id]: { status: 'learning', favorite: false, note: '', readCount: 1, seconds: 10, lastOpenedAt: '2026-08-01T08:00:00.000Z' },
      [bankFirst.id]: { status: 'learning', favorite: false, note: '', readCount: 1, seconds: 10, lastOpenedAt: 'not-a-date' },
      [bankSecond.id]: { status: 'learning', favorite: false, note: '', readCount: 1, seconds: 10, lastOpenedAt: '' },
    }

    expect(selectLibraryResumeQuestion(
      [otherLibraryQuestion, bankFirst, bankSecond],
      state,
      'bank-a',
    )).toBe(bankFirst)
  })

  it('returns undefined when the requested library has no questions', () => {
    expect(selectLibraryResumeQuestion(
      [question('bank-b-1', 'bank-b')],
      createDefaultState(),
      'bank-a',
    )).toBeUndefined()
  })
})
