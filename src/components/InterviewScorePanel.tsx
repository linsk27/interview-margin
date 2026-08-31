import { BrainCircuit, LoaderCircle, RefreshCcw, Sparkles, Target, TriangleAlert } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

import { InterviewScoreError, scoreInterviewAnswer, type InterviewScoreResult } from '../lib/interviewScore'
import styles from './InterviewScorePanel.module.css'

interface InterviewScorePanelProps {
  questionId: string
  answer: string
  disabled?: boolean
}

type ScoreState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error', message: string, retryable: boolean }
  | { status: 'success', result: InterviewScoreResult }

export function InterviewScorePanel({ questionId, answer, disabled = false }: InterviewScorePanelProps) {
  const [state, setState] = useState<ScoreState>({ status: 'idle' })
  const abortRef = useRef<AbortController | undefined>(undefined)
  const titleId = useId()

  useEffect(() => () => abortRef.current?.abort(), [])

  const requestScore = async () => {
    if (disabled || abortRef.current) return
    const controller = new AbortController()
    abortRef.current = controller
    setState({ status: 'loading' })

    try {
      const result = await scoreInterviewAnswer({ questionId, answer, signal: controller.signal })
      if (controller.signal.aborted) return
      setState({ status: 'success', result })
    } catch (error) {
      if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : 'AI 面试官暂时无法评分，请稍后重试。',
        retryable: error instanceof InterviewScoreError ? error.retryable : true,
      })
    } finally {
      if (abortRef.current === controller) abortRef.current = undefined
    }
  }

  const isLoading = state.status === 'loading'

  return (
    <section className={styles.root} aria-labelledby={titleId} aria-busy={isLoading}>
      <header className={styles.header}>
        <span className={styles.icon}><BrainCircuit aria-hidden="true" /></span>
        <div className={styles.heading}>
          <p>AI INTERVIEWER</p>
          <h3 id={titleId}>面试官评分</h3>
        </div>
        {state.status === 'success' && (
          <div className={styles.total} aria-label={`约 ${state.result.score} 分`}>
            <span>约</span>
            <strong>{state.result.score}</strong>
            <small>/ 100</small>
          </div>
        )}
      </header>

      <p className={styles.rubric}>
        技术正确性 30 · 原理与因果 25 · 关键点覆盖 20 · 场景边界 15 · 表达结构 10
      </p>

      {state.status === 'idle' && (
        <div className={styles.idleRow}>
          <p>AI 会按固定规则评价你刚才写下的内容，不按字数或关键词凑分。</p>
          <button type="button" onClick={() => void requestScore()} disabled={disabled}>
            <Sparkles aria-hidden="true" />
            开始 AI 评分
          </button>
        </div>
      )}

      {isLoading && (
        <div className={styles.loading} role="status" aria-live="polite">
          <LoaderCircle aria-hidden="true" />
          <div>
            <strong>正在按面试官规则评估</strong>
            <span>标准答案仍可正常查看，评分通常几秒内返回。</span>
          </div>
        </div>
      )}

      {state.status === 'error' && (
        <div className={styles.error} role="alert">
          <p>{state.message}</p>
          {state.retryable
            ? (
                <button type="button" onClick={() => void requestScore()} disabled={disabled}>
                  <RefreshCcw aria-hidden="true" />
                  重试评分
                </button>
              )
            : <span className={styles.errorHint}>仍可继续对照标准答案。</span>}
        </div>
      )}

      {state.status === 'success' && (
        <div className={styles.result}>
          <div className={styles.verdict} role="status" aria-live="polite" aria-atomic="true">
            <strong>{state.result.band}</strong>
            <p>{state.result.summary}</p>
          </div>

          <dl className={styles.dimensions} aria-label="评分明细">
            {state.result.dimensions.map((dimension) => (
              <div key={dimension.key}>
                <dt>{dimension.label}</dt>
                <dd><strong>{dimension.score} / {dimension.maxScore}</strong><span>{dimension.levelLabel}</span></dd>
              </div>
            ))}
          </dl>

          {state.result.criticalIssues[0] && (
            <p className={styles.hardIssue}>
              <TriangleAlert aria-hidden="true" />
              <span><strong>严重问题已触发总分上限</strong>{state.result.criticalIssues[0].explanation}</span>
            </p>
          )}

          <div className={styles.feedback}>
            {state.result.strengths[0] && (
              <p><Sparkles aria-hidden="true" /><span><strong>做对了</strong>{state.result.strengths[0]}</span></p>
            )}
            <p><Target aria-hidden="true" /><span><strong>最先补这一点</strong>{state.result.nextStep}</span></p>
          </div>

          <footer className={styles.footer}>
            <span>{state.result.confidence === 'low' ? '回答信息较少，评分把握有限。' : state.result.disclaimer}</span>
            <button type="button" onClick={() => void requestScore()} disabled={disabled}>
              <RefreshCcw aria-hidden="true" />
              重新评分
            </button>
          </footer>
        </div>
      )}
    </section>
  )
}
