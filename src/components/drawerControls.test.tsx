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
        readerMode
        bankHubActive={false}
        onToggleLibrary={() => setDrawers(toggleLibrary)}
        onOpenQuestionBanks={noop}
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
        pageLayout="spread"
        spreadAvailable
        hasPrevious
        hasNext
        onPrevious={noop}
        onNext={noop}
        onToggleLibrary={() => setDrawers(toggleLibrary)}
        onToggleNotes={() => setDrawers(toggleNotes)}
        onPageLayoutChange={noop}
        onOpenSearch={noop}
        onToggleFavorite={noop}
      />
    </>
  )
}

describe('drawer controls', () => {
  it('exposes one scalable question bank hub in the rail', () => {
    const onOpenQuestionBanks = vi.fn()

    const { unmount } = render(
      <Rail
        mastered={0}
        total={100}
        reviewCount={0}
        focusMode={false}
        libraryOpen
        readerMode={false}
        bankHubActive
        onToggleLibrary={noop}
        onOpenQuestionBanks={onOpenQuestionBanks}
        onOpenDashboard={noop}
        onOpenReview={noop}
        onToggleFocus={noop}
        onOpenSettings={noop}
      />,
    )

    const hubButton = screen.getByRole('button', { name: '题库中心' })
    expect(hubButton.getAttribute('aria-pressed')).toBe('true')
    expect(screen.queryByRole('button', { name: 'JavaScript 100 题' })).toBeNull()
    fireEvent.click(hubButton)
    expect(onOpenQuestionBanks).toHaveBeenCalledOnce()
    unmount()
  })

  it('keeps the rail brand non-interactive and exposes the desktop library state', () => {
    const onToggleLibrary = vi.fn()

    render(
      <Rail
        mastered={0}
        total={81}
        reviewCount={0}
        focusMode={false}
        libraryOpen
        readerMode
        bankHubActive={false}
        onToggleLibrary={onToggleLibrary}
        onOpenQuestionBanks={noop}
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
        pageLayout="spread"
        spreadAvailable
        hasPrevious
        hasNext
        onPrevious={noop}
        onNext={noop}
        onToggleLibrary={noop}
        onToggleNotes={noop}
        onPageLayoutChange={noop}
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
        pageLayout="spread"
        spreadAvailable
        hasPrevious
        hasNext
        onPrevious={noop}
        onNext={noop}
        onToggleLibrary={noop}
        onToggleNotes={noop}
        onPageLayoutChange={noop}
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

  it('reports and changes the selected page layout only when spread mode is available', () => {
    const onPageLayoutChange = vi.fn()
    const { container, rerender } = render(
      <Topbar
        question={question}
        progress={progress}
        libraryOpen
        notesOpen
        pageLayout="single"
        spreadAvailable
        hasPrevious
        hasNext
        onPrevious={noop}
        onNext={noop}
        onToggleLibrary={noop}
        onToggleNotes={noop}
        onPageLayoutChange={onPageLayoutChange}
        onOpenSearch={noop}
        onToggleFavorite={noop}
      />,
    )
    const topbar = within(container.querySelector('.topbar') as HTMLElement)

    expect(topbar.getByRole('radio', { name: '单页阅读' }).getAttribute('aria-checked')).toBe('true')
    expect(topbar.getByRole('radio', { name: '双页阅读' }).getAttribute('aria-checked')).toBe('false')
    fireEvent.click(topbar.getByRole('radio', { name: '双页阅读' }))
    expect(onPageLayoutChange).toHaveBeenCalledWith('spread')

    rerender(
      <Topbar
        question={question}
        progress={progress}
        libraryOpen
        notesOpen
        pageLayout="spread"
        spreadAvailable={false}
        hasPrevious
        hasNext
        onPrevious={noop}
        onNext={noop}
        onToggleLibrary={noop}
        onToggleNotes={noop}
        onPageLayoutChange={onPageLayoutChange}
        onOpenSearch={noop}
        onToggleFavorite={noop}
      />,
    )

    expect(topbar.getByRole('radio', { name: '双页阅读' }).getAttribute('aria-checked')).toBe('true')
    expect(topbar.getByRole('radio', { name: '双页阅读' }).hasAttribute('disabled')).toBe(true)
  })
})
