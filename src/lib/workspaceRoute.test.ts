import { afterEach, describe, expect, it, vi } from 'vitest'
import type { InterviewQuestion } from '../types'
import { resolveWorkspaceRoute, writeWorkspaceHash } from './workspaceRoute'

const firstQuestion = {
  id: 'bank-a-q-1',
  library: 'bank-a',
  title: 'Question one',
} as InterviewQuestion

const secondQuestion = {
  id: 'bank-b-q-2',
  library: 'bank-b',
  title: 'Question two',
} as InterviewQuestion

const questions = [firstQuestion, secondQuestion]

describe('workspace route resolution', () => {
  afterEach(() => window.history.replaceState(null, '', '/'))

  it.each(['', '#missing-question', '#admin', '#%E0%A4%A'])(
    'falls back from %s to a canonical reader route',
    (hash) => {
      const route = resolveWorkspaceRoute({
        hash,
        questions,
        canAccessAdmin: false,
        preferredQuestionId: secondQuestion.id,
      })

      expect(route).toMatchObject({
        view: 'reader',
        question: secondQuestion,
        hash: '#bank-b-q-2',
        needsReplace: true,
      })
    },
  )

  it('resolves question, question-bank and authorized admin routes', () => {
    expect(resolveWorkspaceRoute({
      hash: '#bank-a-q-1',
      questions,
      canAccessAdmin: false,
    })).toMatchObject({ view: 'reader', question: firstQuestion, needsReplace: false })

    expect(resolveWorkspaceRoute({
      hash: '#question-banks',
      questions,
      canAccessAdmin: false,
      preferredQuestionId: secondQuestion.id,
    })).toMatchObject({ view: 'banks', question: secondQuestion, needsReplace: false })

    expect(resolveWorkspaceRoute({
      hash: '#admin',
      questions,
      canAccessAdmin: true,
      preferredQuestionId: secondQuestion.id,
    })).toMatchObject({ view: 'admin', question: secondQuestion, needsReplace: false })
  })

  it('uses the first real question when no preferred question exists', () => {
    expect(resolveWorkspaceRoute({
      hash: '',
      questions,
      canAccessAdmin: false,
      preferredQuestionId: 'deleted-question',
    })).toMatchObject({ question: firstQuestion, hash: '#bank-a-q-1' })
  })

  it('does not add duplicate history entries for the current hash', () => {
    window.history.replaceState(null, '', '/#bank-a-q-1')
    const pushSpy = vi.spyOn(window.history, 'pushState')

    expect(writeWorkspaceHash('#bank-a-q-1')).toBe(false)
    expect(pushSpy).not.toHaveBeenCalled()

    expect(writeWorkspaceHash('#bank-b-q-2')).toBe(true)
    expect(pushSpy).toHaveBeenCalledOnce()
  })
})
