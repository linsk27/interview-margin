import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Rail } from './Rail'
import { Topbar } from './Topbar'
import type { InterviewQuestion, QuestionProgress } from '../types'

const question = {
  number: 23,
  sectionTitle: 'Part 2：项目拷打题',
} as unknown as InterviewQuestion

const progress = { favorite: false } as QuestionProgress

const noop = () => undefined

describe('drawer controls', () => {
  it('keeps the rail brand non-interactive and exposes the desktop library state', () => {
    const onToggleLibrary = vi.fn()

    render(
      <Rail
        mastered={0}
        total={81}
        reviewCount={0}
        focusMode={false}
        libraryOpen
        onToggleLibrary={onToggleLibrary}
        onOpenDashboard={noop}
        onOpenReview={noop}
        onToggleFocus={noop}
        onOpenSettings={noop}
      />,
    )

    expect(screen.getByRole('img', { name: '面试边注' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '打开题库' })).toBeNull()
    expect(screen.getByRole('button', { name: '收起题库侧栏' }).getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('button', { name: '收起题库侧栏' }).getAttribute('aria-controls')).toBe('question-library')
  })

  it('reports the actual mobile library and notes states in the topbar', () => {
    const { rerender } = render(
      <Topbar
        question={question}
        progress={progress}
        libraryOpen
        notesOpen={false}
        hasPrevious
        hasNext
        onPrevious={noop}
        onNext={noop}
        onToggleLibrary={noop}
        onToggleNotes={noop}
        onOpenSearch={noop}
        onToggleFavorite={noop}
      />,
    )

    expect(screen.getByRole('button', { name: '收起题库' }).getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('button', { name: '收起题库' }).getAttribute('aria-controls')).toBe('question-library')
    expect(screen.getByRole('button', { name: '展开批注' }).getAttribute('aria-expanded')).toBe('false')

    rerender(
      <Topbar
        question={question}
        progress={progress}
        libraryOpen={false}
        notesOpen
        hasPrevious
        hasNext
        onPrevious={noop}
        onNext={noop}
        onToggleLibrary={noop}
        onToggleNotes={noop}
        onOpenSearch={noop}
        onToggleFavorite={noop}
      />,
    )

    expect(screen.getByRole('button', { name: '展开题库' }).getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByRole('button', { name: '收起批注' }).getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('button', { name: '收起批注' }).getAttribute('aria-controls')).toBe('notes-panel')
  })
})
