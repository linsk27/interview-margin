import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { InterviewQuestion } from './types'

const apiMocks = vi.hoisted(() => ({
  getCatalog: vi.fn(),
  getSession: vi.fn(),
  getMyState: vi.fn(),
  saveMyState: vi.fn(),
}))

const outboxMocks = vi.hoisted(() => ({
  clearQueuedState: vi.fn(),
  flushQueuedState: vi.fn(),
  queueStudyState: vi.fn(),
}))

vi.mock('./lib/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('./lib/api')>(),
  ...apiMocks,
}))

vi.mock('./lib/outbox', () => outboxMocks)

vi.mock('./components/AuthDialog', () => ({
  AuthDialog: ({ open, reason, onClose }: { open: boolean; reason?: string; onClose: () => void }) => (
    open ? (
      <section role="dialog" aria-label="登录学习账号">
        <p data-testid="auth-reason">{reason ?? ''}</p>
        <button type="button" onClick={onClose}>关闭登录</button>
      </section>
    ) : null
  ),
}))

vi.mock('./components/Reader', () => ({
  Reader: ({
    question,
    onScrollPosition,
    onSpreadChange,
    onSelection,
  }: {
    question: InterviewQuestion
    onScrollPosition: (scrollTop: number) => void
    onSpreadChange: (spreadIndex: number) => void
    onSelection: (selection: { quote: string; x: number; y: number }) => void
  }) => (
    <main aria-label="题目正文">
      <h2 data-testid="reader-question">{question.title}</h2>
      <p>{question.body}</p>
      <button type="button" onClick={() => onScrollPosition(480)}>模拟普通滚动</button>
      <button type="button" onClick={() => onSpreadChange(2)}>模拟双页翻页</button>
      <button type="button" onClick={() => onSelection({ quote: '需要批注的正文', x: 240, y: 160 })}>选择正文</button>
    </main>
  ),
}))

vi.mock('./components/DashboardDialog', () => ({
  DashboardDialog: ({ open }: { open: boolean }) => (
    open ? <section data-testid="dashboard-dialog">学习概览已经打开</section> : null
  ),
}))

vi.mock('./components/NotesPanel', () => ({
  NotesPanel: ({
    onNoteChange,
    onAddAnnotation,
    onScheduleReview,
  }: {
    onNoteChange: (note: string) => void
    onAddAnnotation: (quote: string, note: string, color: 'yellow') => void
    onScheduleReview: (days: number) => void
  }) => (
    <aside aria-label="批注与复习记录">
      <button type="button" onClick={() => onNoteChange('访客不应保存的总结')}>填写本题总结</button>
      <button type="button" onClick={() => onAddAnnotation('正文', '访客批注', 'yellow')}>保存文字批注</button>
      <button type="button" onClick={() => onScheduleReview(3)}>安排三天后复习</button>
    </aside>
  ),
}))

import App from './App'

const firstQuestion: InterviewQuestion = {
  id: 'public-q-1',
  library: 'public-bank',
  number: '1',
  title: '第一道公开题',
  body: '这是游客可以阅读的第一题正文。',
  plainText: '这是游客可以阅读的第一题正文。',
  sectionId: 'public-section',
  sectionTitle: 'Part 1：公开章节',
  tags: ['公开'],
  readMinutes: 2,
  order: 0,
}

const secondQuestion: InterviewQuestion = {
  ...firstQuestion,
  id: 'public-q-2',
  number: '2',
  title: '第二道公开题',
  body: '这是游客可以阅读的第二题正文。',
  plainText: '这是游客可以阅读的第二题正文。',
  order: 1,
}

const catalog = {
  banks: [{
    id: 'public-bank',
    title: '公开面试题库',
    shortTitle: '公开题库',
    kicker: 'PUBLIC QUESTION BANK',
    category: '公开内容',
    description: '无需登录即可阅读。',
    baseTags: ['公开'],
    tone: 'blue' as const,
    visibility: 'public' as const,
  }],
  sections: [{
    id: 'public-section',
    title: 'Part 1：公开章节',
    order: 0,
    questions: [firstQuestion, secondQuestion],
  }],
}

