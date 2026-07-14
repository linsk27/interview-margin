import { Children, isValidElement, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BookOpen, Check, ChevronLeft, ChevronRight, Copy, Highlighter, Link as LinkIcon } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import type { Annotation, InterviewQuestion, PageLayout, ReadingSize, SelectionDraft } from '../types'
import { rehypeAnnotationMarks } from '../lib/annotationPlugin'
import {
  calculateSpreadGeometry,
  canUseSpread,
  clampSpreadIndex,
  shouldUseSpread,
  spreadLabel,
  spreadTranslation,
  type SpreadGeometry,
} from '../lib/spreadPagination'

interface ReaderProps {
  question: InterviewQuestion
  annotations: Annotation[]
  readingSize: ReadingSize
  pageLayout: PageLayout
  initialScrollTop: number
  initialSpreadIndex: number
  onSelection: (selection?: SelectionDraft) => void
  onAnnotationClick: (annotationId: string) => void
  onScrollPosition: (scrollTop: number) => void
  onSpreadChange: (spreadIndex: number) => void
  onSpreadAvailabilityChange: (available: boolean) => void
}

type TurnDirection = 'previous' | 'next'

const PAGE_TURN_MS = 760
const PAGE_TURN_COMMIT_MS = PAGE_TURN_MS / 2
const PAGE_TURN_LOCK_MS = PAGE_TURN_MS + 60
const DEFAULT_GEOMETRY: SpreadGeometry = {
  pageWidth: 1,
  pageCount: 2,
  spreadCount: 1,
  spreadStep: 1,
}

function positionSpreadFlow(flow: HTMLDivElement, index: number, geometry: SpreadGeometry) {
  flow.style.transform = `translate3d(${spreadTranslation(index, geometry)}px, 0, 0)`
}

function clearSpreadSnapshot(layer: HTMLDivElement | null) {
  if (!layer) return
  layer.replaceChildren()
  layer.classList.remove('is-active')
  layer.removeAttribute('style')
}

