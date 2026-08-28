import {
  ArrowUp,
  Bot,
  BriefcaseBusiness,
  Check,
  CircleAlert,
  Lightbulb,
  LoaderCircle,
  MessagesSquare,
  Network,
  RotateCcw,
  Square,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { appPath } from '../lib/api'
import type { InterviewQuestion } from '../types'
import styles from './AiAssistant.module.css'

interface AssistantMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  status?: 'streaming' | 'complete' | 'stopped' | 'interrupted' | 'truncated'
}

interface ReplyResult {
  content: string
  truncated: boolean
}

class AiStreamError extends Error {
  partialContent: string
  code?: string
  retryable: boolean

  constructor(message: string, partialContent: string, code?: string, retryable = true) {
    super(message)
    this.name = 'AiStreamError'
    this.partialContent = partialContent
    this.code = code
    this.retryable = retryable
  }
}

interface AiAssistantProps {
  question: InterviewQuestion
  focusToken: number
  onClose?: () => void
  embedded?: boolean
}

const QUICK_PROMPTS = [
  {
    label: '讲得更简单',
    description: '结论、类比和最小例子',
    prompt: '我没有理解这道题。请先用一句话给出结论，再用生活或项目类比解释，最后给一个最小例子。',
    icon: Lightbulb,
  },
  {
    label: '画出流程',
    description: '用步骤和箭头梳理机制',
    prompt: '请把这道题的原理整理成简洁的文本流程图，并按“触发条件 → 核心过程 → 结果 → 边界”解释每一步。',
    icon: Network,
  },
  {
    label: '举真实例子',
    description: '放进具体项目场景中',
    prompt: '请给出一个真实项目中的使用场景，说明为什么要用这项技术、具体怎么实现，以及不用它会出现什么问题。',
    icon: BriefcaseBusiness,
  },
  {
    label: '模拟追问',
    description: '追问三层并给回答要点',
    prompt: '请模拟面试官围绕这道题继续追问 3 层，每一层都给出简洁的回答框架和关键点。',
    icon: MessagesSquare,
  },
]

function newMessage(
  role: AssistantMessage['role'],
  content: string,
  status?: AssistantMessage['status'],
): AssistantMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    status,
  }
}

function textFromStreamPayload(payload: unknown): string {
  if (typeof payload === 'string') return payload
  if (!payload || typeof payload !== 'object') return ''

  const data = payload as Record<string, unknown>
  for (const key of ['delta', 'text', 'message', 'content']) {
    if (typeof data[key] === 'string') return data[key]
  }
  return ''
}

function errorFromStreamPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') return undefined
  const data = payload as Record<string, unknown>
  if (!data.error) return undefined
  const nested = typeof data.error === 'object' && data.error
    ? data.error as Record<string, unknown>
    : undefined
  const message = typeof data.error === 'string'
    ? data.error
    : typeof nested?.message === 'string'
      ? nested.message
      : 'AI 回复在生成途中断开，请重试。'
  return {
    message,
    code: typeof data.code === 'string' ? data.code : undefined,
    retryable: data.retryable !== false,
  }
}

async function readStream(
  response: Response,
  onDelta: (delta: string) => void,
): Promise<ReplyResult> {
  if (!response.body) return { content: '', truncated: false }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const contentType = response.headers.get('content-type') ?? ''
  const isEventStream = contentType.includes('text/event-stream')
  let buffer = ''
  let result = ''
  let truncated = false

  const emit = (value: string) => {
    if (!value) return
    result += value
    onDelta(value)
  }

  const parseLine = (rawLine: string) => {
    const line = rawLine.trim()
    if (!line || line.startsWith(':')) return
    const source = isEventStream && line.startsWith('data:') ? line.slice(5).trimStart() : line
    if (!source || source === '[DONE]') return

    let payload: unknown
    try {
      payload = JSON.parse(source)
    } catch {
      emit(source)
      return
    }

    const streamError = errorFromStreamPayload(payload)
    if (streamError) {
      throw new AiStreamError(streamError.message, result, streamError.code, streamError.retryable)
    }
    if (payload && typeof payload === 'object' && (payload as Record<string, unknown>).truncated === true) {
      truncated = true
    }
    emit(textFromStreamPayload(payload))
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() ?? ''
      lines.forEach(parseLine)
      if (done) break
    }
    parseLine(buffer)
  } catch (streamError) {
    if (streamError instanceof AiStreamError) throw streamError
    if (streamError instanceof DOMException && streamError.name === 'AbortError') throw streamError
    throw new AiStreamError('AI 回复在传输途中断开，请重试。', result, 'AI_STREAM_INTERRUPTED')
  }
  return { content: result, truncated }
}

