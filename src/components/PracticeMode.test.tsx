import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  PracticeMode,
  PracticePanel,
  type PracticeAnswerSlotContext,
} from './PracticeMode'

afterEach(cleanup)

function renderPractice(overrides: Partial<Parameters<typeof PracticePanel>[0]> = {}) {
  const onReveal = vi.fn()
  const onScheduleReview = vi.fn(() => true)
  const onNext = vi.fn()
  const props = {
    questionKey: 'question-1',
    onReveal,
    onScheduleReview,
    onNext,
    children: <article>Proxy 可以统一拦截对象操作。</article>,
    ...overrides,
  }

  return { ...render(<PracticePanel {...props} />), props, onReveal, onScheduleReview, onNext }
}

describe('PracticePanel', () => {
  it('keeps the standard answer out of the DOM until the learner reveals it', () => {
    const answerSlot = vi.fn((_context: PracticeAnswerSlotContext) => (
      <article>标准答案只在揭晓后出现。</article>
    ))
    renderPractice({ children: answerSlot })

    expect(screen.getByRole('textbox', { name: '用自己的话写下答案' })).toBeInTheDocument()
    expect(screen.queryByText('标准答案只在揭晓后出现。')).not.toBeInTheDocument()
    expect(answerSlot).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '揭晓标准答案' }))

    expect(screen.getByText('标准答案只在揭晓后出现。')).toBeInTheDocument()
    expect(answerSlot).toHaveBeenCalledWith({ draftAnswer: '', assessment: null })
    expect(screen.getByRole('heading', { name: '标准答案' })).toHaveFocus()
  })

  it('accepts a temporary answer and supports Ctrl+Enter to reveal', () => {
    const onAnswerChange = vi.fn()
    const { onReveal } = renderPractice({ onAnswerChange })
    const answer = screen.getByRole('textbox', { name: '用自己的话写下答案' })

    fireEvent.change(answer, { target: { value: '先说 Proxy 的拦截范围，再说边界。' } })
    expect(onAnswerChange).toHaveBeenLastCalledWith('先说 Proxy 的拦截范围，再说边界。')

    fireEvent.keyDown(answer, { key: 'Enter', ctrlKey: true })

    expect(onReveal).toHaveBeenCalledWith('先说 Proxy 的拦截范围，再说边界。')
    expect(answer).toHaveAttribute('readonly')
    expect(screen.getByText('Proxy 可以统一拦截对象操作。')).toBeInTheDocument()
  })

  it.each([
    ['不会', 1, 'again'],
    ['模糊', 3, 'unsure'],
    ['掌握', 7, 'mastered'],
  ] as const)('maps “%s” to a %d-day review callback', (label, intervalDays, rating) => {
    const { onScheduleReview, onNext } = renderPractice()
    const answer = screen.getByRole('textbox', { name: '用自己的话写下答案' })
    fireEvent.change(answer, { target: { value: '我的临时答案' } })
    fireEvent.click(screen.getByRole('button', { name: '揭晓标准答案' }))

    fireEvent.click(screen.getByRole('radio', { name: `${label}，${intervalDays} 天后复习` }))

    expect(onScheduleReview).toHaveBeenCalledWith({
      rating,
      intervalDays,
      draftAnswer: '我的临时答案',
    })
    expect(screen.getByRole('status')).toHaveTextContent(`已保存“${label}”，${intervalDays} 天后进入复习队列`)

    fireEvent.click(screen.getByRole('button', { name: '下一题' }))
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('keeps a guest assessment locally without claiming that it was saved', () => {
    renderPractice({ onScheduleReview: vi.fn(() => false) })
    fireEvent.click(screen.getByRole('button', { name: '揭晓标准答案' }))

    fireEvent.click(screen.getByRole('radio', { name: '不会，1 天后复习' }))

    expect(screen.getByRole('status')).toHaveTextContent('仅本页保留，登录后可保存复习计划。')
    expect(screen.getByRole('radio', { name: '不会，1 天后复习' })).toBeChecked()
    expect(screen.getByRole('button', { name: '下一题' })).toBeInTheDocument()
  })

  it('automatically saves a pending guest assessment after login becomes available', async () => {
    const onScheduleReview = vi.fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
    const { rerender, props } = renderPractice({ onScheduleReview, canSaveReview: false })
    fireEvent.click(screen.getByRole('button', { name: '揭晓标准答案' }))
    fireEvent.click(screen.getByRole('radio', { name: '模糊，3 天后复习' }))
    expect(screen.getByRole('status')).toHaveTextContent('仅本页保留')

    rerender(<PracticePanel {...props} canSaveReview />)

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('已保存“模糊”'))
    expect(onScheduleReview).toHaveBeenCalledTimes(2)
  })

  it('reports reveal state and resets it when questionKey changes', () => {
    const onRevealChange = vi.fn()
    const { rerender, props } = renderPractice({ onRevealChange })
    expect(onRevealChange).toHaveBeenLastCalledWith(false)

    fireEvent.click(screen.getByRole('button', { name: '揭晓标准答案' }))
    expect(onRevealChange).toHaveBeenLastCalledWith(true)

    rerender(
      <PracticePanel {...props} questionKey="question-2" onRevealChange={onRevealChange}>
        <article>第二题标准答案。</article>
      </PracticePanel>,
    )
    expect(onRevealChange).toHaveBeenLastCalledWith(false)
  })

  it('resets the full practice round when questionKey changes', () => {
    const { rerender, props } = renderPractice()
    const answer = screen.getByRole('textbox', { name: '用自己的话写下答案' })
    fireEvent.change(answer, { target: { value: '上一题答案' } })
    fireEvent.click(screen.getByRole('button', { name: '揭晓标准答案' }))
    fireEvent.click(screen.getByRole('radio', { name: '模糊，3 天后复习' }))

    rerender(
      <PracticePanel
        {...props}
        questionKey="question-2"
      >
        <article>第二题标准答案。</article>
      </PracticePanel>,
    )

    expect(screen.getByRole('textbox', { name: '用自己的话写下答案' })).toHaveValue('')
    expect(screen.queryByText('第二题标准答案。')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '揭晓标准答案' })).toBeInTheDocument()
  })

  it('exports PracticeMode as the reusable PracticePanel entry point', () => {
    expect(PracticeMode).toBe(PracticePanel)
  })
})
