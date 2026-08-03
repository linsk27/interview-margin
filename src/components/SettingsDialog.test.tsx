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
  readingSize: 'comfortable',
  readingFont: 'serif',
  pageLayout: 'single',
  focusMode: false,
  notesOpen: true,
}

describe('reading settings dialog', () => {
  it('exposes controlled serif and sans font choices and emits the selected font', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <SettingsDialog
        open
        settings={settings}
        spreadAvailable
        onClose={vi.fn()}
        onChange={onChange}
      />,
    )

    const fontGroup = screen.getByRole('radiogroup', { name: '正文字体' })
    const serif = within(fontGroup).getByRole('radio', { name: /书刊宋体/ })
    const sans = within(fontGroup).getByRole('radio', { name: /清晰黑体/ })
    expect(serif).toHaveAttribute('aria-checked', 'true')
    expect(sans).toHaveAttribute('aria-checked', 'false')

    fireEvent.click(sans)
    expect(onChange).toHaveBeenCalledWith({ ...settings, readingFont: 'sans' })

    rerender(
      <SettingsDialog
        open
        settings={{ ...settings, readingFont: 'sans' }}
        spreadAvailable
        onClose={vi.fn()}
        onChange={onChange}
      />,
    )
    expect(serif).toHaveAttribute('aria-checked', 'false')
    expect(sans).toHaveAttribute('aria-checked', 'true')
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