function matchMedia(matches = false): typeof window.matchMedia {
  return vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

async function renderGuest() {
  render(<App />)
  expect(await screen.findByTestId('reader-question')).toHaveTextContent('第一道公开题')
  expect(screen.getByText('这是游客可以阅读的第一题正文。')).toBeInTheDocument()
}

function expectNoPersonalStateCalls() {
  expect(apiMocks.getMyState).not.toHaveBeenCalled()
  expect(apiMocks.saveMyState).not.toHaveBeenCalled()
  expect(outboxMocks.flushQueuedState).not.toHaveBeenCalled()
  expect(outboxMocks.queueStudyState).not.toHaveBeenCalled()
  expect(outboxMocks.clearQueuedState).not.toHaveBeenCalled()
}

async function expectContextualLogin(pattern: RegExp) {
  expect(await screen.findByRole('dialog', { name: '登录学习账号' })).toBeInTheDocument()
  const reason = screen.getByTestId('auth-reason').textContent?.trim() ?? ''
  expect(reason).not.toBe('')
  expect(reason).toMatch(pattern)
  expectNoPersonalStateCalls()
}

beforeEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
  window.sessionStorage.clear()
  window.history.replaceState(null, '', '/')
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: matchMedia() })
  apiMocks.getCatalog.mockResolvedValue(catalog)
  apiMocks.getSession.mockResolvedValue({ user: null })
  outboxMocks.flushQueuedState.mockResolvedValue(undefined)
  outboxMocks.queueStudyState.mockResolvedValue('guest-must-not-queue')
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('App guest mode', () => {
  it('loads public content and navigates between questions without asking for login', async () => {
    await renderGuest()

    fireEvent.click(screen.getByRole('button', { name: '下一题' }))
    await waitFor(() => expect(screen.getByTestId('reader-question')).toHaveTextContent('第二道公开题'))
    expect(screen.getByText('这是游客可以阅读的第二题正文。')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '上一题' }))
    await waitFor(() => expect(screen.getByTestId('reader-question')).toHaveTextContent('第一道公开题'))

    expect(screen.queryByRole('dialog', { name: '登录学习账号' })).not.toBeInTheDocument()
    expectNoPersonalStateCalls()
  })

  it('keeps the public catalog readable when the account service is offline', async () => {
    apiMocks.getSession.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await renderGuest()

    expect(screen.getByText(/云端游客模式/)).toHaveTextContent('本机账户服务暂不可用')
    expect(screen.queryByText(/题库没有载入/)).not.toBeInTheDocument()
    expectNoPersonalStateCalls()
  })

  it('keeps passive scrolling and spread navigation read-only without prompting or persisting', async () => {
    await renderGuest()

    fireEvent.click(screen.getByRole('button', { name: '模拟普通滚动' }))
    fireEvent.click(screen.getByRole('button', { name: '模拟双页翻页' }))

    expect(screen.queryByRole('dialog', { name: '登录学习账号' })).not.toBeInTheDocument()
    expectNoPersonalStateCalls()
  })

  it('asks for login with a favorite-specific reason', async () => {
    await renderGuest()
    fireEvent.click(screen.getByRole('button', { name: '收藏题目' }))
    await expectContextualLogin(/收藏/)
  })

  it('asks for login before opening personal notes or creating an annotation', async () => {
    await renderGuest()
    fireEvent.click(screen.getByRole('button', { name: /展开批注|收起批注/ }))
    await expectContextualLogin(/批注|边注|笔记/)
  })

  it('asks for login when selected text is sent to the annotation flow', async () => {
    await renderGuest()
    fireEvent.click(screen.getByRole('button', { name: '选择正文' }))
    fireEvent.click(await screen.findByRole('button', { name: '为选中文本写批注' }))
    await expectContextualLogin(/批注|高亮|边注/)
  })

  it('asks for login with a progress-specific reason before changing status', async () => {
    await renderGuest()
    fireEvent.click(screen.getByRole('radio', { name: '已掌握' }))
    await expectContextualLogin(/进度|掌握|学习记录/)
  })

  it('gates the dashboard and review queue as personal views', async () => {
    await renderGuest()
    fireEvent.click(screen.getByRole('button', { name: '学习概览' }))
    await expectContextualLogin(/概览|进度|学习记录/)
    expect(screen.queryByTestId('dashboard-dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '关闭登录' }))
    fireEvent.click(screen.getByRole('button', { name: /复习队列/ }))
    await expectContextualLogin(/复习/)
  })

  it('gates filters derived from a personal study state', async () => {
    await renderGuest()
    fireEvent.click(screen.getByRole('tab', { name: '收藏' }))
    await expectContextualLogin(/收藏|个人|学习记录/)
  })
})
