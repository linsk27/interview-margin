import { Children, isValidElement, useEffect, useRef, useState } from 'react'
import { Check, Copy, Highlighter, Link as LinkIcon } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import type { Annotation, InterviewQuestion, ReadingSize, SelectionDraft } from '../types'
import { rehypeAnnotationMarks } from '../lib/annotationPlugin'

interface ReaderProps {
  question: InterviewQuestion
  annotations: Annotation[]
  readingSize: ReadingSize
  initialScrollTop: number
  onSelection: (selection?: SelectionDraft) => void
  onAnnotationClick: (annotationId: string) => void
  onScrollPosition: (scrollTop: number) => void
}

function textFromNode(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textFromNode).join('')
  if (isValidElement<{ children?: React.ReactNode }>(node)) return textFromNode(node.props.children)
  return ''
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false)
  const code = textFromNode(children).replace(/\n$/, '')
  const languageElement = Children.toArray(children).find(isValidElement) as React.ReactElement<{ className?: string }> | undefined
  const language = languageElement?.props.className?.replace(/^language-/, '') || 'code'

  const copy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2200)
  }

  return (
    <figure className="code-block">
      <figcaption>
        <span>{language}</span>
        <button type="button" onClick={copy} aria-label="复制代码" title="复制代码">
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          <span>{copied ? '已复制' : '复制'}</span>
        </button>
      </figcaption>
      <pre>{children}</pre>
    </figure>
  )
}

export function Reader({
  question,
  annotations,
  readingSize,
  initialScrollTop,
  onSelection,
  onAnnotationClick,
  onScrollPosition,
}: ReaderProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const articleRef = useRef<HTMLElement>(null)
  const scrollTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    container.scrollTop = initialScrollTop
  }, [question.id, initialScrollTop])

  const captureSelection = () => {
    window.requestAnimationFrame(() => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed || !selection.rangeCount) {
        onSelection(undefined)
        return
      }
      const range = selection.getRangeAt(0)
      const node = range.commonAncestorContainer
      if (!articleRef.current?.contains(node.nodeType === Node.TEXT_NODE ? node.parentNode : node)) return
      const quote = selection.toString().replace(/\s+/g, ' ').trim().slice(0, 360)
      if (quote.length < 2) return
      const rect = range.getBoundingClientRect()
      const x = Math.min(window.innerWidth - 132, Math.max(132, rect.left + rect.width / 2))
      const y = Math.min(window.innerHeight - 72, Math.max(8, rect.bottom + 10))
      onSelection({ quote, x, y })
    })
  }

  const handleScroll = () => {
    window.clearTimeout(scrollTimer.current)
    scrollTimer.current = window.setTimeout(() => {
      onScrollPosition(scrollRef.current?.scrollTop ?? 0)
    }, 180)
    onSelection(undefined)
  }

  const handleArticleClick = (event: React.MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement
    const mark = target.closest<HTMLElement>('[data-annotation-id]')
    if (mark?.dataset.annotationId) onAnnotationClick(mark.dataset.annotationId)
  }

  return (
    <div className="reader-scroll" ref={scrollRef} onScroll={handleScroll}>
      <main className={`reader reader--${readingSize}`}>
        <header className="reader__header">
          <div className="reader__index">Q{question.number.padStart(2, '0')}</div>
          <div className="reader__heading">
            <p className="reader__section">{question.sectionTitle}</p>
            <h2>{question.title.replace(/^Q[\d.]+[：:]?\s*/, '')}</h2>
            <div className="reader__meta">
              <span>{question.readMinutes} 分钟阅读</span>
              {question.tags.map((tag) => <span key={tag}>{tag}</span>)}
            </div>
          </div>
        </header>

        <article
          ref={articleRef}
          className="markdown-body"
          onMouseUp={captureSelection}
          onTouchEnd={captureSelection}
          onClick={handleArticleClick}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[
              rehypeHighlight,
              [rehypeAnnotationMarks, { annotations }],
            ]}
            components={{
              pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
              table: ({ children }) => <div className="table-wrap"><table>{children}</table></div>,
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noreferrer">
                  {children}<LinkIcon aria-hidden="true" />
                </a>
              ),
              blockquote: ({ children }) => <blockquote><Highlighter aria-hidden="true" />{children}</blockquote>,
              code: ({ className, children, ...props }) => (
                <code className={className} {...props}>{children}</code>
              ),
              mark: ({ children, ...props }) => <mark {...props}>{children}</mark>,
            }}
          >
            {question.body}
          </ReactMarkdown>
        </article>
      </main>
    </div>
  )
}
