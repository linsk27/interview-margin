const DEFAULT_MAX_CONCURRENCY = 4
const DEFAULT_MAX_OUTPUT_TOKENS = 1200
const DEFAULT_REQUEST_TIMEOUT_MS = 60_000
const DEFAULT_FIRST_TOKEN_TIMEOUT_MS = 15_000
const DEFAULT_RETRY_DELAY_MS = 150

function integerSetting(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(maximum, Math.max(minimum, parsed))
}

function textValue(value, { trim = true } = {}) {
  let result = ''
  if (typeof value === 'string') result = value
  else if (Array.isArray(value)) {
    result = value.map((part) => {
      if (typeof part === 'string') return part
      if (part && typeof part.text === 'string') return part.text
      return ''
    }).join('')
  }
  return trim ? result.trim() : result
}

function responseText(payload) {
  return textValue(payload?.message)
    || textValue(payload?.choices?.[0]?.message?.content)
    || textValue(payload?.choices?.[0]?.message?.refusal)
    || textValue(payload?.choices?.[0]?.text)
    || textValue(payload?.delta)
}

function streamDelta(payload) {
  return textValue(payload?.delta, { trim: false })
    || textValue(payload?.text, { trim: false })
    || textValue(payload?.choices?.[0]?.delta?.content, { trim: false })
    || textValue(payload?.choices?.[0]?.delta?.refusal, { trim: false })
    || textValue(payload?.choices?.[0]?.text, { trim: false })
}

class AiError extends Error {
  constructor(code, message, options = {}) {
    super(message)
    this.name = 'AiError'
    this.code = code
    this.status = options.status ?? 502
    this.retryable = options.retryable ?? false
    this.fallbackEligible = options.fallbackEligible ?? false
    this.retryAfterMs = options.retryAfterMs
    this.clientAbort = options.clientAbort ?? false
  }
}

function retryAfterMs(response) {
  const value = response.headers.get('retry-after')
  if (!value) return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000)
  const date = Date.parse(value)
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : undefined
}

function httpError(response) {
  const status = response.status
  if (status === 429) {
    return new AiError('AI_RATE_LIMITED', 'AI 服务请求过多，请稍后再试。', {
      status: 429,
      retryable: true,
      fallbackEligible: true,
      retryAfterMs: retryAfterMs(response),
    })
  }
  if (status === 408 || status === 409 || status === 425 || status >= 500) {
    return new AiError('AI_UPSTREAM_UNAVAILABLE', 'AI 服务暂时不可用，请稍后再试。', {
      status: status === 408 ? 504 : 503,
      retryable: true,
      fallbackEligible: true,
      retryAfterMs: retryAfterMs(response),
    })
  }
  if (status === 401 || status === 403) {
    return new AiError('AI_UPSTREAM_AUTH', 'AI 服务鉴权失败，请联系管理员检查配置。', {
      status: 502,
      fallbackEligible: true,
    })
  }
  if ([400, 404, 405, 415, 422].includes(status)) {
    return new AiError('AI_UPSTREAM_CONFIGURATION', 'AI 主服务与当前请求配置不兼容。', {
      status: 502,
      fallbackEligible: true,
    })
  }
  return new AiError('AI_UPSTREAM_REJECTED', 'AI 服务拒绝了本次请求。', {
    status: status >= 400 && status < 500 ? status : 502,
  })
}

async function errorFromResponse(response) {
  // Drain a small upstream error body without reflecting provider internals to clients.
  // Some compatible providers include deployment identifiers or diagnostic details here.
  await response.body?.cancel?.().catch(() => undefined)
  return httpError(response)
}

function remainingMs(deadline) {
  return Math.max(0, deadline - Date.now())
}

function linkAbortSignal(source, controller) {
  if (!source) return () => undefined
  const abort = () => controller.abort(source.reason)
  if (source.aborted) abort()
  else source.addEventListener('abort', abort, { once: true })
  return () => source.removeEventListener('abort', abort)
}

