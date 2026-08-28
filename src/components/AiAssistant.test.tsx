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
  it('can render as an embedded workspace without a duplicate title or close action', () => {
    render(<AiAssistant question={question} focusToken={0} embedded onClose={vi.fn()} />)

    expect(screen.queryByRole('heading', { name: 'AI 学习助手' })).toBeNull()
    expect(screen.queryByRole('button', { name: '关闭 AI 助手' })).toBeNull()
    expect(screen.getByText('正在讨论')).toBeTruthy()
    expect(screen.getByRole('textbox', { name: '向 AI 提问' })).toBeTruthy()
  })

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

  it('keeps a partial streamed answer as interrupted and offers regeneration', async () => {
    const stream = [
      'data: {"delta":"已经生成的半段回答。"}\n\n',
      'data: {"delta":"\\n\\n> ⚠️ AI 回复中断，请重试。","error":"AI 回复在生成途中断开，请重试。","code":"AI_STREAM_INTERRUPTED","retryable":true}\n\n',
      'data: [DONE]\n\n',
    ].join('')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(stream, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
    })))

    render(<AiAssistant question={question} focusToken={0} />)
    fireEvent.change(screen.getByLabelText('向 AI 提问'), { target: { value: '解释到一半会怎样' } })
    fireEvent.click(screen.getByRole('button', { name: '发送' }))

    await waitFor(() => expect(screen.getByText('已经生成的半段回答。')).toBeTruthy())
    expect(screen.getByText('回答传输中断')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('AI 回复在生成途中断开')
    expect(screen.getByRole('button', { name: '重新生成' })).toBeTruthy()
    expect(screen.queryByLabelText('回答完成')).toBeNull()
  })

  it('marks a length-limited stream as truncated and offers to continue', async () => {
    const stream = [
      'data: {"delta":"达到长度上限前的回答。"}\n\n',
      'data: {"done":true,"truncated":true}\n\n',
      'data: [DONE]\n\n',
    ].join('')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(stream, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
    })))

    render(<AiAssistant question={question} focusToken={0} />)
    fireEvent.change(screen.getByLabelText('向 AI 提问'), { target: { value: '详细解释' } })
    fireEvent.click(screen.getByRole('button', { name: '发送' }))

    await waitFor(() => expect(screen.getByText('达到长度上限前的回答。')).toBeTruthy())
    expect(screen.getByText('回答已达到长度上限')).toBeTruthy()
    expect(screen.getByRole('button', { name: '继续回答' })).toBeTruthy()
    expect(screen.queryByLabelText('回答完成')).toBeNull()
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

  it('keeps an explicit stopped state when generation is cancelled', async () => {
    const fetchMock = vi.fn()
      .mockImplementationOnce((_url: string, options: RequestInit) => (
        new Promise((_resolve, reject) => {
          options.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
        })
      ))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: '新的完整回答。' }),
      })
    vi.stubGlobal('fetch', fetchMock)

    render(<AiAssistant question={question} focusToken={0} />)
    fireEvent.change(screen.getByLabelText('向 AI 提问'), { target: { value: '继续解释' } })
    fireEvent.click(screen.getByRole('button', { name: '发送' }))

    const stopButton = await screen.findByRole('button', { name: '停止生成' })
    fireEvent.click(stopButton)

    await waitFor(() => expect(screen.getByText('已停止生成')).toBeTruthy())
    expect(screen.getByRole('button', { name: '重新生成' })).toBeTruthy()
    expect(screen.getByText('上一次回答已停止，可直接调整问题后再次发送。')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('向 AI 提问'), { target: { value: '换个角度说明' } })
    fireEvent.click(screen.getByRole('button', { name: '发送' }))
    await waitFor(() => expect(screen.getByText('新的完整回答。')).toBeTruthy())

    const [, secondOptions] = fetchMock.mock.calls[1] as [string, RequestInit]
    const secondPayload = JSON.parse(secondOptions.body as string)
    expect(secondPayload.messages).toEqual([
      { role: 'user', content: '继续解释' },
      { role: 'user', content: '换个角度说明' },
    ])
  })
})
