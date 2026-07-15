import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AiAssistant } from './AiAssistant'
import type { InterviewQuestion } from '../types'

const question = {
  id: 'q-1',
  number: '1',
  title: '为什么 Vue3 使用 Proxy？',
  body: '## 先背答案\nVue3 使用 Proxy 拦截对象访问。',
  plainText: 'Vue3 使用 Proxy',
  sectionId: 'part-1',
  sectionTitle: 'Part 1：前端八股题',
  tags: ['Vue'],
  readMinutes: 2,
  order: 1,
} satisfies InterviewQuestion

afterEach(() => vi.unstubAllGlobals())

describe('AI learning assistant', () => {
  it('sends the active question with the user prompt to the server proxy', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: '先说结论：Proxy 可以拦截更多操作。' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<AiAssistant question={question} focusToken={0} />)
    fireEvent.change(screen.getByLabelText('向 AI 提问'), { target: { value: '请用通俗的话解释' } })
    fireEvent.click(screen.getByRole('button', { name: '发送' }))

    await waitFor(() => expect(screen.getByText('先说结论：Proxy 可以拦截更多操作。')).toBeTruthy())
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    const payload = JSON.parse(options.body as string)
    expect(payload.question.title).toBe(question.title)
    expect(payload.question.body).toBe(question.body)
    expect(payload.messages).toEqual([{ role: 'user', content: '请用通俗的话解释' }])
  })
})