async function dispatchSseBlock(block, state, onDelta) {
  const data = block.split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n')
  if (!data) return true
  if (data === '[DONE]') {
    state.completed = true
    return true
  }

  let payload
  try {
    payload = JSON.parse(data)
  } catch {
    state.produced = true
    if (!await onDelta(data)) {
      state.truncated = true
      state.completed = true
      return false
    }
    return true
  }

  if (payload?.error) {
    throw new AiError('AI_UPSTREAM_STREAM_ERROR', 'AI 流式响应失败，请重试。', {
      status: 502,
      retryable: true,
      fallbackEligible: true,
    })
  }

  const delta = streamDelta(payload)
  if (delta) {
    state.produced = true
    if (!await onDelta(delta)) {
      state.truncated = true
      state.completed = true
      return false
    }
  }
  if (payload?.choices?.some?.((choice) => choice?.finish_reason != null)) state.completed = true
  if (payload?.done === true) state.completed = true
  return true
}

async function consumeEventStream(response, onDelta) {
  if (!response.body) {
    throw new AiError('AI_EMPTY_RESPONSE', 'AI 服务没有返回可显示的文本。', {
      retryable: true,
      fallbackEligible: true,
    })
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const state = { produced: false, completed: false, truncated: false }
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })
      let boundary = /\r?\n\r?\n/.exec(buffer)
      while (boundary) {
        const block = buffer.slice(0, boundary.index)
        buffer = buffer.slice(boundary.index + boundary[0].length)
        if (!await dispatchSseBlock(block, state, onDelta)) {
          await reader.cancel().catch(() => undefined)
          return state
        }
        boundary = /\r?\n\r?\n/.exec(buffer)
      }
      if (done) break
    }
    if (buffer.trim()) await dispatchSseBlock(buffer, state, onDelta)
  } catch (error) {
    await reader.cancel().catch(() => undefined)
    throw error
  }

  if (!state.produced) {
    throw new AiError('AI_EMPTY_RESPONSE', 'AI 服务没有返回可显示的文本。', {
      retryable: true,
      fallbackEligible: true,
    })
  }
  if (!state.completed) {
    throw new AiError('AI_STREAM_INTERRUPTED', 'AI 回复在生成途中断开，请重试。', {
      status: 502,
      retryable: true,
      fallbackEligible: true,
    })
  }
  return state
}

async function consumeNdjson(response, onDelta) {
  if (!response.body) {
    throw new AiError('AI_EMPTY_RESPONSE', 'AI 服务没有返回可显示的文本。', {
      retryable: true,
      fallbackEligible: true,
    })
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const state = { produced: false, completed: false, truncated: false }
  let buffer = ''

  const dispatchLine = async (line) => {
    if (!line.trim()) return true
    return dispatchSseBlock(`data: ${line}`, state, onDelta)
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!await dispatchLine(line)) {
          await reader.cancel().catch(() => undefined)
          return state
        }
      }
      if (done) break
    }
    if (buffer && !await dispatchLine(buffer)) return state
  } catch (error) {
    await reader.cancel().catch(() => undefined)
    throw error
  }

  if (!state.produced) {
    throw new AiError('AI_EMPTY_RESPONSE', 'AI 服务没有返回可显示的文本。', {
      retryable: true,
      fallbackEligible: true,
    })
  }
  // A clean EOF is the completion marker for ordinary line-delimited JSON.
  state.completed = true
  return state
}

async function consumeResponse(response, onDelta) {
  if (!response.ok) throw await errorFromResponse(response)
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('text/event-stream')) {
    return consumeEventStream(response, onDelta)
  }
  if (contentType.includes('application/x-ndjson')) return consumeNdjson(response, onDelta)

  const payload = await response.json().catch(() => ({}))
  const message = responseText(payload)
  if (!message) {
    throw new AiError('AI_EMPTY_RESPONSE', 'AI 服务没有返回可显示的文本。', {
      retryable: true,
      fallbackEligible: true,
    })
  }
  const accepted = await onDelta(message)
  return { produced: true, completed: true, truncated: !accepted }
}

