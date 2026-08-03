import {
  ArrowUp,
  Bot,
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
import type { InterviewQuestion } from '../types'
import styles from './AiAssistant.module.css'

interface AssistantMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  status?: 'streaming' | 'complete'
}

interface AiAssistantProps {
  question: InterviewQuestion
  focusToken: number
  onClose?: () => void
}

const QUICK_PROMPTS = [
  {
    label: '用大白话讲',
    description: '一句结论、一个类比、一个最小例子',
    prompt: '我没有理解这道题。请先用一句话给出结论，再用生活或项目类比解释，最后给一个最小例子。',
    icon: Lightbulb,
  },
  {
    label: '梳理原理',
    description: '按因果链拆开关键机制和边界',
    prompt: '请把这道题的原理按“触发条件 → 核心过程 → 结果 → 边界”分点讲清楚，并指出最容易混淆的地方。',
    icon: Network,
  },
  {
    label: '模拟追问',
    description: '继续追问 3 层并给出回答要点',
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

async function readStream(
  response: Response,
  onDelta: (delta: string) => void,
): Promise<string> {
  if (!response.body) return ''

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const contentType = response.headers.get('content-type') ?? ''
  const isEventStream = contentType.includes('text/event-stream')
  let buffer = ''
  let result = ''

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

    try {
      emit(textFromStreamPayload(JSON.parse(source)))
    } catch {
      emit(source)
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value, { stream: !done })
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ''
    lines.forEach(parseLine)
    if (done) break
  }

  parseLine(buffer)
  return result
}

async function readReply(response: Response, onDelta: (delta: string) => void): Promise<string> {
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
  return reply
}

export function AiAssistant({ question, focusToken, onClose }: AiAssistantProps) {
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
      const response = await fetch('/api/ai-chat', {
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

      if (!reply) throw new Error('AI 服务没有返回可显示的文本。')
      setMessages((current) => current.map((message) => (
        message.id === assistantMessage.id
          ? { ...message, content: streamedContent || reply, status: 'complete' }
          : message
      )))
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return
      setMessages((current) => current.filter((message) => message.id !== assistantMessage.id))
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

    const conversation = [...messages.filter((message) => message.status !== 'streaming'), newMessage('user', content, 'complete')]
    setDraft('')
    await requestReply(conversation)
  }

  const cancel = () => {
    abortRef.current?.abort()
    abortRef.current = undefined
    setIsLoading(false)
    setMessages((current) => current
      .filter((message) => message.status !== 'streaming' || message.content)
      .map((message) => message.status === 'streaming' ? { ...message, status: 'complete' } : message))
  }

  const retry = () => {
    const conversation = messages.filter((message) => message.status !== 'streaming')
    if (conversation.at(-1)?.role !== 'user') return
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

  return (
    <section className={styles.assistant} aria-labelledby="ai-assistant-title">
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

      <div className={styles.conversation} role="log" aria-live="polite" aria-busy={isLoading}>
        <div className={styles.context} title={displayQuestionTitle}>
          <span>Q{question.number}</span>
          <strong>{displayQuestionTitle}</strong>
        </div>

        {!hasConversation && !error && (
          <div className={styles.emptyState}>
            <div>
              <h4>从哪里开始？</h4>
              <p>选择一种方式，AI 会只围绕当前题目继续讲解。</p>
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
                  <span className={styles.roleLabel}>{message.role === 'assistant' ? 'AI 助手' : '你'}</span>
                  <div className={styles.messageBody}>
                    {message.role === 'assistant'
                      ? message.content
                        ? <ReactMarkdown remarkPlugins={[remarkGfm]} disallowedElements={['img']}>{message.content}</ReactMarkdown>
                        : <p className={styles.thinking}><LoaderCircle aria-hidden="true" />正在组织回答…</p>
                      : <p>{message.content}</p>}
                  </div>
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
              <button type="button" onClick={retry} disabled={isLoading}>
                <RotateCcw aria-hidden="true" />重试
              </button>
            )}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <footer className={styles.composerArea}>
        <form className={styles.composer} onSubmit={submit}>
          <label className="sr-only" htmlFor="ai-question">向 AI 提问</label>
          <textarea
            ref={inputRef}
            id="ai-question"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="继续追问当前题目…"
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
        <p className={styles.hint}><span>Enter 发送 · Shift + Enter 换行</span><span>回答可能有误，请核对关键结论</span></p>
      </footer>
    </section>
  )
}
