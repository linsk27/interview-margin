import type { InterviewQuestion, QuestionLibrary, StudyState } from '../types'

function validTimestamp(value: string | undefined): number | undefined {
  if (!value) return undefined
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : undefined
}

/**
 * Select the question a learner should resume within one question library.
 *
 * The newest valid `lastOpenedAt` wins. If the library has no valid timestamp,
 * its first question in the supplied order is returned instead.
 */
export function selectLibraryResumeQuestion(
  questions: readonly InterviewQuestion[],
  state: StudyState,
  library: QuestionLibrary,
): InterviewQuestion | undefined {
  const libraryQuestions = questions.filter((question) => question.library === library)
  const firstQuestion = libraryQuestions[0]
  if (!firstQuestion) return undefined

  let latestQuestion = firstQuestion
  let latestTimestamp = Number.NEGATIVE_INFINITY

  for (const question of libraryQuestions) {
    const timestamp = validTimestamp(state.progress[question.id]?.lastOpenedAt)
    if (timestamp !== undefined && timestamp > latestTimestamp) {
      latestTimestamp = timestamp
      latestQuestion = question
    }
  }

  return latestQuestion
}
