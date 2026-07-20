import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { InterviewQuestion } from '../types'
import { Reader } from './Reader'

class ResizeObserverMock {
  private readonly callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
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

function renderReader(question = firstQuestion) {
  const props = {
    question,
    annotations: [],
    readingSize: 'comfortable' as const,
    pageLayout: 'single' as const,
    initialScrollTop: 0,
    initialSpreadIndex: 0,
    onSelection: vi.fn(),
    onAnnotationClick: vi.fn(),
    onScrollPosition: vi.fn(),
    onSpreadChange: vi.fn(),
    onSpreadAvailabilityChange: vi.fn(),
  }
  return { ...render(<Reader {...props} />), props }
}

beforeEach(() => {
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
  vi.unstubAllGlobals()
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
    expect(document.getElementById('learning-section-answer')).toHaveAttribute('tabindex', '-1')

    fireEvent.click(answerLink)
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()
    expect(document.activeElement).toBe(document.getElementById('learning-section-answer'))
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
