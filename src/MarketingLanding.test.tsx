import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import MarketingLanding from './MarketingLanding'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('MarketingLanding', () => {
  const landingPayload = {
    version: 1,
    summary: { banks: 14, questions: 762 },
    featuredQuestions: [
      { id: 'q-1', library: 'interview', title: 'Q1：Vue2 和 Vue3 的响应式有什么区别？', readMinutes: 2, sectionTitle: '前端基础' },
      { id: 'java-q', library: 'java-foundations', title: 'Q19：HashMap 的 put 和 get 流程是什么？', readMinutes: 2, sectionTitle: '集合框架', sourceTitle: '小林 Coding：Java 集合面试题' },
      { id: 'ai-q', library: 'java-ai-applications', title: 'Q17：什么是 RAG？完整流程有哪些？', readMinutes: 2, sectionTitle: 'RAG 与 Agent 工作流', sourceTitle: '牛客：Java 后端与 AI 工程真题汇总' },
    ],
    tracks: [
      { id: 'frontend', title: '前端工程', bankCount: 5, questionCount: 300, banks: [] },
      { id: 'java', title: 'Java 后端', bankCount: 4, questionCount: 179, banks: [] },
      { id: 'ai', title: 'AI 应用开发', bankCount: 3, questionCount: 147, banks: [] },
    ],
  }

  it('offers real guest entry points without loading the full question catalog', async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, _options?: RequestInit) => Promise.resolve(jsonResponse(landingPayload)))
    vi.stubGlobal('fetch', fetchMock)
    render(<MarketingLanding />)

    expect(screen.getByRole('heading', { name: /别急着背答案/ })).toBeTruthy()
    expect(screen.getAllByRole('link', { name: /开始刷题/ })[0].getAttribute('href')).toBe('/app#question-banks')
    expect(await screen.findByRole('link', { name: /Vue2 和 Vue3/ })).toHaveAttribute('href', '/app#q-1')
    expect(screen.getAllByRole('link', { name: /从这题开始/ }).map((link) => link.getAttribute('href'))).toEqual([
      '/app#q-1',
      '/app#521d047b-e5d6-59b9-907a-cd7ad0de657a',
      '/app#72d8195b-5fad-5cfc-8370-85a1379ca106',
    ])
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/landing', expect.any(Object)))
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/api/catalog/index'))).toBe(false)
  })

  it('shows a retry action when both public catalog endpoints fail', async () => {
    let requestCount = 0
    const fetchMock = vi.fn(() => {
      requestCount += 1
      if (requestCount <= 2) return Promise.reject(new Error('offline'))
      return Promise.resolve(jsonResponse(landingPayload))
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<MarketingLanding />)

    expect(await screen.findAllByRole('alert')).toHaveLength(2)
    fireEvent.click(screen.getAllByRole('button', { name: /重新加载/ })[0])
    expect(await screen.findByRole('link', { name: /Vue2 和 Vue3/ })).toHaveAttribute('href', '/app#q-1')
  })

  it('submits feedback to the private admin inbox', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, _options?: RequestInit) => {
      if (String(input) === '/api/landing') return Promise.resolve(jsonResponse(landingPayload))
      if (String(input) === '/api/contact-requests') return Promise.resolve(jsonResponse({ ok: true }, 201))
      return Promise.reject(new Error(`Unexpected request: ${String(input)}`))
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<MarketingLanding />)

    fireEvent.click(screen.getByRole('button', { name: '反馈' }))
    fireEvent.change(screen.getByLabelText('怎么称呼你'), { target: { value: '测试访客' } })
    fireEvent.change(screen.getByLabelText('反馈内容'), { target: { value: '希望移动端的题库入口更容易找到。' } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: /^提交$/ }))

    expect(await screen.findByRole('status')).toHaveTextContent('已经收到')
    const submitCall = fetchMock.mock.calls.find(([url]) => String(url) === '/api/contact-requests')
    expect(JSON.parse(String((submitCall?.[1] as RequestInit).body))).toMatchObject({
      kind: 'feedback', name: '测试访客', message: '希望移动端的题库入口更容易找到。', consent: true,
    })
  })
})