async function consumeTarget({ fetchImpl, url, init, clientSignal, deadline, firstTokenTimeoutMs, onDelta }) {
  const controller = new AbortController()
  const unlinkAbort = linkAbortSignal(clientSignal, controller)
  let timedOut = false
  let produced = false
  let timer

  const scheduleTimeout = (duration) => {
    clearTimeout(timer)
    if (duration <= 0) {
      timedOut = true
      controller.abort()
      return
    }
    timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, duration)
  }

  scheduleTimeout(Math.min(firstTokenTimeoutMs, remainingMs(deadline)))
  try {
    const response = await fetchImpl(url, { ...init, signal: controller.signal })
    return await consumeResponse(response, async (delta) => {
      if (!produced) {
        produced = true
        scheduleTimeout(remainingMs(deadline))
      }
      return onDelta(delta, { signal: controller.signal, deadline })
    })
  } catch (error) {
    if (clientSignal?.aborted) {
      throw new AiError('AI_CLIENT_ABORTED', '请求已取消。', { clientAbort: true })
    }
    if (timedOut) {
      throw new AiError('AI_TIMEOUT', 'AI 回复超时，请稍后重试。', {
        status: 504,
        retryable: true,
        fallbackEligible: true,
      })
    }
    if (error instanceof AiError) throw error
    throw new AiError('AI_CONNECTION_FAILED', 'AI 服务连接失败，请稍后再试。', {
      status: 502,
      retryable: true,
      fallbackEligible: true,
    })
  } finally {
    clearTimeout(timer)
    unlinkAbort()
  }
}

function setStatus(res, status) {
  if (typeof res.status === 'function') res.status(status)
  else res.statusCode = status
}

function sendJson(res, status, payload, retryAfterSeconds) {
  setStatus(res, status)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  if (retryAfterSeconds) res.setHeader('Retry-After', String(retryAfterSeconds))
  if (typeof res.json === 'function') return res.json(payload)
  return res.end(JSON.stringify(payload))
}

function streamWaitError(signal) {
  if (signal?.reason instanceof Error) return signal.reason
  return new AiError('AI_CLIENT_ABORTED', '请求已取消。', { clientAbort: true })
}

async function writeChunk(res, chunk, options = {}) {
  if (res.writableEnded || res.destroyed) throw streamWaitError(options.signal)
  const writable = res.write(chunk)
  res.flush?.()
  if (writable !== false || typeof res.once !== 'function') return

  await new Promise((resolve, reject) => {
    let timer
    const cleanup = () => {
      res.removeListener?.('drain', done)
      res.removeListener?.('close', closed)
      options.signal?.removeEventListener?.('abort', aborted)
      clearTimeout(timer)
    }
    const settle = (callback, value) => {
      cleanup()
      callback(value)
    }
    const done = () => settle(resolve)
    const closed = () => settle(reject, streamWaitError(options.signal))
    const aborted = () => settle(reject, streamWaitError(options.signal))

    if (options.signal?.aborted) {
      aborted()
      return
    }
    const waitMs = Number.isFinite(options.deadline) ? remainingMs(options.deadline) : undefined
    if (waitMs !== undefined && waitMs <= 0) {
      settle(reject, new AiError('AI_TIMEOUT', 'AI 回复超时，请稍后重试。', {
        status: 504,
        retryable: true,
        fallbackEligible: true,
      }))
      return
    }

    res.once('drain', done)
    res.once('close', closed)
    options.signal?.addEventListener?.('abort', aborted, { once: true })
    if (waitMs !== undefined) timer = setTimeout(() => {
      settle(reject, new AiError('AI_TIMEOUT', 'AI 回复超时，请稍后重试。', {
        status: 504,
        retryable: true,
        fallbackEligible: true,
      }))
    }, waitMs)
  })
}

