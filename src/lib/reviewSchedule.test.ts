import { describe, expect, it } from 'vitest'
import type { QuestionProgress } from '../types'
import { isReviewDue } from './reviewSchedule'

const now = new Date('2026-08-28T09:00:00.000Z')

function progress(
  status: QuestionProgress['status'],
  dueAt?: string,
): Pick<QuestionProgress, 'status' | 'dueAt'> {
  return { status, dueAt }
}

describe('isReviewDue', () => {
  it('lets a valid future due date override review status', () => {
    expect(isReviewDue(progress('review', '2026-08-29T09:00:00.000Z'), now)).toBe(false)
  })

  it('marks valid past and boundary dates as due regardless of status', () => {
    expect(isReviewDue(progress('mastered', '2026-08-27T09:00:00.000Z'), now)).toBe(true)
    expect(isReviewDue(progress('learning', now.toISOString()), now)).toBe(true)
  })

  it('falls back to review status when dueAt is missing or invalid', () => {
    expect(isReviewDue(progress('review'), now)).toBe(true)
    expect(isReviewDue(progress('review', 'not-a-date'), now)).toBe(true)
    expect(isReviewDue(progress('mastered', 'not-a-date'), now)).toBe(false)
  })
})
