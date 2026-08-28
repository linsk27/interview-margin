import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { ReaderSettings } from '../types'
import { SettingsDialog } from './SettingsDialog'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() { this.open = true }
  HTMLDialogElement.prototype.close = function close() { this.open = false }
})

afterEach(cleanup)

const settings: ReaderSettings = {
  theme: 'light',
  fontTheme: 'clean',
  readingSize: 'comfortable',
  pageLayout: 'single',
  focusMode: false,
  notesOpen: true,
}

describe('reading settings dialog', () => {
  it('offers four visibly named font themes and applies the selected value', () => {
    const onChange = vi.fn()
    render(
      <SettingsDialog
        open
        settings={settings}
        spreadAvailable
        onClose={vi.fn()}
        onChange={onChange}
      />,
    )

    const fontGroup = screen.getByRole('radiogroup', { name: '字体主题' })
    const clean = within(fontGroup).getByRole('radio', { name: '清爽字体，清楚耐看' })
    const playful = within(fontGroup).getByRole('radio', { name: '快乐字体，大题标题怪可爱，其他文字清爽' })
    const flowing = within(fontGroup).getByRole('radio', { name: '飘逸字体，大题标题飘逸，其他文字统一文楷' })

    expect(within(fontGroup).getAllByRole('radio')).toHaveLength(4)
    expect(clean).toHaveAttribute('aria-checked', 'true')
    expect(playful).toHaveAttribute('aria-checked', 'false')
    expect(flowing).toHaveAttribute('aria-checked', 'false')
    expect(within(clean).getByText('当前')).toBeVisible()

    fireEvent.click(playful)
    expect(onChange).toHaveBeenCalledWith({ ...settings, fontTheme: 'playful' })
  })

  it('labels each reading size with its visibly distinct target pixel size', () => {
    const onChange = vi.fn()
    render(
      <SettingsDialog
        open
        settings={settings}
        spreadAvailable
        onClose={vi.fn()}
        onChange={onChange}
      />,
    )

    const sizeGroup = screen.getByRole('radiogroup', { name: '正文字号' })
    const compact = within(sizeGroup).getByRole('radio', { name: '紧凑字号，15 px' })
    const comfortable = within(sizeGroup).getByRole('radio', { name: '标准字号，17 px' })
    const large = within(sizeGroup).getByRole('radio', { name: '大字字号，20 px' })

    expect(compact).toHaveAttribute('aria-checked', 'false')
    expect(comfortable).toHaveAttribute('aria-checked', 'true')
    expect(large).toHaveAttribute('aria-checked', 'false')
    expect(within(compact).getByText('15 px')).toBeVisible()
    expect(within(comfortable).getByText('17 px')).toBeVisible()
    expect(within(large).getByText('20 px')).toBeVisible()

    fireEvent.click(large)
    expect(onChange).toHaveBeenCalledWith({ ...settings, readingSize: 'large' })
  })
})
