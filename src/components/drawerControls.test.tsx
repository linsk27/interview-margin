import { fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  isFocusMode,
  toggleFocusMode,
  toggleLibrary,
  toggleNotes,
  type DrawerState,
} from '../lib/drawerState'
import { Rail } from './Rail'
import { Topbar } from './Topbar'
import type { InterviewQuestion, QuestionProgress } from '../types'

const question = {
  number: 23,
  sectionTitle: 'Part 2：项目拷打题',
} as unknown as InterviewQuestion

const progress = { favorite: false } as QuestionProgress

const noop = () => undefined

function DrawerControlHarness() {
  const [drawers, setDrawers] = useState<DrawerState>({ libraryOpen: true, notesOpen: true })

  return (
    <>
      <Rail
        mastered={0}
        total={81}
        reviewCount={0}
        focusMode={isFocusMode(drawers)}
        libraryOpen={drawers.libraryOpen}
        onToggleLibrary={() => setDrawers(toggleLibrary)}
        onOpenDashboard={noop}
        onOpenReview={noop}
        onToggleFocus={() => setDrawers(toggleFocusMode)}
        onOpenSettings={noop}
      />
      <Topbar
        question={question}
        progress={progress}
        libraryOpen={drawers.libraryOpen}
        notesOpen={drawers.notesOpen}
        hasPrevious
        hasNext
        onPrevious={noop}
        onNext={noop}
        onToggleLibrary={() => setDrawers(toggleLibrary)}
        onToggleNotes={() => setDrawers(toggleNotes)}
        onOpenSearch={noop}
        onToggleFavorite={noop}
      />
    </>
  )
}

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

  it('keeps library, notes, and focus controls synchronized through mixed clicks', () => {
    const { container } = render(<DrawerControlHarness />)
    const rail = within(container.querySelector('.rail') as HTMLElement)
    const topbar = within(container.querySelector('.topbar') as HTMLElement)

    fireEvent.click(rail.getByRole('button', { name: '专注阅读' }))
    expect(rail.getByRole('button', { name: '专注阅读' }).getAttribute('aria-pressed')).toBe('true')
    expect(rail.getByRole('button', { name: '展开题库侧栏' }).getAttribute('aria-expanded')).toBe('false')
    expect(topbar.getByRole('button', { name: '展开批注' }).getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(rail.getByRole('button', { name: '展开题库侧栏' }))
    expect(rail.getByRole('button', { name: '专注阅读' }).getAttribute('aria-pressed')).toBe('false')
    expect(rail.getByRole('button', { name: '收起题库侧栏' }).getAttribute('aria-expanded')).toBe('true')
    expect(topbar.getByRole('button', { name: '展开批注' }).getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(rail.getByRole('button', { name: '专注阅读' }))
    fireEvent.click(rail.getByRole('button', { name: '专注阅读' }))
    expect(rail.getByRole('button', { name: '收起题库侧栏' }).getAttribute('aria-expanded')).toBe('true')
    expect(topbar.getByRole('button', { name: '收起批注' }).getAttribute('aria-expanded')).toBe('true')

    fireEvent.click(rail.getByRole('button', { name: '专注阅读' }))
    fireEvent.click(topbar.getByRole('button', { name: '展开批注' }))
    expect(rail.getByRole('button', { name: '专注阅读' }).getAttribute('aria-pressed')).toBe('false')
    expect(rail.getByRole('button', { name: '展开题库侧栏' }).getAttribute('aria-expanded')).toBe('false')
    expect(topbar.getByRole('button', { name: '收起批注' }).getAttribute('aria-expanded')).toBe('true')
  })
})
