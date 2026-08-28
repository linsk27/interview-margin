import type { QuestionProgress } from '../types'

type ReviewScheduleProgress = Pick<QuestionProgress, 'status' | 'dueAt'>

/**
 * A valid schedule takes precedence over the broad `review` status. Records
 * without a usable schedule retain the legacy behavior where `review` is due
 * immediately.
 */
export function isReviewDue(progress: ReviewScheduleProgress, now = new Date()): boolean {
  const dueTime = progress.dueAt ? Date.parse(progress.dueAt) : Number.NaN

  if (Number.isFinite(dueTime)) return dueTime <= now.getTime()
  return progress.status === 'review'
}
