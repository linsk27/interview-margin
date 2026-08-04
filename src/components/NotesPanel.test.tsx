import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { InterviewQuestion, QuestionProgress } from '../types'
import { NotesPanel } from './NotesPanel'

const question: InterviewQuestion = {
  id: 'notes-question-1',
  library: 'notes-bank',
  number: '1',
  title: 'Vue 响应式如何工作？',
  body: '通过代理追踪依赖。',
  plainText: 'Vue 响应式如何工作',
  sectionId: 'notes-section',
  sectionTitle: '前端框架',
  tags: ['Vue'],
  readMinutes: 2,
  order: 0,
}

const progress: QuestionProgress = {
  status: 'learning',
  favorite: false,
  note: '',
  readCount: 1,
  seconds: 60,
}

function createProps(overrides: Partial<ComponentProps<typeof NotesPanel>> = {}) {
  return {
    question,
    progress,
    annotations: [],
    mobileOpen: false,
    expanded: true,
    synced: true,
    width: 352,
    minWidth: 288,
    maxWidth: 480,
    compact: false,
    mode: 'notes' as const,
    assistantFocusToken: 0,
    onClose: vi.fn(),
    onModeChange: vi.fn(),
    onWidthChange: vi.fn(),
    onResizeStart: vi.fn(),
    onResizeEnd: vi.fn(),
    onToggleWidth: vi.fn(),
    onResetWidth: vi.fn(),
    onNoteChange: vi.fn(),
    onAddAnnotation: vi.fn(),
    onUpdateAnnotation: vi.fn(),
    onDeleteAnnotation: vi.fn(),
    onComposerClose: vi.fn(),
    onScheduleReview: vi.fn(),
    ...overrides,
  }
}

afterEach(cleanup)

describe('NotesPanel resizing controls', () => {
  it('switches between notes and the embedded AI workspace without opening a second drawer', () => {
    const onModeChange = vi.fn()
    const { rerender } = render(<NotesPanel {...createProps({ onModeChange })} />)
    const assistantBeforeSwitch = screen.getByRole('region', { name: 'AI 学习助手', hidden: true })

    expect(screen.getByRole('tab', { name: '批注' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(screen.getByRole('tab', { name: 'AI 助手' }))
    expect(onModeChange).toHaveBeenCalledWith('assistant')

    rerender(<NotesPanel {...createProps({ mode: 'assistant', onModeChange })} />)
    expect(screen.getByRole('tab', { name: 'AI 助手' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('region', { name: 'AI 学习助手' })).toBe(assistantBeforeSwitch)

    rerender(<NotesPanel {...createProps({ mode: 'notes', onModeChange })} />)
    expect(screen.getByRole('region', { name: 'AI 学习助手', hidden: true })).toBe(assistantBeforeSwitch)
  })

  it('stays mounted but becomes hidden and inert when collapsed', () => {
    const { container } = render(<NotesPanel {...createProps({ expanded: false })} />)
    const panel = container.querySelector('#notes-panel')

    expect(panel).toBeInTheDocument()
    expect(panel).toHaveAttribute('aria-hidden', 'true')
    expect(panel).toHaveAttribute('inert')
    expect(panel).not.toHaveClass('is-open')
  })

  it('exposes the current resizing range on an expanded separator', () => {
    render(<NotesPanel {...createProps()} />)

    const separator = screen.getByRole('separator', { name: '调整批注栏宽度' })
    expect(separator).toHaveAttribute('aria-orientation', 'vertical')
    expect(separator).toHaveAttribute('aria-valuemin', '288')
    expect(separator).toHaveAttribute('aria-valuemax', '480')
    expect(separator).toHaveAttribute('aria-valuenow', '352')
    expect(separator).toHaveAttribute('aria-valuetext', '352 像素')
    expect(separator).toHaveAttribute('tabindex', '0')
  })

  it('changes width with arrow, accelerated arrow, Home, and End keys', () => {
    const onWidthChange = vi.fn()
    render(<NotesPanel {...createProps({ onWidthChange })} />)
    const separator = screen.getByRole('separator', { name: '调整批注栏宽度' })

    fireEvent.keyDown(separator, { key: 'ArrowLeft' })
    fireEvent.keyDown(separator, { key: 'ArrowRight' })
    fireEvent.keyDown(separator, { key: 'ArrowLeft', shiftKey: true })
    fireEvent.keyDown(separator, { key: 'ArrowRight', shiftKey: true })
    fireEvent.keyDown(separator, { key: 'Home' })
    fireEvent.keyDown(separator, { key: 'End' })

    expect(onWidthChange.mock.calls.map(([width]) => width)).toEqual([
      368,
      336,
      400,
      304,
      288,
      480,
    ])
  })

  it('grows leftward during a pointer drag and ends the resize gesture', () => {
    const onWidthChange = vi.fn()
    const onResizeStart = vi.fn()
    const onResizeEnd = vi.fn()
    render(<NotesPanel {...createProps({ onWidthChange, onResizeStart, onResizeEnd })} />)
    const separator = screen.getByRole('separator', { name: '调整批注栏宽度' })

    fireEvent.pointerDown(separator, { button: 0, pointerId: 7, clientX: 1000 })
    fireEvent.pointerMove(separator, { pointerId: 7, clientX: 920 })
    fireEvent.pointerUp(separator, { pointerId: 7, clientX: 920 })

    expect(onResizeStart).toHaveBeenCalledOnce()
    expect(onWidthChange).toHaveBeenCalledWith(432)
    expect(onResizeEnd).toHaveBeenCalledOnce()
  })

  it('uses the same width toggle for compacting and restoring the panel', () => {
    const onToggleWidth = vi.fn()
    const { rerender } = render(
      <NotesPanel {...createProps({ onToggleWidth, compact: false })} />,
    )

    fireEvent.click(screen.getByRole('button', { name: '收窄批注栏宽度' }))
    expect(onToggleWidth).toHaveBeenCalledTimes(1)

    rerender(<NotesPanel {...createProps({ onToggleWidth, compact: true })} />)
    fireEvent.click(screen.getByRole('button', { name: '恢复批注栏宽度' }))
    expect(onToggleWidth).toHaveBeenCalledTimes(2)
  })

  it('restores the default width when the separator is double-clicked', () => {
    const onResetWidth = vi.fn()
    render(<NotesPanel {...createProps({ onResetWidth })} />)

    fireEvent.doubleClick(screen.getByRole('separator', { name: '调整批注栏宽度' }))
    expect(onResetWidth).toHaveBeenCalledOnce()
  })
})