function createSseSink(res, maxOutputChars, flowControl = {}) {
  let started = false
  let ended = false
  let outputChars = 0

  const start = () => {
    if (started) return
    started = true
    setStatus(res, 200)
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-store')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders?.()
  }

  return {
    get started() { return started },
    async emit(delta, options = flowControl) {
      if (ended || !delta) return !ended
      const remaining = maxOutputChars - outputChars
      if (remaining <= 0) return false
      const accepted = delta.slice(0, remaining)
      if (accepted) {
        start()
        outputChars += accepted.length
        await writeChunk(res, `data: ${JSON.stringify({ delta: accepted })}\n\n`, options)
      }
      return accepted.length === delta.length && outputChars < maxOutputChars
    },
    async finish(truncated = false) {
      if (ended) return
      start()
      await writeChunk(res, `data: ${JSON.stringify({ done: true, truncated })}\n\n`, flowControl)
      await writeChunk(res, 'data: [DONE]\n\n', flowControl)
      ended = true
      res.end()
    },
    async fail(error) {
      if (ended) return
      start()
      const notice = '\n\n> ⚠️ AI 回复中断，请重试。'
      try {
        await writeChunk(res, `data: ${JSON.stringify({
          delta: notice,
          error: error.message,
          code: error.code,
          retryable: error.retryable,
        })}\n\n`, flowControl)
        await writeChunk(res, 'data: [DONE]\n\n', flowControl)
      } catch {
        // The downstream client is gone or stalled past the request deadline.
      }
      ended = true
      if (!res.writableEnded) res.end()
    },
  }
}

function clientAbortSignal(req, res) {
  const controller = new AbortController()
  const abort = () => controller.abort()
  const close = () => {
    if (!res.writableEnded) abort()
  }
  req.once?.('aborted', abort)
  res.once?.('close', close)
  return {
    signal: controller.signal,
    cleanup() {
      req.removeListener?.('aborted', abort)
      res.removeListener?.('close', close)
    },
  }
}

function requestHeader(req, name) {
  if (typeof req.get === 'function') return req.get(name)
  const headers = req.headers ?? {}
  return headers[name.toLowerCase()] ?? headers[name]
}

function retryDelay(error, baseDelayMs) {
  return Math.min(1000, Math.max(baseDelayMs, error.retryAfterMs ?? 0))
}

function delay(duration) {
  return new Promise((resolve) => setTimeout(resolve, duration))
}

function publicError(error) {
  if (error instanceof AiError) return error
  return new AiError('AI_INTERNAL_ERROR', 'AI 服务暂时无法响应，请稍后再试。', { status: 500 })
}

