import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { StudyStatus } from '../types'
import { StatusDock } from './StatusDock'

afterEach(cleanup)

describe('StatusDock', () => {
  it('exposes the active status and updates it with a click', () => {
    const onChange = vi.fn<(status: StudyStatus) => void>()

    render(<StatusDock value="unread" onChange={onChange} />)

    expect(screen.getByRole('radio', { name: '未开始' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByRole('radio', { name: '已掌握' }))
    expect(onChange).toHaveBeenCalledWith('mastered')
  })

  it('supports roving focus with arrow, Home and End keys', () => {
    const onChange = vi.fn<(status: StudyStatus) => void>()

    render(<StatusDock value="unread" onChange={onChange} />)
    const unread = screen.getByRole('radio', { name: '未开始' })

    fireEvent.keyDown(unread, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenLastCalledWith('learning')
    fireEvent.keyDown(screen.getByRole('radio', { name: '未开始' }), { key: 'End' })
    expect(onChange).toHaveBeenLastCalledWith('mastered')
    fireEvent.keyDown(screen.getByRole('radio', { name: '未开始' }), { key: 'Home' })
    expect(onChange).toHaveBeenLastCalledWith('unread')
  })
})
