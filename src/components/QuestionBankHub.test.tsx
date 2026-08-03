import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { QUESTION_BANKS } from '../data/questionBanks'
import type { InterviewQuestion, StudyState } from '../types'
import { QuestionBankHub } from './QuestionBankHub'

const questions = [
  { id: 'q-1', library: 'interview', title: 'Vue 响应式', number: '1' },
  { id: 'js-q-1', library: 'javascript', title: 'typeof null', number: '1' },
] as InterviewQuestion[]

const state: StudyState = {
  version: 1,
  progress: {},
  annotations: [],
  activity: {},
  settings: {
    theme: 'light',
    readingSize: 'comfortable',
    readingFont: 'serif',
    pageLayout: 'single',
    focusMode: false,
    notesOpen: true,
  },
}

describe('QuestionBankHub', () => {
  it('renders registered packs and opens the selected pack', () => {
    const onOpenBank = vi.fn()
    const { unmount } = render(
      <QuestionBankHub
        banks={QUESTION_BANKS}
        questions={questions}
        state={state}
        currentBankId="interview"
        onOpenBank={onOpenBank}
        onOpenDashboard={() => undefined}
        onOpenSettings={() => undefined}
      />,
    )

    expect(screen.getByRole('heading', { name: '简历技术面试题' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'JavaScript 基础 100 题' })).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button', { name: '开始学习' })[1])
    expect(onOpenBank).toHaveBeenCalledWith(expect.objectContaining({ id: 'javascript' }))
    unmount()
  })

  it('filters packs by category without coupling navigation to JavaScript', () => {
    render(
      <QuestionBankHub
        banks={QUESTION_BANKS}
        questions={questions}
        state={state}
        currentBankId="interview"
        onOpenBank={() => undefined}
        onOpenDashboard={() => undefined}
        onOpenSettings={() => undefined}
      />,
    )

    fireEvent.click(screen.getByRole('tab', { name: '前端基础' }))
    expect(screen.getByRole('heading', { name: 'JavaScript 基础 100 题' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: '简历技术面试题' })).toBeNull()
  })
})
