import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AiAssistant } from './AiAssistant'
import type { InterviewQuestion } from '../types'

const question = {
  id: 'q-1',
  library: 'interview',
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

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('AI learning assistant', () => {
  it('shows the question number only once when the stored title already has a Q prefix', () => {
    render(<AiAssistant question={{ ...question, title: 'Q1：为什么 Vue3 使用 Proxy？' }} focusToken={0} />)

    expect(screen.getByText('Q1')).toBeTruthy()
    expect(screen.getByText('为什么 Vue3 使用 Proxy？')).toBeTruthy()
    expect(screen.queryByText('Q1：为什么 Vue3 使用 Proxy？')).toBeNull()
  })

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

  it('does not load images proposed by an AI response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: '解释如下：\n\n![远程跟踪图](https://images.example/tracker.svg)' }),
    }))

    render(<AiAssistant question={question} focusToken={0} />)
    fireEvent.change(screen.getByLabelText('向 AI 提问'), { target: { value: '请画图' } })
    fireEvent.click(screen.getByRole('button', { name: '发送' }))

    await waitFor(() => expect(screen.getByText('解释如下：')).toBeTruthy())
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('renders streamed SSE deltas in one assistant message', async () => {
    const stream = [
      'data: {"delta":"先说结论："}\n\n',
      'data: {"delta":"Proxy 能统一拦截对象操作。"}\n\n',
      'data: [DONE]\n\n',
    ].join('')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(stream, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
    })))

    render(<AiAssistant question={question} focusToken={0} />)
    fireEvent.change(screen.getByLabelText('向 AI 提问'), { target: { value: '解释原理' } })
    fireEvent.click(screen.getByRole('button', { name: '发送' }))

    await waitFor(() => expect(screen.getByText('先说结论：Proxy 能统一拦截对象操作。')).toBeTruthy())
    expect(screen.queryByText('正在组织回答…')).toBeNull()
  })

  it('keeps the failed prompt and offers an accessible retry action', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: '服务繁忙，请稍后再试。' }),
    }))

    render(<AiAssistant question={question} focusToken={0} />)
    fireEvent.change(screen.getByLabelText('向 AI 提问'), { target: { value: '继续追问' } })
    fireEvent.click(screen.getByRole('button', { name: '发送' }))

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('服务繁忙'))
    expect(screen.getByText('继续追问')).toBeTruthy()
    expect(screen.getByRole('button', { name: '重试' })).toBeTruthy()
  })
})
