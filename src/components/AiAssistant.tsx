import { Bot, CornerDownLeft, LoaderCircle, Sparkles, Trash2 } from 'lucide-react'
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { InterviewQuestion } from '../types'

interface AssistantMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface AiAssistantProps {
  question: InterviewQuestion
  focusToken: number
}

const QUICK_PROMPTS = [
  { label: '通俗解释', prompt: '我没有理解这道题，请用最通俗的方式解释：先说结论，再讲原理和一个最小例子。' },
  { label: '项目类比', prompt: '请结合我简历里的前端或 AI 项目，给这道题一个真实、可讲清楚的业务类比。' },
  { label: '继续追问', prompt: '请模拟面试官围绕这道题继续追问 3 层，并给出每层回答的关键点。' },
]

function newMessage(role: AssistantMessage['role'], content: string): AssistantMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
  }
}

export function AiAssistant({ question, focusToken }: AiAssistantProps) {
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
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

  const send = async (value = draft) => {
    const content = value.trim()
    if (!content || isLoading) return

    const userMessage = newMessage('user', content)
    const conversation = [...messages, userMessage]
    const controller = new AbortController()
    abortRef.current = controller
    setMessages(conversation)
    setDraft('')
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          question: {
            number: question.number,
            sectionTitle: question.sectionTitle,
            title: question.title,
            body: question.body,
          },
          messages: conversation.map(({ role, content: messageContent }) => ({ role, content: messageContent })),
        }),
      })
      const data = await response.json().catch(() => ({})) as { message?: unknown, error?: unknown }
      const reply = typeof data.message === 'string' ? data.message : ''

      if (!response.ok || !reply) {
        throw new Error(typeof data.error === 'string' ? data.error : 'AI 服务暂时无法响应，请稍后再试。')
      }

      setMessages((current) => [...current, newMessage('assistant', reply)])
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return
      setError(requestError instanceof Error ? requestError.message : 'AI 服务暂时无法响应，请稍后再试。')
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = undefined
        setIsLoading(false)
      }
    }
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void send()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault()
      void send()
    }
  }

  return (
    <section className="ai-assistant" aria-labelledby="ai-assistant-title">
      <div className="ai-assistant__heading">
        <span className="ai-assistant__mark"><Bot aria-hidden="true" /></span>
        <div>
          <h3 id="ai-assistant-title">AI 学习助手</h3>
          <p>已关联当前 Q{question.number}</p>
        </div>
        {messages.length > 0 && (
          <button
            className="icon-button ai-assistant__clear"
            type="button"
            onClick={() => { abortRef.current?.abort(); setMessages([]); setError('') }}
            aria-label="清空本题 AI 对话"
            title="清空本题 AI 对话"
          >
            <Trash2 aria-hidden="true" />
          </button>
        )}
      </div>

      <p className="ai-assistant__context" title={question.title}>{question.title}</p>

      <div className="ai-assistant__quick-actions" aria-label="快捷提问">
        {QUICK_PROMPTS.map(({ label, prompt }) => (
          <button key={label} type="button" onClick={() => void send(prompt)} disabled={isLoading}>
            <Sparkles aria-hidden="true" />{label}
          </button>
        ))}
      </div>

      {messages.length > 0 && (
        <div className="ai-assistant__messages" aria-live="polite" aria-busy={isLoading}>
          {messages.map((message) => (
            <article key={message.id} className={`ai-assistant__message ai-assistant__message--${message.role}`}>
              <span>{message.role === 'assistant' ? 'AI' : '你'}</span>
              <div className="ai-assistant__message-body">
                {message.role === 'assistant'
                  ? <ReactMarkdown remarkPlugins={[remarkGfm]} disallowedElements={['img']}>{message.content}</ReactMarkdown>
                  : <p>{message.content}</p>}
              </div>
            </article>
          ))}
          {isLoading && (
            <div className="ai-assistant__loading"><LoaderCircle aria-hidden="true" />正在梳理当前题目的回答…</div>
          )}
        </div>
      )}

      {error && <p className="ai-assistant__error" role="alert">{error}</p>}

      <form className="ai-assistant__form" onSubmit={submit}>
        <label className="sr-only" htmlFor="ai-question">向 AI 提问</label>
        <textarea
          ref={inputRef}
          id="ai-question"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="不懂就问，例如：为什么这里要用 WeakMap？"
          rows={3}
          disabled={isLoading}
        />
        <button type="submit" disabled={!draft.trim() || isLoading}>
          {isLoading ? <LoaderCircle aria-hidden="true" /> : <CornerDownLeft aria-hidden="true" />}
          发送
        </button>
      </form>
      <p className="ai-assistant__hint">Ctrl / Cmd + Enter 发送。问题正文会发送到你配置的 AI 服务，密钥始终留在服务端。</p>
    </section>
  )
}