function captureSpreadSnapshot(layer: HTMLDivElement | null, flow: HTMLDivElement | null) {
  if (!layer || !flow) return

  const clone = flow.cloneNode(true) as HTMLDivElement
  clone.classList.remove('is-turning')
  clone.classList.add('reader__flow--snapshot')
  clone.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'))
  clone.querySelectorAll<HTMLElement>('a, button, input, textarea, select, [tabindex]').forEach((element) => {
    element.tabIndex = -1
  })

  layer.style.left = `${flow.offsetLeft}px`
  layer.style.top = `${flow.offsetTop}px`
  layer.style.width = `${flow.offsetWidth}px`
  layer.style.height = `${flow.offsetHeight}px`
  layer.replaceChildren(clone)
  layer.classList.add('is-active')
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
  pageLayout,
  initialScrollTop,
  initialSpreadIndex,
  onSelection,
  onAnnotationClick,
  onScrollPosition,
  onSpreadChange,
  onSpreadAvailabilityChange,
}: ReaderProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const flowRef = useRef<HTMLDivElement>(null)
  const snapshotLayerRef = useRef<HTMLDivElement>(null)
  const articleRef = useRef<HTMLElement>(null)
  const scrollTimer = useRef<number | undefined>(undefined)
  const turnCommitTimer = useRef<number | undefined>(undefined)
  const turnEndTimer = useRef<number | undefined>(undefined)
  const turnLocked = useRef(false)
  const spreadIndexRef = useRef(initialSpreadIndex)
  const onSpreadChangeRef = useRef(onSpreadChange)
  const onSpreadAvailabilityChangeRef = useRef(onSpreadAvailabilityChange)
  const [spreadMode, setSpreadMode] = useState(false)
  const [spreadIndex, setSpreadIndex] = useState(initialSpreadIndex)
  const [geometry, setGeometry] = useState<SpreadGeometry>(DEFAULT_GEOMETRY)
  const [turnDirection, setTurnDirection] = useState<TurnDirection>()

  useEffect(() => {
    onSpreadChangeRef.current = onSpreadChange
  }, [onSpreadChange])

  useEffect(() => {
    onSpreadAvailabilityChangeRef.current = onSpreadAvailabilityChange
  }, [onSpreadAvailabilityChange])

  useLayoutEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const updateMode = () => {
      const available = canUseSpread(container.clientWidth, container.clientHeight)
      onSpreadAvailabilityChangeRef.current(available)
      setSpreadMode(shouldUseSpread(pageLayout, container.clientWidth, container.clientHeight))
    }

    updateMode()
    const observer = new ResizeObserver(updateMode)
    observer.observe(container)
    return () => observer.disconnect()
  }, [pageLayout])

  useEffect(() => {
    window.clearTimeout(turnCommitTimer.current)
    window.clearTimeout(turnEndTimer.current)
    turnLocked.current = false
    setTurnDirection(undefined)
    clearSpreadSnapshot(snapshotLayerRef.current)
    spreadIndexRef.current = initialSpreadIndex
    setSpreadIndex(initialSpreadIndex)
  }, [question.id])

  useEffect(() => {
    if (spreadMode) return
    window.clearTimeout(turnCommitTimer.current)
    window.clearTimeout(turnEndTimer.current)
    turnLocked.current = false
    setTurnDirection(undefined)
    clearSpreadSnapshot(snapshotLayerRef.current)
  }, [spreadMode])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    container.scrollTop = spreadMode ? 0 : initialScrollTop
  }, [question.id, initialScrollTop, spreadMode])

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    const flow = flowRef.current
    if (!viewport || !flow) return

    if (!spreadMode) {
      flow.style.removeProperty('column-width')
      flow.style.removeProperty('transform')
      viewport.scrollLeft = 0
      setGeometry(DEFAULT_GEOMETRY)
      return
    }

    let frame = 0
    const measure = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        const contentWidth = flow.clientWidth
        if (!contentWidth) return

        const computedGap = Number.parseFloat(window.getComputedStyle(flow).columnGap)
        const gap = Number.isFinite(computedGap) ? computedGap : 64
        const pageWidth = Math.max(1, (contentWidth - gap) / 2)
        flow.style.columnWidth = `${pageWidth}px`
        void flow.offsetWidth

        const nextGeometry = calculateSpreadGeometry(contentWidth, flow.scrollWidth, gap)
        setGeometry((current) => (
          current.pageWidth === nextGeometry.pageWidth
          && current.pageCount === nextGeometry.pageCount
          && current.spreadStep === nextGeometry.spreadStep
            ? current
            : nextGeometry
        ))

        const nextIndex = clampSpreadIndex(spreadIndexRef.current, nextGeometry.spreadCount)
        // Native scrollLeft clamps before padded or odd final pages. Move the
        // column flow directly so each spread always starts on an exact page.
        viewport.scrollLeft = 0
        positionSpreadFlow(flow, nextIndex, nextGeometry)
        if (nextIndex !== spreadIndexRef.current) {
          spreadIndexRef.current = nextIndex
          setSpreadIndex(nextIndex)
          onSpreadChangeRef.current(nextIndex)
        }
      })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    void document.fonts?.ready.then(measure)

    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [annotations.length, question.id, readingSize, spreadMode])

  useEffect(() => () => {
    window.clearTimeout(scrollTimer.current)
    window.clearTimeout(turnCommitTimer.current)
    window.clearTimeout(turnEndTimer.current)
    clearSpreadSnapshot(snapshotLayerRef.current)
  }, [])

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
    if (spreadMode) return
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

  const applySpread = (target: number) => {
    const nextIndex = clampSpreadIndex(target, geometry.spreadCount)
    if (viewportRef.current) viewportRef.current.scrollLeft = 0
    if (flowRef.current) positionSpreadFlow(flowRef.current, nextIndex, geometry)
    spreadIndexRef.current = nextIndex
    setSpreadIndex(nextIndex)
    onSpreadChangeRef.current(nextIndex)
  }

  const turnSpread = (direction: TurnDirection) => {
    if (!spreadMode || turnLocked.current) return
    const target = spreadIndex + (direction === 'next' ? 1 : -1)
    const nextIndex = clampSpreadIndex(target, geometry.spreadCount)
    if (nextIndex === spreadIndex) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    turnLocked.current = true
    window.clearTimeout(turnCommitTimer.current)
    window.clearTimeout(turnEndTimer.current)

    if (reduceMotion) {
      applySpread(nextIndex)
      turnEndTimer.current = window.setTimeout(() => { turnLocked.current = false }, 180)
      return
    }

    captureSpreadSnapshot(snapshotLayerRef.current, flowRef.current)
    setTurnDirection(direction)
    turnCommitTimer.current = window.setTimeout(() => applySpread(nextIndex), PAGE_TURN_COMMIT_MS)
    turnEndTimer.current = window.setTimeout(() => {
      turnLocked.current = false
      setTurnDirection(undefined)
      clearSpreadSnapshot(snapshotLayerRef.current)
    }, PAGE_TURN_LOCK_MS)
  }

  const handleSpreadWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!spreadMode || (event.target as HTMLElement).closest('.code-block pre, .table-wrap')) return
    const intent = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX
    if (Math.abs(intent) < 24) return
    event.preventDefault()
    turnSpread(intent > 0 ? 'next' : 'previous')
  }

  const handleSpreadKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!spreadMode || (event.target as HTMLElement).closest('button, a, input, textarea')) return
    if (event.key !== 'PageDown' && event.key !== 'PageUp') return
    event.preventDefault()
    turnSpread(event.key === 'PageDown' ? 'next' : 'previous')
  }

  return (
    <div className={`reader-scroll${spreadMode ? ' is-spread-mode' : ''}`} ref={scrollRef} onScroll={handleScroll}>
      <main className={`reader reader--${readingSize}${spreadMode ? ' reader--spread' : ''}`}>
        <div
          className="reader__viewport"
          ref={viewportRef}
          onWheel={handleSpreadWheel}
          onKeyDown={handleSpreadKeyDown}
          tabIndex={spreadMode ? 0 : undefined}
          aria-label={spreadMode ? '双页阅读区，可使用 Page Up 和 Page Down 翻页' : undefined}
          aria-busy={Boolean(turnDirection)}
          data-spread-index={spreadMode ? spreadIndex : undefined}
        >
          <div className={`reader__flow${turnDirection ? ' is-turning' : ''}`} ref={flowRef}>
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
          </div>

          <div className="reader__snapshot-layer" ref={snapshotLayerRef} aria-hidden="true" />

          {turnDirection && (
            <>
              <span className={`reader__turn-shadow reader__turn-shadow--${turnDirection}`} aria-hidden="true" />
              <span className={`reader__turn-sheet reader__turn-sheet--${turnDirection}`} aria-hidden="true" />
            </>
          )}
        </div>

        {spreadMode && (
          <nav className="reader__pagination" aria-label="双页阅读导航">
            <span className="reader__pagination-mode"><BookOpen aria-hidden="true" />双页</span>
            <button
              type="button"
              onClick={() => turnSpread('previous')}
              disabled={spreadIndex === 0 || Boolean(turnDirection)}
              aria-label="上一组页面"
              title="上一组页面（Page Up）"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <span className="reader__pagination-count" aria-live="polite">{spreadLabel(spreadIndex, geometry.pageCount)}</span>
            <button
              type="button"
              onClick={() => turnSpread('next')}
              disabled={spreadIndex >= geometry.spreadCount - 1 || Boolean(turnDirection)}
              aria-label="下一组页面"
              title="下一组页面（Page Down）"
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </nav>
        )}
      </main>
    </div>
  )
}