async function readReply(response: Response, onDelta: (delta: string) => void): Promise<ReplyResult> {
  const contentType = response.headers?.get?.('content-type') ?? ''

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as { error?: unknown }
    throw new Error(typeof errorData.error === 'string' ? errorData.error : 'AI 服务暂时无法响应，请稍后再试。')
  }

  if (contentType.includes('text/event-stream') || contentType.includes('application/x-ndjson')) {
    return readStream(response, onDelta)
  }

  const data = await response.json().catch(() => ({})) as { message?: unknown, error?: unknown }
  const reply = typeof data.message === 'string' ? data.message : ''
  if (!reply) {
    throw new Error(typeof data.error === 'string' ? data.error : 'AI 服务没有返回可显示的文本。')
  }
  onDelta(reply)
  return { content: reply, truncated: false }
}

export function AiAssistant({ question, focusToken, onClose, embedded = false }: AiAssistantProps) {
  const displayQuestionTitle = question.title.replace(/^Q[\d.]+[：:]?\s*/i, '')
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | undefined>(undefined)

  useEffect(() => {
    abortRef.current?.abort()
    setMessages([])
    setDraft('')
    setError('')
    setIsLoading(false)
  }, [question.id])

  useEffect(() => () => abortRef.current?.abort(), [])

  useEffect(() => {
    if (!focusToken) return
    const timer = window.setTimeout(() => inputRef.current?.focus(), 40)
    return () => window.clearTimeout(timer)
  }, [focusToken])

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'nearest', behavior: isLoading ? 'smooth' : 'auto' })
  }, [isLoading, messages])

  useEffect(() => {
    const input = inputRef.current
    if (!input) return
    input.style.height = 'auto'
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`
  }, [draft])

  const requestReply = async (conversation: AssistantMessage[]) => {
    if (isLoading) return

    const controller = new AbortController()
    const assistantMessage = newMessage('assistant', '', 'streaming')
    abortRef.current = controller
    setMessages([...conversation, assistantMessage])
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch(appPath('/api/ai-chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream, application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          question: {
            number: question.number,
            sectionTitle: question.sectionTitle,
            title: question.title,
            body: question.body,
          },
          messages: conversation.map(({ role, content }) => ({ role, content })),
        }),
      })

      let streamedContent = ''
      const reply = await readReply(response, (delta) => {
        streamedContent += delta
        setMessages((current) => current.map((message) => (
          message.id === assistantMessage.id
            ? { ...message, content: streamedContent }
            : message
        )))
      })

      if (!reply.content) throw new Error('AI 服务没有返回可显示的文本。')
      setMessages((current) => current.map((message) => (
        message.id === assistantMessage.id
          ? {
              ...message,
              content: streamedContent || reply.content,
              status: reply.truncated ? 'truncated' : 'complete',
            }
          : message
      )))
    } catch (requestError) {
      if (controller.signal.aborted || (requestError instanceof DOMException && requestError.name === 'AbortError')) return
      const partialContent = requestError instanceof AiStreamError ? requestError.partialContent : ''
      setMessages((current) => partialContent
        ? current.map((message) => message.id === assistantMessage.id
            ? { ...message, content: partialContent, status: 'interrupted' }
            : message)
        : current.filter((message) => message.id !== assistantMessage.id))
      setError(requestError instanceof Error ? requestError.message : 'AI 服务暂时无法响应，请稍后再试。')
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = undefined
        setIsLoading(false)
      }
    }
  }

  const send = async (value = draft) => {
    const content = value.trim()
    if (!content || isLoading) return

    const conversation = [
      ...messages.filter((message) => (
        message.status !== 'streaming'
        && message.status !== 'stopped'
        && message.status !== 'interrupted'
      )),
      newMessage('user', content, 'complete'),
    ]
    setDraft('')
    await requestReply(conversation)
  }

  const cancel = () => {
    abortRef.current?.abort()
    abortRef.current = undefined
    setIsLoading(false)
    setMessages((current) => current.map((message) => (
      message.status === 'streaming' ? { ...message, status: 'stopped' } : message
    )))
  }

  const retryFromLastUser = () => {
    const lastUserIndex = messages.map((message) => message.role).lastIndexOf('user')
    if (lastUserIndex < 0) return
    const conversation = messages
      .slice(0, lastUserIndex + 1)
      .filter((message) => message.status !== 'streaming' && message.status !== 'stopped')
    void requestReply(conversation)
  }

  const continueTruncatedReply = () => {
    const conversation = [
      ...messages.filter((message) => (
        message.status !== 'streaming'
        && message.status !== 'stopped'
        && message.status !== 'interrupted'
      )),
      newMessage('user', '请从刚才被截断的位置继续回答，不要重复已经给出的内容。', 'complete'),
    ]
    void requestReply(conversation)
  }

  const clear = () => {
    abortRef.current?.abort()
    abortRef.current = undefined
    setMessages([])
    setError('')
    setIsLoading(false)
    inputRef.current?.focus()
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void send()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void send()
    }
  }

  const hasConversation = messages.length > 0
  const lastReplyStatus = messages.at(-1)?.status
  const hasStoppedReply = lastReplyStatus === 'stopped'
  const hasInterruptedReply = lastReplyStatus === 'interrupted'
  const hasTruncatedReply = lastReplyStatus === 'truncated'

  return (
    <section
      className={`${styles.assistant}${embedded ? ` ${styles.embedded}` : ''}`}
      aria-labelledby={embedded ? undefined : 'ai-assistant-title'}
      aria-label={embedded ? 'AI 学习助手' : undefined}
    >
      {!embedded && (
        <header className={styles.header}>
          <span className={styles.brandMark}><Bot aria-hidden="true" /></span>
          <div className={styles.headingCopy}>
            <h3 id="ai-assistant-title">AI 学习助手</h3>
            <p><span aria-hidden="true" />已关联当前题目</p>
          </div>
          <div className={styles.headerActions}>
            {hasConversation && (
              <button className={styles.iconButton} type="button" onClick={clear} aria-label="清空本题 AI 对话" title="清空对话">
                <Trash2 aria-hidden="true" />
              </button>
            )}
            {onClose && (
              <button className={styles.iconButton} type="button" onClick={onClose} aria-label="关闭 AI 助手" title="关闭 AI 助手">
                <X aria-hidden="true" />
              </button>
            )}
          </div>
        </header>
      )}

      <div className={styles.conversation} role="log" aria-live="polite" aria-busy={isLoading}>
        <div className={styles.context} title={displayQuestionTitle}>
          <span className={styles.contextIndex}>Q{question.number}</span>
          <div className={styles.contextCopy}>
            <span>正在讨论</span>
            <strong>{displayQuestionTitle}</strong>
          </div>
          {embedded && hasConversation && (
            <button className={styles.contextClear} type="button" onClick={clear} aria-label="清空本题 AI 对话" title="清空对话">
              <Trash2 aria-hidden="true" />
            </button>
          )}
        </div>

        {!hasConversation && !error && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIntro}>
              <span className={styles.emptyMark}><Bot aria-hidden="true" /></span>
              <div>
                <h4>把不理解的地方问清楚</h4>
                <p>我会沿用当前题目的上下文，不需要重复粘贴题干。</p>
              </div>
            </div>
            <div className={styles.quickActions} aria-label="快捷提问">
              {QUICK_PROMPTS.map(({ label, description, prompt, icon: Icon }) => (
                <button key={label} type="button" onClick={() => void send(prompt)} disabled={isLoading}>
                  <span className={styles.quickIcon}><Icon aria-hidden="true" /></span>
                  <span>
                    <strong>{label}</strong>
                    <small>{description}</small>
                  </span>
                  <ArrowUp aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        )}

        {hasConversation && (
          <div className={styles.messages}>
            {messages.map((message) => (
              <article key={message.id} className={`${styles.message} ${message.role === 'user' ? styles.userMessage : styles.assistantMessage}`}>
                <span className={styles.avatar} aria-hidden="true">
                  {message.role === 'assistant' ? <Bot /> : <UserRound />}
                </span>
                <div className={styles.messageContent}>
                  <span className={styles.roleLabel}>
                    {message.role === 'assistant' ? 'AI 助手' : '你'}
                    {message.status === 'streaming' && message.content && <em>正在生成</em>}
                    {message.status === 'complete' && message.role === 'assistant' && <Check aria-label="回答完成" />}
                  </span>
                  <div className={styles.messageBody}>
                    {message.role === 'assistant'
                      ? message.content
                        ? <ReactMarkdown remarkPlugins={[remarkGfm]} disallowedElements={['img']}>{message.content}</ReactMarkdown>
                        : message.status === 'stopped'
                          ? <p className={styles.stoppedCopy}>生成已停止，你可以重新生成或换一种问法。</p>
                          : <div className={styles.thinking} role="status"><LoaderCircle aria-hidden="true" /><span><strong>正在分析题目</strong><small>整理关键概念与回答结构…</small></span></div>
                      : <p>{message.content}</p>}
                  </div>
                  {(message.status === 'stopped' || message.status === 'interrupted' || message.status === 'truncated')
                    && message.role === 'assistant' && (
                    <div className={styles.stoppedState} role="status">
                      <span>{message.status === 'truncated'
                        ? '回答已达到长度上限'
                        : message.status === 'interrupted'
                          ? '回答传输中断'
                          : '已停止生成'}</span>
                      <button
                        type="button"
                        onClick={message.status === 'truncated' ? continueTruncatedReply : retryFromLastUser}
                        disabled={isLoading}
                      >
                        <RotateCcw aria-hidden="true" />{message.status === 'truncated' ? '继续回答' : '重新生成'}
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {error && (
          <div className={styles.error} role="alert">
            <CircleAlert aria-hidden="true" />
            <div>
              <strong>这次没有回答成功</strong>
              <p>{error}</p>
            </div>
            {messages.at(-1)?.role === 'user' && (
              <button type="button" onClick={retryFromLastUser} disabled={isLoading}>
                <RotateCcw aria-hidden="true" />重试
              </button>
            )}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <footer className={styles.composerArea}>
        {hasStoppedReply && (
          <p className={styles.composerStatus}><Square aria-hidden="true" />上一次回答已停止，可直接调整问题后再次发送。</p>
        )}
        {hasInterruptedReply && (
          <p className={styles.composerStatus}><CircleAlert aria-hidden="true" />回答传输中断，可重新生成或调整问题。</p>
        )}
        {hasTruncatedReply && (
          <p className={styles.composerStatus}><CircleAlert aria-hidden="true" />回答达到长度上限，可继续生成剩余内容。</p>
        )}
        <form className={styles.composer} onSubmit={submit}>
          <label className="sr-only" htmlFor="ai-question">向 AI 提问</label>
          <textarea
            ref={inputRef}
            id="ai-question"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="追问本题，或让 AI 换一种讲法…"
            rows={1}
            disabled={isLoading}
          />
          {isLoading ? (
            <button className={styles.stopButton} type="button" onClick={cancel} aria-label="停止生成" title="停止生成">
              <Square aria-hidden="true" />
            </button>
          ) : (
            <button className={styles.sendButton} type="submit" disabled={!draft.trim()} aria-label="发送" title="发送问题">
              <ArrowUp aria-hidden="true" />
            </button>
          )}
        </form>
        <p className={styles.hint}><span>Enter 发送 · Shift + Enter 换行</span><span>AI 可能出错，请核对关键结论</span></p>
      </footer>
    </section>
  )
}
