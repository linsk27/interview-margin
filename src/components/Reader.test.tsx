import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { InterviewQuestion } from '../types'
import { Reader } from './Reader'

class ResizeObserverMock {
  static instanceCount = 0
  private readonly callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    ResizeObserverMock.instanceCount += 1
    this.callback = callback
  }

  observe() {
    this.callback([], this as unknown as ResizeObserver)
  }

  disconnect() {}
  unobserve() {}
}

const firstQuestion: InterviewQuestion = {
  id: 'reader-question-1',
  library: 'reader-bank',
  number: '1',
  title: 'Q1：Vue 响应式如何工作？',
  body: [
    '**短回答：**',
    '',
    '通过代理读取和写入来追踪依赖。',
    '',
    '**关键术语翻译：**',
    '',
    '- track：收集依赖。',
    '',
    '**原理 / 流程：**',
    '',
    '读取时记录副作用，写入时重新调度。',
    '',
    '**代码 / 场景：**',
    '',
    '在组件渲染中读取响应式状态。',
    '',
    '**递进追问：**',
    '',
    '1. 如何清理失效依赖？',
    '',
    '**易错点：**',
    '',
    '- 不要把代理等同于深拷贝。',
    '',
    '**参考来源：**',
    '',
    '- Vue 官方文档',
  ].join('\n'),
  plainText: 'Vue 响应式如何工作',
  sectionId: 'reader-section',
  sectionTitle: 'Part 1：前端框架',
  tags: ['Vue', '响应式', '源码', '依赖追踪'],
  readMinutes: 6,
  order: 0,
}

const secondQuestion: InterviewQuestion = {
  ...firstQuestion,
  id: 'reader-question-2',
  number: '2',
  title: 'Q2：React 为什么需要 key？',
}

function renderReader(
  question = firstQuestion,
  overrides: Partial<Parameters<typeof Reader>[0]> = {},
) {
  const props = {
    question,
    annotations: [],
    fontTheme: 'clean' as const,
    readingSize: 'comfortable' as const,
    pageLayout: 'single' as const,
    initialScrollTop: 0,
    initialSpreadIndex: 0,
    onSelection: vi.fn(),
    onAnnotationClick: vi.fn(),
    onScrollPosition: vi.fn(),
    onSpreadChange: vi.fn(),
    onSpreadAvailabilityChange: vi.fn(),
    ...overrides,
  }
  return { ...render(<Reader {...props} />), props }
}