export function createAiChatHandler(options = {}) {
  let activeRequests = 0

  return async function aiChatHandler(req, res) {
    res.setHeader('Cache-Control', 'no-store')
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return sendJson(res, 405, { error: 'Method Not Allowed', code: 'METHOD_NOT_ALLOWED', retryable: false })
    }

    const body = typeof req.body === 'string'
      ? (() => { try { return JSON.parse(req.body) } catch { return {} } })()
      : (req.body || {})
    const messages = options.normalizeMessages(body.messages)
    if (!messages.length || messages.at(-1)?.role !== 'user') {
      return sendJson(res, 400, { error: '请先输入一个问题。', code: 'AI_INVALID_REQUEST', retryable: false })
    }

    const env = options.env ?? process.env
    const maxConcurrency = integerSetting(env.AI_MAX_CONCURRENCY, DEFAULT_MAX_CONCURRENCY, 1, 32)
    if (activeRequests >= maxConcurrency) {
      return sendJson(res, 503, {
        error: 'AI 服务当前请求较多，请稍后再试。',
        code: 'AI_BUSY',
        retryable: true,
      }, 2)
    }

    const apiKey = env.OPENAI_API_KEY?.trim()
    const model = env.OPENAI_MODEL?.trim()
    const baseUrl = (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
    const isFallbackHop = requestHeader(req, 'x-interview-ai-fallback') === '1'
    const fallbackUrl = isFallbackHop ? '' : env.AI_FALLBACK_URL?.trim()
    if ((!apiKey || !model) && !fallbackUrl) {
      return sendJson(res, 503, {
        error: 'AI 服务尚未配置，请联系管理员。',
        code: 'AI_NOT_CONFIGURED',
        retryable: false,
      })
    }

    const maxOutputTokens = integerSetting(env.AI_MAX_OUTPUT_TOKENS, DEFAULT_MAX_OUTPUT_TOKENS, 64, 8192)
    const maxOutputChars = integerSetting(env.AI_MAX_OUTPUT_CHARS, maxOutputTokens * 12, 1024, 120_000)
    const totalTimeoutMs = integerSetting(env.AI_REQUEST_TIMEOUT_MS, DEFAULT_REQUEST_TIMEOUT_MS, 1000, 180_000)
    const firstTokenTimeoutMs = integerSetting(
      env.AI_FIRST_TOKEN_TIMEOUT_MS,
      Math.min(DEFAULT_FIRST_TOKEN_TIMEOUT_MS, totalTimeoutMs),
      250,
      totalTimeoutMs,
    )
    const baseRetryDelayMs = integerSetting(env.AI_RETRY_DELAY_MS, DEFAULT_RETRY_DELAY_MS, 0, 1000)
    const configuredTokenField = env.OPENAI_TOKEN_LIMIT_FIELD?.trim()
    const tokenField = configuredTokenField === 'max_completion_tokens' || configuredTokenField === 'max_tokens'
      ? configuredTokenField
      : /^(?:gpt-5|o\d)/i.test(model ?? '')
        ? 'max_completion_tokens'
        : 'max_tokens'
    const clientAbort = clientAbortSignal(req, res)
    const deadline = Date.now() + totalTimeoutMs
    const sink = createSseSink(res, maxOutputChars, { signal: clientAbort.signal, deadline })
    const fetchImpl = options.fetchImpl ?? globalThis.fetch
    const wait = options.wait ?? delay

    activeRequests += 1
    try {
      let primaryError
      if (apiKey && model) {
        const providerBody = {
          model,
          stream: true,
          [tokenField]: maxOutputTokens,
          messages: [
            { role: 'system', content: `${options.systemPrompt}\n\n${options.questionContext(body.question)}` },
            ...messages,
          ],
        }

        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            const result = await consumeTarget({
              fetchImpl,
              url: `${baseUrl}/chat/completions`,
              init: {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                  Accept: 'text/event-stream',
                },
                body: JSON.stringify(providerBody),
              },
              clientSignal: clientAbort.signal,
              deadline,
              firstTokenTimeoutMs,
              onDelta: (delta, flowControl) => sink.emit(delta, flowControl),
            })
            await sink.finish(result.truncated)
            return
          } catch (error) {
            primaryError = publicError(error)
            if (sink.started || primaryError.clientAbort) throw primaryError
            if (attempt === 0 && primaryError.retryable && remainingMs(deadline) > baseRetryDelayMs) {
              await wait(retryDelay(primaryError, baseRetryDelayMs))
              continue
            }
            break
          }
        }
      }

      if (fallbackUrl && (!primaryError || primaryError.fallbackEligible)) {
        try {
          const result = await consumeTarget({
            fetchImpl,
            url: fallbackUrl,
            init: {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'text/event-stream, application/json',
                'X-Interview-AI-Fallback': '1',
              },
              body: JSON.stringify(body),
            },
            clientSignal: clientAbort.signal,
            deadline,
            firstTokenTimeoutMs,
            onDelta: (delta, flowControl) => sink.emit(delta, flowControl),
          })
          await sink.finish(result.truncated)
          return
        } catch (error) {
          const fallbackError = publicError(error)
          if (sink.started || fallbackError.clientAbort) throw fallbackError
          throw new AiError('AI_FALLBACK_UNAVAILABLE', 'AI 主服务和后备服务暂时都不可用，请稍后再试。', {
            status: fallbackError.status === 504 ? 504 : 503,
            retryable: true,
          })
        }
      }

      throw primaryError ?? new AiError('AI_NOT_CONFIGURED', 'AI 服务尚未配置，请联系管理员。', { status: 503 })
    } catch (error) {
      const failure = publicError(error)
      if (failure.clientAbort || clientAbort.signal.aborted) {
        if (!res.writableEnded) res.end()
        return
      }
      if (sink.started) {
        await sink.fail(failure)
        return
      }
      const retryAfter = failure.status === 429 || failure.status === 503 ? 2 : undefined
      return sendJson(res, failure.status, {
        error: failure.message,
        code: failure.code,
        retryable: failure.retryable,
      }, retryAfter)
    } finally {
      clientAbort.cleanup()
      activeRequests -= 1
    }
  }
}
