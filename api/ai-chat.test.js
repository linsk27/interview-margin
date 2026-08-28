// @vitest-environment node

import { EventEmitter } from 'node:events'

import { describe, expect, it, vi } from 'vitest'

import { createConfiguredAiChatHandler } from './ai-chat.js'

const encoder = new TextEncoder()

function request(overrides = {}) {
  const req = new EventEmitter()
  req.method = overrides.method ?? 'POST'
  req.body = overrides.body ?? {
    question: { number: '1', title: '事件循环', sectionTitle: 'Node.js', body: '解释事件循环。' },
    messages: [{ role: 'user', content: '请解释' }],
  }
  req.headers = overrides.headers ?? {}
  req.get = (name) => req.headers[name.toLowerCase()]
  return req
}

function responseRecorder(overrides = {}) {
  const res = new EventEmitter()
  res.statusCode = 200
  res.headers = new Map()
  res.chunks = []
  res.writableEnded = false
  res.setHeader = (name, value) => res.headers.set(name.toLowerCase(), String(value))
  res.getHeader = (name) => res.headers.get(name.toLowerCase())
  res.status = (status) => { res.statusCode = status; return res }
  res.write = (chunk) => {
    res.chunks.push(String(chunk))
    return overrides.writeResult ?? true
  }
  res.flush = vi.fn()
  res.flushHeaders = vi.fn()
  res.end = (chunk) => {
    if (chunk) res.chunks.push(String(chunk))
    res.writableEnded = true
    return res
  }
  res.json = (payload) => {
    res.jsonBody = payload
    res.end(JSON.stringify(payload))
    return res
  }
  return res
}

function sseResponse(chunks) {
  return new Response(new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)))
      controller.close()
    },
  }), {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
  })
}

function baseEnv(overrides = {}) {
  return {
    OPENAI_API_KEY: 'test-key',
    OPENAI_MODEL: 'test-model',
    OPENAI_BASE_URL: 'https://primary.example/v1',
    AI_RETRY_DELAY_MS: '0',
    ...overrides,
  }
}