beforeEach(() => {
  ResizeObserverMock.instanceCount = 0
  vi.stubGlobal('ResizeObserver', ResizeObserverMock)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  })
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Reader learning document structure', () => {
  it('labels the article from a stable focusable title and exposes real learning anchors', () => {
    renderReader()

    const title = screen.getByRole('heading', { level: 2, name: 'Vue 响应式如何工作？' })
    expect(title).toHaveAttribute('id', 'reader-title-reader-question-1')
    expect(title).toHaveAttribute('tabindex', '-1')
    expect(document.querySelector('article.markdown-body')).toHaveAttribute('aria-labelledby', title.id)

    const answerLink = screen.getByRole('button', { name: /速答/ })
    expect(answerLink).toHaveAttribute('aria-controls', 'learning-section-answer')
    expect(answerLink).toHaveAttribute('data-learning-kind', 'answer')
    expect(answerLink).toHaveAttribute('aria-current', 'location')
    expect(document.getElementById('learning-section-answer')).toHaveAttribute('tabindex', '-1')

    fireEvent.click(answerLink)
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()
    expect(document.activeElement).toBe(document.getElementById('learning-section-answer'))
  })

  it('moves the current learning location when a different outline item is selected', () => {
    renderReader()

    const answerLink = screen.getByRole('button', { name: /速答/ })
    const mechanismLink = screen.getByRole('button', { name: /原理/ })

    expect(answerLink).toHaveAttribute('aria-current', 'location')
    expect(mechanismLink).not.toHaveAttribute('aria-current')

    fireEvent.click(mechanismLink)

    expect(answerLink).not.toHaveAttribute('aria-current')
    expect(mechanismLink).toHaveAttribute('aria-current', 'location')
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()
    expect(document.activeElement).toBe(document.getElementById('learning-section-mechanism'))
  })

  it('scrolls the active learning link horizontally into the nearest visible position', () => {
    renderReader()
    const mechanismLink = document.querySelector<HTMLButtonElement>(
      'button[aria-controls="learning-section-mechanism"]',
    )
    expect(mechanismLink).not.toBeNull()
    if (!mechanismLink) return

    const scrollLinkIntoView = vi.fn()
    Object.defineProperty(mechanismLink, 'scrollIntoView', {
      configurable: true,
      value: scrollLinkIntoView,
    })

    fireEvent.click(mechanismLink)

    expect(scrollLinkIntoView).toHaveBeenCalledWith({
      block: 'nearest',
      inline: 'nearest',
    })
  })

  it('cancels a pending scroll-position save when the question changes', () => {
    vi.useFakeTimers()
    const saveFirstQuestionScroll = vi.fn()
    const saveSecondQuestionScroll = vi.fn()
    const { props, rerender } = renderReader(firstQuestion, {
      onScrollPosition: saveFirstQuestionScroll,
    })
    const scroller = document.querySelector<HTMLDivElement>('.reader-scroll')
    expect(scroller).not.toBeNull()
    if (!scroller) return

    Object.defineProperty(scroller, 'scrollTop', {
      configurable: true,
      writable: true,
      value: 420,
    })
    fireEvent.scroll(scroller)

    rerender(
      <Reader
        {...props}
        question={secondQuestion}
        initialScrollTop={0}
        onScrollPosition={saveSecondQuestionScroll}
      />,
    )
    act(() => vi.advanceTimersByTime(200))

    expect(saveFirstQuestionScroll).not.toHaveBeenCalled()
    expect(saveSecondQuestionScroll).not.toHaveBeenCalled()
  })

  it('ignores a queued scroll-spy frame from the previous question', () => {
    let nextFrameId = 0
    const frames = new Map<number, FrameRequestCallback>()
    const cancelFrame = vi.fn((frameId: number) => frames.delete(frameId))
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      nextFrameId += 1
      frames.set(nextFrameId, callback)
      return nextFrameId
    }))
    vi.stubGlobal('cancelAnimationFrame', cancelFrame)

    const blocks = firstQuestion.body.split('\n\n')
    const answerOnlyQuestion = {
      ...firstQuestion,
      body: blocks.slice(0, 2).join('\n\n'),
    }
    const mechanismOnlyQuestion = {
      ...secondQuestion,
      body: blocks.slice(4, 6).join('\n\n'),
    }
    const { props, rerender } = renderReader(answerOnlyQuestion)
    const scroller = document.querySelector<HTMLDivElement>('.reader-scroll')
    expect(scroller).not.toBeNull()
    if (!scroller) return

    fireEvent.scroll(scroller)
    const staleFrameId = nextFrameId
    const staleFrame = frames.get(staleFrameId)
    expect(staleFrame).toBeDefined()

    rerender(<Reader {...props} question={mechanismOnlyQuestion} />)
    expect(cancelFrame).toHaveBeenCalledWith(staleFrameId)
    expect(document.querySelector(
      'button[aria-controls="learning-section-mechanism"]',
    )).toHaveAttribute('aria-current', 'location')

    act(() => staleFrame?.(0))

    expect(document.querySelector(
      'button[aria-controls="learning-section-mechanism"]',
    )).toHaveAttribute('aria-current', 'location')
    expect(document.querySelector(
      'button[aria-controls="learning-section-answer"]',
    )).toBeNull()
  })

  it('opens a collapsed source section when its outline item is selected', () => {
    renderReader()

    const answerLink = screen.getByRole('button', { name: /速答/ })
    const sourcesLink = screen.getByRole('button', { name: /来源/ })
    const sourcesSection = document.getElementById('learning-section-sources')
    const sourcesDetails = sourcesSection?.querySelector('details')

    expect(sourcesDetails).toBeInstanceOf(HTMLDetailsElement)
    expect(sourcesDetails).not.toHaveAttribute('open')
    fireEvent.click(sourcesLink)

    expect(answerLink).not.toHaveAttribute('aria-current')
    expect(sourcesLink).toHaveAttribute('aria-current', 'location')
    expect(sourcesDetails).toHaveAttribute('open')
    expect(document.activeElement).toBe(sourcesSection)
  })

  it('remeasures spread geometry when a learning disclosure is toggled', () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains('reader-scroll')) return 1200
      if (this.classList.contains('reader__flow')) return 1000
      return 0
    })
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('reader-scroll') ? 800 : 0
    })
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('reader__flow') ? 2400 : 0
    })

    const { props } = renderReader(firstQuestion, { pageLayout: 'spread' })
    const sourcesDetails = document
      .getElementById('learning-section-sources')
      ?.querySelector<HTMLDetailsElement>('details')

    expect(props.onSpreadAvailabilityChange).toHaveBeenCalledWith(true)
    expect(sourcesDetails).toBeInstanceOf(HTMLDetailsElement)
    if (!sourcesDetails) return

    const observerCountBeforeToggle = ResizeObserverMock.instanceCount
    sourcesDetails.open = true
    fireEvent(sourcesDetails, new Event('toggle'))

    expect(ResizeObserverMock.instanceCount).toBeGreaterThan(observerCountBeforeToggle)
  })

  it('focuses the new question title without putting it in the tab order', () => {
    const { rerender, props } = renderReader()
    rerender(<Reader {...props} question={secondQuestion} />)

    const nextTitle = screen.getByRole('heading', { level: 2, name: 'React 为什么需要 key？' })
    expect(nextTitle).toHaveFocus()
    expect(nextTitle).toHaveAttribute('tabindex', '-1')
  })

  it('derives the single-page reading progress from the reader scroll position', () => {
    renderReader()
    const scroller = document.querySelector<HTMLDivElement>('.reader-scroll')
    expect(scroller).not.toBeNull()
    if (!scroller) return

    Object.defineProperties(scroller, {
      clientHeight: { configurable: true, value: 400 },
      scrollHeight: { configurable: true, value: 1200 },
      scrollTop: { configurable: true, writable: true, value: 400 },
    })
    fireEvent.scroll(scroller)

    expect(screen.getByRole('progressbar', { name: '本题阅读进度 50%' })).toHaveValue(50)
    expect(screen.getByText('50%')).toBeInTheDocument()
  })
})
