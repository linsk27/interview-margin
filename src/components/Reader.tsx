import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import { domToCanvas } from 'modern-screenshot'
import type { Annotation, InterviewQuestion, PageLayout, ReadingSize, SelectionDraft } from '../types'
import { QuestionMarkdown } from './QuestionMarkdown'
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
const PAGE_TURN_FALLBACK_MS = PAGE_TURN_MS + 600
const SNAPSHOT_STYLE_PROPERTIES = [
  'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index',
  'box-sizing', 'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
  'background-color', 'background-image', 'background-position', 'background-size', 'background-repeat',
  'box-shadow', 'opacity', 'visibility', 'overflow', 'overflow-x', 'overflow-y',
  'color', '-webkit-text-fill-color', 'font-family', 'font-size', 'font-style', 'font-weight',
  'font-variant-numeric', 'font-feature-settings', 'line-height', 'letter-spacing',
  'text-align', 'text-decoration-color', 'text-decoration-line', 'text-decoration-style',
  'text-indent', 'text-overflow', 'text-shadow', 'text-transform',
  'white-space', 'word-break', 'overflow-wrap', 'tab-size', 'vertical-align',
  'list-style-image', 'list-style-position', 'list-style-type',
  'grid-template-columns', 'grid-template-rows', 'grid-auto-flow', 'grid-column', 'grid-row',
  'align-items', 'align-content', 'align-self', 'justify-content', 'justify-items', 'justify-self',
  'flex', 'flex-basis', 'flex-direction', 'flex-grow', 'flex-shrink', 'flex-wrap',
  'gap', 'row-gap', 'column-gap',
  'column-count', 'column-fill', 'column-rule', 'column-width',
  'break-before', 'break-after', 'break-inside', 'orphans', 'widows',
  'transform', 'transform-origin', 'clip-path', 'object-fit', 'object-position',
  'fill', 'stroke', 'stroke-width',
]
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
  layer.className = 'reader__snapshot-layer'
}

function isSnapshotLayer(node: Node) {
  return node.nodeType === Node.ELEMENT_NODE
    && (node as Element).classList.contains('reader__snapshot-layer')
}

async function captureViewport(viewport: HTMLDivElement) {
  return domToCanvas(viewport, {
    scale: 1,
    backgroundColor: window.getComputedStyle(viewport).backgroundColor,
    filter: (node) => !isSnapshotLayer(node),
    // The reader already has its fonts loaded. Re-embedding every segmented
    // CJK font file makes a transient page-turn snapshot unnecessarily slow.
    font: false,
    includeStyleProperties: SNAPSHOT_STYLE_PROPERTIES,
    features: {
      copyScrollbar: false,
      removeAbnormalAttributes: true,
      removeControlCharacter: true,
      fixSvgXmlDecode: true,
      restoreScrollPosition: true,
    },
    timeout: 8000,
  })
}

function createCanvasSlice(source: HTMLCanvasElement, side: 'left' | 'right') {
  const split = Math.floor(source.width / 2)
  const sourceX = side === 'left' ? 0 : split
  const sourceWidth = side === 'left' ? split : source.width - split
  const canvas = document.createElement('canvas')
  canvas.width = sourceWidth
  canvas.height = source.height
  canvas.className = 'reader__snapshot-canvas'
  canvas.getContext('2d')?.drawImage(
    source,
    sourceX,
    0,
    sourceWidth,
    source.height,
    0,
    0,
    sourceWidth,
    source.height,
  )
  return canvas
}

function showSnapshotCover(layer: HTMLDivElement, snapshot: HTMLCanvasElement) {
  snapshot.className = 'reader__snapshot-cover'
  layer.className = 'reader__snapshot-layer is-active is-capturing'
  layer.replaceChildren(snapshot)
}