describe('AI chat proxy reliability', () => {
  it('streams OpenAI-compatible SSE deltas and sends an output token limit', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(sseResponse([
      'data: {"choices":[{"delta":{"content":"先说"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"结论。"},"finish_reason":"stop"}]}\n\n',
      'data: [DONE]\n\n',
    ]))
    const handler = createConfiguredAiChatHandler({
      env: baseEnv({ AI_MAX_OUTPUT_TOKENS: '640' }),
      fetchImpl,
      wait: vi.fn(),
    })
    const res = responseRecorder()

    await handler(request(), res)

    expect(res.statusCode).toBe(200)
    expect(res.getHeader('content-type')).toContain('text/event-stream')
    expect(res.getHeader('x-accel-buffering')).toBe('no')
    expect(res.chunks.join('')).toContain('data: {"delta":"先说"}')
    expect(res.chunks.join('')).toContain('data: {"delta":"结论。"}')
    expect(res.chunks.join('')).toContain('data: [DONE]')

    const [, init] = fetchImpl.mock.calls[0]
    const upstreamBody = JSON.parse(init.body)
    expect(upstreamBody.stream).toBe(true)
    expect(upstreamBody.max_tokens).toBe(640)
    expect(upstreamBody.messages.at(-1)).toEqual({ role: 'user', content: '请解释' })
  })

  it('uses the current completion token field and preserves streamed refusals for GPT-5 models', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(sseResponse([
      'data: {"choices":[{"delta":{"refusal":"无法协助该请求。"},"finish_reason":"content_filter"}]}\n\n',
      'data: [DONE]\n\n',
    ]))
    const handler = createConfiguredAiChatHandler({
      env: baseEnv({ OPENAI_MODEL: 'gpt-5.6-luna', OPENAI_TOKEN_LIMIT_FIELD: '' }),
      fetchImpl,
      wait: vi.fn(),
    })
    const res = responseRecorder()

    await handler(request(), res)

    const [, init] = fetchImpl.mock.calls[0]
    const upstreamBody = JSON.parse(init.body)
    expect(upstreamBody.max_completion_tokens).toBe(1200)
    expect(upstreamBody).not.toHaveProperty('max_tokens')
    expect(upstreamBody).not.toHaveProperty('temperature')
    expect(res.chunks.join('')).toContain('无法协助该请求。')
  })

  it('accepts line-delimited JSON from compatible providers', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response([
      '{"choices":[{"delta":{"content":"逐行"}}]}',
      '{"choices":[{"delta":{"content":"输出"}}]}',
    ].join('\n'), {
      status: 200,
      headers: { 'Content-Type': 'application/x-ndjson' },
    }))
    const handler = createConfiguredAiChatHandler({ env: baseEnv(), fetchImpl, wait: vi.fn() })
    const res = responseRecorder()

    await handler(request(), res)

    expect(res.statusCode).toBe(200)
    expect(res.chunks.join('')).toContain('逐行')
    expect(res.chunks.join('')).toContain('输出')
    expect(res.chunks.join('')).toContain('data: [DONE]')
  })

  it('retries one recoverable upstream failure before returning a stream', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'busy' } }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(sseResponse([
        'data: {"choices":[{"delta":{"content":"重试成功"},"finish_reason":"stop"}]}\n\n',
        'data: [DONE]\n\n',
      ]))
    const wait = vi.fn().mockResolvedValue(undefined)
    const handler = createConfiguredAiChatHandler({ env: baseEnv(), fetchImpl, wait })
    const res = responseRecorder()

    await handler(request(), res)

    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(wait).toHaveBeenCalledTimes(1)
    expect(res.chunks.join('')).toContain('重试成功')
  })

  it('switches to AI_FALLBACK_URL after retryable failures before the first token', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 429 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(sseResponse([
        'data: {"delta":"后备回答"}\n\n',
        'data: {"done":true}\n\n',
        'data: [DONE]\n\n',
      ]))
    const handler = createConfiguredAiChatHandler({
      env: baseEnv({ AI_FALLBACK_URL: 'https://fallback.example/api/ai-chat' }),
      fetchImpl,
      wait: vi.fn().mockResolvedValue(undefined),
    })
    const res = responseRecorder()

    await handler(request(), res)

    expect(fetchImpl).toHaveBeenCalledTimes(3)
    expect(fetchImpl.mock.calls[2][0]).toBe('https://fallback.example/api/ai-chat')
    expect(fetchImpl.mock.calls[2][1].headers['X-Interview-AI-Fallback']).toBe('1')
    expect(res.chunks.join('')).toContain('后备回答')
  })

  it('uses fallback without retrying the same provider after an authentication failure', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'invalid key: private-provider-id' } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(sseResponse([
        'data: {"delta":"后备鉴权成功"}\n\n',
        'data: {"done":true}\n\n',
        'data: [DONE]\n\n',
      ]))
    const handler = createConfiguredAiChatHandler({
      env: baseEnv({ AI_FALLBACK_URL: 'https://fallback.example/api/ai-chat' }),
      fetchImpl,
      wait: vi.fn(),
    })
    const res = responseRecorder()

    await handler(request(), res)

    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(fetchImpl.mock.calls[1][0]).toBe('https://fallback.example/api/ai-chat')
    expect(res.chunks.join('')).toContain('后备鉴权成功')
    expect(res.chunks.join('')).not.toContain('private-provider-id')
  })

  it('does not expose provider diagnostics when an incompatible request has no fallback', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { message: 'deployment=secret-internal-name rejected max_tokens' },
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }))
    const handler = createConfiguredAiChatHandler({ env: baseEnv(), fetchImpl, wait: vi.fn() })
    const res = responseRecorder()

    await handler(request(), res)

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(res.statusCode).toBe(502)
    expect(res.jsonBody).toEqual({
      error: 'AI 主服务与当前请求配置不兼容。',
      code: 'AI_UPSTREAM_CONFIGURATION',
      retryable: false,
    })
    expect(JSON.stringify(res.jsonBody)).not.toContain('secret-internal-name')
  })

  it('switches to fallback after two first-token timeouts', async () => {
    vi.useFakeTimers()
    try {
      const fetchImpl = vi.fn().mockImplementation((url, init) => {
        if (url === 'https://fallback.example/api/ai-chat') {
          return Promise.resolve(sseResponse([
            'data: {"delta":"超时后备回答"}\n\n',
            'data: {"done":true}\n\n',
            'data: [DONE]\n\n',
          ]))
        }
        return new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
        })
      })
      const handler = createConfiguredAiChatHandler({
        env: baseEnv({
          AI_FALLBACK_URL: 'https://fallback.example/api/ai-chat',
          AI_FIRST_TOKEN_TIMEOUT_MS: '250',
          AI_REQUEST_TIMEOUT_MS: '2000',
        }),
        fetchImpl,
        wait: vi.fn().mockResolvedValue(undefined),
      })
      const res = responseRecorder()
      const run = handler(request(), res)

      await vi.runAllTimersAsync()
      await run

      expect(fetchImpl).toHaveBeenCalledTimes(3)
      expect(res.chunks.join('')).toContain('超时后备回答')
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not retry or switch providers after a token was already sent', async () => {
    const interrupted = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"半段回答"}}]}\n\n'))
        setTimeout(() => controller.error(new Error('connection reset')), 10)
      },
    })
    const fetchImpl = vi.fn().mockResolvedValue(new Response(interrupted, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    }))
    const handler = createConfiguredAiChatHandler({
      env: baseEnv({ AI_FALLBACK_URL: 'https://fallback.example/api/ai-chat' }),
      fetchImpl,
      wait: vi.fn().mockResolvedValue(undefined),
    })
    const res = responseRecorder()

    await handler(request(), res)

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(res.chunks.join('')).toContain('半段回答')
    expect(res.chunks.join('')).toContain('AI 回复中断，请重试')
    expect(res.chunks.join('')).toContain('"code":"AI_CONNECTION_FAILED"')
  })

  it('returns a structured JSON error when both primary and fallback are unavailable', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
    const handler = createConfiguredAiChatHandler({
      env: baseEnv({ AI_FALLBACK_URL: 'https://fallback.example/api/ai-chat' }),
      fetchImpl,
      wait: vi.fn().mockResolvedValue(undefined),
    })
    const res = responseRecorder()

    await handler(request(), res)

    expect(res.statusCode).toBe(503)
    expect(res.jsonBody).toEqual({
      error: 'AI 主服务和后备服务暂时都不可用，请稍后再试。',
      code: 'AI_FALLBACK_UNAVAILABLE',
      retryable: true,
    })
  })

  it('rejects excess concurrent generations without contacting the provider', async () => {
    let releaseFirst
    const firstResponse = new Promise((resolve) => { releaseFirst = resolve })
    const fetchImpl = vi.fn().mockImplementationOnce(() => firstResponse)
    const handler = createConfiguredAiChatHandler({
      env: baseEnv({ AI_MAX_CONCURRENCY: '1' }),
      fetchImpl,
      wait: vi.fn().mockResolvedValue(undefined),
    })
    const firstRes = responseRecorder()
    const firstRun = handler(request(), firstRes)
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1))

    const secondRes = responseRecorder()
    await handler(request(), secondRes)

    expect(secondRes.statusCode).toBe(503)
    expect(secondRes.getHeader('retry-after')).toBe('2')
    expect(secondRes.jsonBody.code).toBe('AI_BUSY')
    expect(fetchImpl).toHaveBeenCalledTimes(1)

    releaseFirst(new Response(JSON.stringify({ message: '完成' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    await firstRun
  })

  it('ends a stalled downstream write at the request deadline and releases the concurrency slot', async () => {
    vi.useFakeTimers()
    try {
      const fetchImpl = vi.fn().mockImplementation(() => Promise.resolve(sseResponse([
        'data: {"choices":[{"delta":{"content":"开始输出"},"finish_reason":"stop"}]}\n\n',
        'data: [DONE]\n\n',
      ])))
      const handler = createConfiguredAiChatHandler({
        env: baseEnv({
          AI_MAX_CONCURRENCY: '1',
          AI_FIRST_TOKEN_TIMEOUT_MS: '250',
          AI_REQUEST_TIMEOUT_MS: '1000',
        }),
        fetchImpl,
        wait: vi.fn(),
      })
      const stalledRes = responseRecorder({ writeResult: false })
      const stalledRun = handler(request(), stalledRes)

      await vi.advanceTimersByTimeAsync(1000)
      await stalledRun

      expect(stalledRes.writableEnded).toBe(true)

      const nextRes = responseRecorder()
      await handler(request(), nextRes)
      expect(nextRes.statusCode).toBe(200)
      expect(nextRes.jsonBody?.code).not.toBe('AI_BUSY')
    } finally {
      vi.useRealTimers()
    }
  })
})
