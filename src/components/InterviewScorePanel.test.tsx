import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { InterviewScorePanel } from './InterviewScorePanel'

const scoreResult = {
  version: 1,
  score: 74,
  band: '方向正确，还需补充',
  summary: '主线方向正确，但为什么这样做还没有说明白。',
  dimensions: [
    { key: 'correctness', label: '技术正确性', level: 'solid', levelLabel: '主线完整', score: 26, maxScore: 30 },
    { key: 'reasoning', label: '原理与因果', level: 'partial', levelLabel: '方向对，还有缺口', score: 16, maxScore: 25 },
    { key: 'coverage', label: '关键点覆盖', level: 'solid', levelLabel: '主线完整', score: 17, maxScore: 20 },
    { key: 'application', label: '场景、边界与取舍', level: 'weak', levelLabel: '只提到少量', score: 5, maxScore: 15 },
    { key: 'communication', label: '表达与结构', level: 'strong', levelLabel: '准确且有边界', score: 10, maxScore: 10 },
  ],
  strengths: ['先给出了核心结论'],
  gaps: ['缺少边界条件'],
  corrections: [],
  nextStep: '补一句为什么，再举一个适用场景。',
  criticalIssues: [],
  confidence: 'high',
  disclaimer: 'AI 模拟评分，仅用于练习复盘，不代表真实录用结论。',
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('InterviewScorePanel', () => {
  it('requests an explicit score and renders concise, fixed-rubric feedback', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(scoreResult), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)
    render(<InterviewScorePanel questionId="rag-17" answer="先找证据，再让模型回答。" />)

    expect(screen.getByText(/技术正确性 30/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '开始 AI 评分' }))

    expect(await screen.findByText('方向正确，还需补充')).toBeInTheDocument()
    expect(screen.getByRole('status', { name: '练习评分 74 分' })).toBeInTheDocument()
    expect(screen.getByText(scoreResult.summary)).toBeInTheDocument()
    expect(screen.getByText('26 / 30')).toBeInTheDocument()
    expect(screen.getByText('为什么扣分')).toBeInTheDocument()
    expect(screen.getByText('缺少边界条件')).toBeInTheDocument()
    expect(screen.getByText('补一句为什么，再举一个适用场景。')).toBeInTheDocument()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse(init.body)).toEqual({ questionId: 'rag-17', answer: '先找证据，再让模型回答。' })
  })

  it('keeps the standard flow usable when scoring fails and supports a retry', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'AI 服务繁忙。' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify(scoreResult), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    vi.stubGlobal('fetch', fetchMock)
    render(<InterviewScorePanel questionId="rag-17" answer="我的回答" />)

    fireEvent.click(screen.getByRole('button', { name: '开始 AI 评分' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('AI 服务繁忙。')

    fireEvent.click(screen.getByRole('button', { name: '重试评分' }))
    await waitFor(() => expect(screen.getByText('方向正确，还需补充')).toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('shows a readable network error and only retries recoverable failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    render(<InterviewScorePanel questionId="rag-17" answer="我的回答" />)

    fireEvent.click(screen.getByRole('button', { name: '开始 AI 评分' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('网络连接失败，请检查网络后重试。')
    expect(screen.getByRole('button', { name: '重试评分' })).toBeInTheDocument()
    expect(screen.queryByText('Failed to fetch')).not.toBeInTheDocument()
  })

  it('does not offer a pointless retry for a missing or inaccessible question', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: '题目不存在或当前不可访问。',
      code: 'QUESTION_NOT_FOUND',
      retryable: false,
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })))
    render(<InterviewScorePanel questionId="missing" answer="我的回答" />)

    fireEvent.click(screen.getByRole('button', { name: '开始 AI 评分' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('题目不存在或当前不可访问。')
    expect(screen.queryByRole('button', { name: '重试评分' })).not.toBeInTheDocument()
    expect(screen.getByText('仍可继续对照标准答案。')).toBeInTheDocument()
  })

  it('rejects a malformed score contract instead of displaying misleading points', async () => {
    const malformed = {
      ...scoreResult,
      dimensions: scoreResult.dimensions.map((dimension, index) => index === 0
        ? { ...dimension, score: 99 }
        : dimension),
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(malformed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })))
    render(<InterviewScorePanel questionId="rag-17" answer="我的回答" />)

    fireEvent.click(screen.getByRole('button', { name: '开始 AI 评分' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('AI 评分结果格式异常，请重试。')
    expect(screen.queryByLabelText('练习评分 74 分')).not.toBeInTheDocument()
  })

  it('explains when a serious issue caps the total below the dimension sum', async () => {
    const cappedResult = {
      ...scoreResult,
      score: 45,
      band: '关键点不足',
      criticalIssues: [{
        type: 'CORE_CONCEPT_REVERSED',
        evidence: 'RAG 是向量数据库',
        explanation: 'RAG 是一套检索增强生成流程，向量数据库只是可选组件。',
      }],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(cappedResult), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })))
    render(<InterviewScorePanel questionId="rag-17" answer="RAG 是向量数据库" />)

    fireEvent.click(screen.getByRole('button', { name: '开始 AI 评分' }))

    expect(await screen.findByText('严重问题已触发总分上限')).toBeInTheDocument()
    expect(screen.getByText('RAG 是向量数据库')).toBeInTheDocument()
    expect(screen.getByText('RAG 是一套检索增强生成流程，向量数据库只是可选组件。')).toBeInTheDocument()
    expect(screen.getByLabelText('练习评分 45 分')).toBeInTheDocument()
  })

  it('shows imprecise wording separately from serious errors', async () => {
    const resultWithCorrection = {
      ...scoreResult,
      corrections: [{
        evidence: 'SSE 是半双工通信',
        correction: 'SSE 更准确地说是服务端到客户端的单向 HTTP 事件流。',
      }],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(resultWithCorrection), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })))
    render(<InterviewScorePanel questionId="sse-1" answer="SSE 是半双工通信" />)

    fireEvent.click(screen.getByRole('button', { name: '开始 AI 评分' }))

    expect(await screen.findByRole('region', { name: '表述需修正' })).toBeInTheDocument()
    expect(screen.getByText('SSE 是半双工通信')).toBeInTheDocument()
    expect(screen.getByText(/SSE 更准确地说是服务端到客户端/)).toBeInTheDocument()
    expect(screen.queryByText('严重问题已触发总分上限')).not.toBeInTheDocument()
  })

  it('keeps rendering version-one responses from an older server without corrections', async () => {
    const legacyResult = {
      ...scoreResult,
      dimensions: scoreResult.dimensions.map((dimension) => ({
        ...dimension,
        levelLabel: dimension.level === 'strong'
          ? '表现扎实'
          : dimension.level === 'solid'
            ? '较完整'
            : dimension.level === 'partial'
              ? '部分命中'
              : dimension.level === 'weak'
                ? '较弱'
                : '未体现',
      })),
    }
    delete (legacyResult as Partial<typeof scoreResult>).corrections
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(legacyResult), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })))
    render(<InterviewScorePanel questionId="rag-17" answer="先找证据，再让模型回答。" />)

    fireEvent.click(screen.getByRole('button', { name: '开始 AI 评分' }))

    expect(await screen.findByRole('status', { name: '练习评分 74 分' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '表述需修正' })).not.toBeInTheDocument()
  })

  it('aborts an unfinished request when the score panel unmounts', async () => {
    let requestSignal: AbortSignal | undefined
    vi.stubGlobal('fetch', vi.fn((_url, init) => {
      requestSignal = init?.signal as AbortSignal
      return new Promise<Response>(() => undefined)
    }))
    const view = render(<InterviewScorePanel questionId="rag-17" answer="我的回答" />)

    fireEvent.click(screen.getByRole('button', { name: '开始 AI 评分' }))
    await waitFor(() => expect(requestSignal).toBeDefined())
    view.unmount()

    expect(requestSignal?.aborted).toBe(true)
  })
})