function createSpreadFlip(
  layer: HTMLDivElement,
  previousSnapshot: HTMLCanvasElement,
  nextSnapshot: HTMLCanvasElement,
  direction: TurnDirection,
) {
  const staticSide = direction === 'next' ? 'left' : 'right'
  const movingOldSide = direction === 'next' ? 'right' : 'left'
  const movingNewSide = direction === 'next' ? 'left' : 'right'

  const staticHalf = document.createElement('div')
  staticHalf.className = 'reader__flip-static'
  staticHalf.append(createCanvasSlice(previousSnapshot, staticSide))

  const sheet = document.createElement('div')
  sheet.className = 'reader__flip-sheet'

  const front = document.createElement('div')
  front.className = 'reader__flip-face reader__flip-face--front'
  front.append(createCanvasSlice(previousSnapshot, movingOldSide))

  const back = document.createElement('div')
  back.className = 'reader__flip-face reader__flip-face--back'
  back.append(createCanvasSlice(nextSnapshot, movingNewSide))

  sheet.append(front, back)

  layer.className = `reader__snapshot-layer reader__snapshot-layer--${direction} is-active`
  layer.replaceChildren(staticHalf, sheet)
  return sheet
}

function waitForPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()))
  })
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
  const turnStartFrame = useRef<number | undefined>(undefined)
  const turnEndTimer = useRef<number | undefined>(undefined)
  const turnSequence = useRef(0)
  const turnLocked = useRef(false)
  const spreadIndexRef = useRef(initialSpreadIndex)
  const onSpreadChangeRef = useRef(onSpreadChange)
  const onSpreadAvailabilityChangeRef = useRef(onSpreadAvailabilityChange)
  const [spreadMode, setSpreadMode] = useState(false)
  const [spreadIndex, setSpreadIndex] = useState(initialSpreadIndex)
  const [geometry, setGeometry] = useState<SpreadGeometry>(DEFAULT_GEOMETRY)
  const [turnDirection, setTurnDirection] = useState<TurnDirection>()
  const [contentRevision, setContentRevision] = useState(0)

  const handleDiagramSettled = useCallback(() => {
    setContentRevision((current) => current + 1)
  }, [])

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
    turnSequence.current += 1
    window.cancelAnimationFrame(turnStartFrame.current ?? 0)
    window.clearTimeout(turnEndTimer.current)
    turnLocked.current = false
    setTurnDirection(undefined)
    clearSpreadSnapshot(snapshotLayerRef.current)
    spreadIndexRef.current = initialSpreadIndex
    setSpreadIndex(initialSpreadIndex)
  }, [question.id])

  useEffect(() => {
    if (spreadMode) return
    turnSequence.current += 1
    window.cancelAnimationFrame(turnStartFrame.current ?? 0)
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
    observer.observe(flow)
    void document.fonts?.ready.then(measure)

    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [annotations.length, contentRevision, question.id, readingSize, spreadMode])

  useEffect(() => () => {
    turnSequence.current += 1
    window.clearTimeout(scrollTimer.current)
    window.cancelAnimationFrame(turnStartFrame.current ?? 0)
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

  const finishSpreadTurn = (sequence?: number) => {
    if (sequence !== undefined && sequence !== turnSequence.current) return
    window.cancelAnimationFrame(turnStartFrame.current ?? 0)
    window.clearTimeout(turnEndTimer.current)
    turnLocked.current = false
    setTurnDirection(undefined)
    clearSpreadSnapshot(snapshotLayerRef.current)
  }

  const turnSpread = async (direction: TurnDirection) => {
    if (!spreadMode || turnLocked.current) return
    const currentIndex = spreadIndexRef.current
    const target = currentIndex + (direction === 'next' ? 1 : -1)
    const nextIndex = clampSpreadIndex(target, geometry.spreadCount)
    if (nextIndex === currentIndex) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const sequence = ++turnSequence.current
    turnLocked.current = true
    window.cancelAnimationFrame(turnStartFrame.current ?? 0)
    window.clearTimeout(turnEndTimer.current)

    if (reduceMotion) {
      applySpread(nextIndex)
      turnEndTimer.current = window.setTimeout(() => { turnLocked.current = false }, 180)
      return
    }

    setTurnDirection(direction)
    let spreadApplied = false

    try {
      const viewport = viewportRef.current
      const layer = snapshotLayerRef.current
      if (!viewport || !layer) throw new Error('Reader spread is not mounted')

      const viewportWidth = viewport.clientWidth
      const viewportHeight = viewport.clientHeight
      const previousSnapshot = await captureViewport(viewport)
      if (sequence !== turnSequence.current) return

      showSnapshotCover(layer, previousSnapshot)
      applySpread(nextIndex)
      spreadApplied = true
      await waitForPaint()
      if (sequence !== turnSequence.current) return
      if (viewport.clientWidth !== viewportWidth || viewport.clientHeight !== viewportHeight) {
        throw new Error('Reader resized during page capture')
      }

      const nextSnapshot = await captureViewport(viewport)
      if (sequence !== turnSequence.current) return
      if (viewport.clientWidth !== viewportWidth || viewport.clientHeight !== viewportHeight) {
        throw new Error('Reader resized during page capture')
      }
      const animationTarget = createSpreadFlip(layer, previousSnapshot, nextSnapshot, direction)

      const handleAnimationEnd = (event: AnimationEvent) => {
        if (event.target !== animationTarget || !event.animationName.startsWith('reader-page-turn-raster-')) return
        animationTarget.removeEventListener('animationend', handleAnimationEnd)
        finishSpreadTurn(sequence)
      }
      animationTarget.addEventListener('animationend', handleAnimationEnd)

      void animationTarget.offsetWidth
      turnStartFrame.current = window.requestAnimationFrame(() => {
        if (sequence === turnSequence.current) layer.classList.add('is-animating')
      })
      turnEndTimer.current = window.setTimeout(() => finishSpreadTurn(sequence), PAGE_TURN_FALLBACK_MS)
    } catch (error) {
      if (sequence !== turnSequence.current) return
      if (!spreadApplied) applySpread(nextIndex)
      console.warn('Page-turn snapshot failed; using an immediate page change.', error)
      finishSpreadTurn(sequence)
    }
  }

  const handleSpreadWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!spreadMode || (event.target as HTMLElement).closest('.code-block pre, .table-wrap')) return
    const intent = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX
    if (Math.abs(intent) < 24) return
    event.preventDefault()
    void turnSpread(intent > 0 ? 'next' : 'previous')
  }

  const handleSpreadKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!spreadMode || (event.target as HTMLElement).closest('button, a, input, textarea')) return
    if (event.key !== 'PageDown' && event.key !== 'PageUp') return
    event.preventDefault()
    void turnSpread(event.key === 'PageDown' ? 'next' : 'previous')
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
          <div className="reader__flow" ref={flowRef}>
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
              <QuestionMarkdown
                annotations={annotations}
                imageLoading={spreadMode ? 'eager' : 'lazy'}
                onDiagramSettled={handleDiagramSettled}
              >
                {question.body}
              </QuestionMarkdown>
            </article>
          </div>

          <div className="reader__snapshot-layer" ref={snapshotLayerRef} aria-hidden="true" />
        </div>

        {spreadMode && (
          <nav className="reader__pagination" aria-label="双页阅读导航">
            <span className="reader__pagination-mode"><BookOpen aria-hidden="true" />双页</span>
            <button
              type="button"
              onClick={() => void turnSpread('previous')}
              disabled={spreadIndex === 0 || Boolean(turnDirection)}
              aria-label="上一组页面"
              title="上一组页面（Page Up）"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <span className="reader__pagination-count" aria-live="polite">{spreadLabel(spreadIndex, geometry.pageCount)}</span>
            <button
              type="button"
              onClick={() => void turnSpread('next')}
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
