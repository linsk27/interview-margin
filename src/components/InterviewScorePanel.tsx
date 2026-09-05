import { BrainCircuit, LoaderCircle, RefreshCcw, Sparkles, Target, TriangleAlert } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

import { ApiError, listInterviewAttempts } from '../lib/api'
import { InterviewScoreError, scoreInterviewAnswer, type InterviewScoreResult } from '../lib/interviewScore'
import { listLocalInterviewAttempts, saveLocalInterviewAttempt, type LocalInterviewAttempt } from '../lib/practiceHistory'
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
  const makeClientId = () => globalThis.crypto?.randomUUID?.() ?? `attempt-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const clientIdRef = useRef<string>(makeClientId())
  const titleId = useId()
  const correctionsTitleId = useId()
  const historyTitleId = useId()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [history, setHistory] = useState<Array<{ id: string; score: number; summary: string; createdAt: string; band?: string }>>([])

  useEffect(() => () => abortRef.current?.abort(), [])

  const requestScore = async () => {
    if (disabled || abortRef.current) return
    // A deliberate re-score is a new practice attempt.  Keep the same ID only
    // for the single in-flight request so server merges remain idempotent.
    clientIdRef.current = makeClientId()
    const controller = new AbortController()
    abortRef.current = controller
    setState({ status: 'loading' })

    try {
      const result = await scoreInterviewAnswer({ questionId, answer, signal: controller.signal, clientId: clientIdRef.current })
      if (controller.signal.aborted) return
      setState({ status: 'success', result })
      void saveLocalInterviewAttempt({
        clientId: clientIdRef.current,
        questionId,
        answer,
        result,
        createdAt: new Date().toISOString(),
      }).catch(() => undefined)
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

  const loadHistory = async () => {
    if (historyLoading) return
    setHistoryLoading(true)
    try {
      const local = await listLocalInterviewAttempts(questionId)
      const localItems = local.map((item) => ({
        id: item.clientId,
        score: item.result.score,
        summary: item.result.summary,
        band: item.result.band,
        createdAt: item.createdAt,
      }))
      try {
        const remote = await listInterviewAttempts(questionId, 20)
        const remoteItems = remote.attempts.map((item) => ({
          id: item.id,
          score: item.score,
          summary: item.summary,
          band: item.band,
          createdAt: item.createdAt,
        }))
        const seen = new Set(remoteItems.map((item) => `${item.score}:${item.createdAt}`))
        setHistory([...remoteItems, ...localItems.filter((item) => !seen.has(`${item.score}:${item.createdAt}`))]
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20))
      } catch (error) {
        if (!(error instanceof ApiError) || (error.status !== 401 && error.status !== 428)) throw error
        setHistory(localItems)
      }
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const toggleHistory = () => {
    const next = !historyOpen
    setHistoryOpen(next)
    if (next) void loadHistory()
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
          <output className={styles.total} aria-live="polite" aria-label={`练习评分 ${state.result.score} 分`}>
            <span>练习评分</span>
            <strong>{state.result.score}</strong>
            <small>/ 100</small>
          </output>
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
              <span>
                <strong>严重问题已触发总分上限</strong>
                <q>{state.result.criticalIssues[0].evidence}</q>
                <span>{state.result.criticalIssues[0].explanation}</span>
              </span>
            </p>
          )}

          {state.result.corrections.length > 0 && (
            <section className={styles.corrections} aria-labelledby={correctionsTitleId}>
              <strong id={correctionsTitleId}>表述需修正</strong>
              {state.result.corrections.map((item) => (
                <p key={`${item.evidence}-${item.correction}`}>
                  <q>{item.evidence}</q>
                  <span>{item.correction}</span>
                </p>
              ))}
            </section>
          )}

          <div className={styles.feedback}>
            {state.result.strengths[0] && (
              <p><Sparkles aria-hidden="true" /><span><strong>做对了</strong>{state.result.strengths[0]}</span></p>
            )}
            {state.result.gaps[0] && (
              <p><TriangleAlert aria-hidden="true" /><span><strong>为什么扣分</strong>{state.result.gaps[0]}</span></p>
            )}
            <p><Target aria-hidden="true" /><span><strong>最先补这一点</strong>{state.result.nextStep}</span></p>
          </div>

          <footer className={styles.footer}>
            <span>{state.result.confidence === 'low' ? '回答信息较少，评分把握有限。' : state.result.disclaimer}</span>
            <div className={styles.footerActions}>
              <button type="button" onClick={toggleHistory} disabled={disabled} aria-expanded={historyOpen} aria-controls={historyTitleId}>
                <span aria-hidden="true">▤</span>
                {historyOpen ? '收起历史' : '查看历史'}
              </button>
              <button type="button" onClick={() => void requestScore()} disabled={disabled}>
                <RefreshCcw aria-hidden="true" />
                重新评分
              </button>
            </div>
          </footer>
          {historyOpen && (
            <section className={styles.history} id={historyTitleId} aria-label="历史评分">
              <header><strong>本题评分历史</strong><span>{historyLoading ? '读取中…' : `${history.length} 次`}</span></header>
              {history.length === 0 && !historyLoading
                ? <p>还没有其他评分记录；下一次评分会自动保留。</p>
                : <ol>{history.map((item) => <li key={item.id}>
                  <strong>{item.score} 分</strong><span>{item.band || '练习评分'}</span>
                  <small>{new Date(item.createdAt).toLocaleString()}</small>
                  {item.summary && <p>{item.summary}</p>}
                </li>)}</ol>}
            </section>
          )}
        </div>
      )}
    </section>
  )
}
