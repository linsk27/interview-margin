import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AiAssistantDialog } from './AiAssistantDialog'
import type { InterviewQuestion } from '../types'

const question = {
  id: 'q-1',
  number: '1',
  title: '为什么 Vue3 使用 Proxy？',
  body: 'Vue3 使用 Proxy 实现响应式。',
  plainText: 'Vue3 使用 Proxy',
  sectionId: 'part-1',
  sectionTitle: 'Part 1：前端八股题',
  tags: ['Vue'],
  readMinutes: 2,
  order: 1,
} satisfies InterviewQuestion

describe('AI assistant floating panel', () => {
  it('closes on Escape or the close button without becoming a modal', () => {
    const onClose = vi.fn()
    render(<AiAssistantDialog open question={question} focusToken={0} onClose={onClose} />)

    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('false')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: '关闭 AI 助手' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
