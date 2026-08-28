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
  it('offers a direct guest path without loading the question catalog', async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, _options?: RequestInit) => Promise.resolve(jsonResponse({ ok: true, banks: 14, questions: 762 })))
    vi.stubGlobal('fetch', fetchMock)
    render(<MarketingLanding />)

    expect(screen.getByRole('heading', { name: /把答案读懂/ })).toBeTruthy()
    expect(screen.getByRole('link', { name: /以游客身份开始/ }).getAttribute('href')).toBe('/app#question-banks')
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/health', expect.any(Object)))
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/api/catalog'))).toBe(false)
  })

  it('submits feedback to the private admin inbox', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, _options?: RequestInit) => {
      if (String(input) === '/api/health') return Promise.resolve(jsonResponse({ banks: 14, questions: 762 }))
      if (String(input) === '/api/contact-requests') return Promise.resolve(jsonResponse({ ok: true }, 201))
      return Promise.reject(new Error(`Unexpected request: ${String(input)}`))
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<MarketingLanding />)

    fireEvent.click(screen.getAllByRole('button', { name: /提交反馈/ })[0])
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
