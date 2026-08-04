import type { InterviewQuestion } from '../types'

export type WorkspaceView = 'reader' | 'banks' | 'admin'

export interface WorkspaceRoute {
  view: WorkspaceView
  question: InterviewQuestion
  hash: string
  needsReplace: boolean
}

interface ResolveWorkspaceRouteOptions {
  hash: string
  questions: InterviewQuestion[]
  canAccessAdmin: boolean
  preferredQuestionId?: string
}

export function questionHash(questionId: string): string {
  return `#${questionId}`
}

function questionIdFromHash(hash: string): string | undefined {
  if (!hash.startsWith('#') || hash.length < 2) return undefined
  try {
    return decodeURIComponent(hash.slice(1))
  } catch {
    return undefined
  }
}

/**
 * Resolve every address-bar state into a complete workspace state. Invalid,
 * empty and unauthorized routes always fall back to a real reader question,
 * so history navigation can never leave the UI pointing at a stale workspace.
 */
export function resolveWorkspaceRoute({
  hash,
  questions,
  canAccessAdmin,
  preferredQuestionId,
}: ResolveWorkspaceRouteOptions): WorkspaceRoute | undefined {
  const preferredQuestion = questions.find((question) => question.id === preferredQuestionId)
  const fallbackQuestion = preferredQuestion ?? questions[0]
  if (!fallbackQuestion) return undefined

  if (hash === '#question-banks') {
    return {
      view: 'banks',
      question: fallbackQuestion,
      hash: '#question-banks',
      needsReplace: false,
    }
  }

  if (hash === '#admin' && canAccessAdmin) {
    return {
      view: 'admin',
      question: fallbackQuestion,
      hash: '#admin',
      needsReplace: false,
    }
  }

  const questionId = questionIdFromHash(hash)
  const matchedQuestion = questions.find((question) => question.id === questionId)
  if (matchedQuestion) {
    const canonicalHash = questionHash(matchedQuestion.id)
    return {
      view: 'reader',
      question: matchedQuestion,
      hash: canonicalHash,
      needsReplace: hash !== canonicalHash,
    }
  }

  return {
    view: 'reader',
    question: fallbackQuestion,
    hash: questionHash(fallbackQuestion.id),
    needsReplace: true,
  }
}

export function writeWorkspaceHash(
  hash: string,
  method: 'push' | 'replace' = 'push',
  location: Location = window.location,
  history: History = window.history,
): boolean {
  if (location.hash === hash) return false
  history[`${method}State`](null, '', hash)
  return true
}
