import {
  ArrowRight,
  Brain,
  Check,
  CircleHelp,
  Eye,
  RotateCcw,
} from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent, ReactNode } from 'react'
import styles from './PracticeMode.module.css'

export type PracticeRating = 'again' | 'unsure' | 'mastered'
export type PracticeReviewInterval = 1 | 3 | 7

export interface PracticeAssessment {
  rating: PracticeRating
  intervalDays: PracticeReviewInterval
  draftAnswer: string
}

export interface PracticeAnswerSlotContext {
  draftAnswer: string
  assessment: PracticeAssessment | null
}

export interface PracticePanelProps {
  /** Changing this value starts a fresh practice round and clears temporary input. */
  questionKey: string | number
  /** The standard answer. It is not mounted until the learner explicitly reveals it. */
  children: ReactNode | ((context: PracticeAnswerSlotContext) => ReactNode)
  className?: string
  heading?: ReactNode
  prompt?: ReactNode
  defaultAnswer?: string
  answerLabel?: string
  answerPlaceholder?: string
  revealLabel?: string
  nextLabel?: string
  disabled?: boolean
  autoFocusAnswer?: boolean
  canSaveReview?: boolean
  onAnswerChange?: (answer: string) => void
  onReveal?: (answer: string) => void
  onRevealChange?: (revealed: boolean) => void
  onScheduleReview: (assessment: PracticeAssessment) => boolean
  onNext: () => void
}

export interface PracticeReviewOption {
  rating: PracticeRating
  label: string
  description: string
  intervalDays: PracticeReviewInterval
  icon: ReactNode
}

export const PRACTICE_REVIEW_OPTIONS: ReadonlyArray<PracticeReviewOption> = [
  {
    rating: 'again',
    label: '不会',
    description: '尽快再练一次',
    intervalDays: 1,
    icon: <RotateCcw aria-hidden="true" />,
  },
  {
    rating: 'unsure',
    label: '模糊',
    description: '隔几天再巩固',
    intervalDays: 3,
    icon: <CircleHelp aria-hidden="true" />,
  },
  {
    rating: 'mastered',
    label: '掌握',
    description: '拉长复习间隔',
    intervalDays: 7,
    icon: <Check aria-hidden="true" />,
  },
]

type PracticeSessionProps = Omit<PracticePanelProps, 'questionKey'>

function PracticeSession({
  children,
  className,
  heading = '先独立作答',
  prompt,
  defaultAnswer = '',
  answerLabel = '用自己的话写下答案',
  answerPlaceholder = '写下关键词、答题框架或完整回答；也可以留空，先在脑中作答。',
  revealLabel = '揭晓标准答案',
  nextLabel = '下一题',
  disabled = false,
  autoFocusAnswer = false,
  canSaveReview = true,
  onAnswerChange,
  onReveal,
  onRevealChange,
  onScheduleReview,
  onNext,
}: PracticeSessionProps) {
  const titleId = useId()
  const answerInputId = useId()
  const answerHintId = useId()
  const answerTitleId = useId()
  const assessmentTitleId = useId()
  const ratingName = useId()
  const answerHeadingRef = useRef<HTMLHeadingElement>(null)
  const initialRevealChangeRef = useRef(onRevealChange)
  const scheduleReviewRef = useRef(onScheduleReview)
  const [draftAnswer, setDraftAnswer] = useState(defaultAnswer)
  const [revealed, setRevealed] = useState(false)
  const [assessment, setAssessment] = useState<PracticeAssessment | null>(null)
  const [scheduleSaved, setScheduleSaved] = useState<boolean | null>(null)

  const currentStep = !revealed ? 1 : assessment ? 3 : 2

  useEffect(() => {
    if (revealed) answerHeadingRef.current?.focus()
  }, [revealed])

  useEffect(() => {
    initialRevealChangeRef.current?.(false)
  }, [])

  useEffect(() => {
    scheduleReviewRef.current = onScheduleReview
  }, [onScheduleReview])

  useEffect(() => {
    if (!canSaveReview || !assessment || scheduleSaved !== false) return
    setScheduleSaved(scheduleReviewRef.current(assessment))
  }, [assessment, canSaveReview, scheduleSaved])

  const updateAnswer = (value: string) => {
    setDraftAnswer(value)
    onAnswerChange?.(value)
  }

  const reveal = () => {
    if (disabled || revealed) return
    setRevealed(true)
    onReveal?.(draftAnswer)
    onRevealChange?.(true)
  }

  const submitAnswer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    reveal()
  }

  const handleAnswerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      !revealed
      && !disabled
      && event.key === 'Enter'
      && (event.ctrlKey || event.metaKey)
      && !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      reveal()
    }
  }

  const assess = (option: PracticeReviewOption) => {
    const nextAssessment: PracticeAssessment = {
      rating: option.rating,
      intervalDays: option.intervalDays,
      draftAnswer,
    }
    setAssessment(nextAssessment)
    setScheduleSaved(onScheduleReview(nextAssessment))
  }

  const renderAnswer = () => (
    typeof children === 'function'
      ? children({ draftAnswer, assessment })
      : children
  )

  return (
    <section
      className={[styles.root, className].filter(Boolean).join(' ')}
      aria-labelledby={titleId}
      data-practice-phase={currentStep}
    >
      <header className={styles.header}>
        <span className={styles.headerIcon}><Brain aria-hidden="true" /></span>
        <div className={styles.headerCopy}>
          <p>ACTIVE RECALL</p>
          <h3 id={titleId}>{heading}</h3>
          <span>先回忆，再对照，最后决定何时复习。</span>
        </div>
      </header>

      <ol className={styles.steps} aria-label="刷题步骤">
        {['思考', '对照', '复习'].map((label, index) => {
          const step = index + 1
          return (
            <li
              className={step === currentStep ? styles.currentStep : undefined}
              aria-current={step === currentStep ? 'step' : undefined}
              key={label}
            >
              <span aria-hidden="true">{String(step).padStart(2, '0')}</span>
              <strong>{label}</strong>
            </li>
          )
        })}
      </ol>

      {prompt && <div className={styles.prompt}>{prompt}</div>}

      <form className={styles.answerForm} onSubmit={submitAnswer}>
        <label htmlFor={answerInputId}>{answerLabel}</label>
        <textarea
          id={answerInputId}
          value={draftAnswer}
          onChange={(event) => updateAnswer(event.target.value)}
          onKeyDown={handleAnswerKeyDown}
          placeholder={answerPlaceholder}
          aria-describedby={answerHintId}
          autoFocus={autoFocusAnswer}
          readOnly={revealed}
          disabled={disabled}
          rows={6}
        />
        <div className={styles.answerActions}>
          <p id={answerHintId}>
            {revealed ? '你的回答已保留，可与标准答案逐项对照。' : '答案不会提前显示。按 Ctrl/⌘ + Enter 也可揭晓。'}
          </p>
          {!revealed && (
            <button className={styles.revealButton} type="submit" disabled={disabled}>
              <Eye aria-hidden="true" />
              {revealLabel}
            </button>
          )}
        </div>
      </form>

      {revealed && (
        <section className={styles.answerSection} aria-labelledby={answerTitleId}>
          <header className={styles.sectionHeader}>
            <Eye aria-hidden="true" />
            <div>
              <p>STANDARD ANSWER</p>
              <h3 id={answerTitleId} ref={answerHeadingRef} tabIndex={-1}>标准答案</h3>
            </div>
          </header>
          <div className={styles.answerBody}>{renderAnswer()}</div>
        </section>
      )}

      {revealed && (
        <section className={styles.assessmentSection} aria-labelledby={assessmentTitleId}>
          <div className={styles.assessmentIntro}>
            <p>SELF CHECK</p>
            <h3 id={assessmentTitleId}>这次掌握得怎么样？</h3>
            <span>按真实回忆情况选择；登录后会把对应间隔同步到复习计划。</span>
          </div>

          <fieldset className={styles.assessmentFieldset} disabled={disabled}>
            <legend className={styles.visuallyHidden}>选择掌握程度与复习间隔</legend>
            <div className={styles.ratingGrid}>
              {PRACTICE_REVIEW_OPTIONS.map((option) => (
                <label className={styles.ratingOption} key={option.rating}>
                  <input
                    className={styles.ratingInput}
                    type="radio"
                    name={ratingName}
                    value={option.rating}
                    checked={assessment?.rating === option.rating}
                    aria-label={`${option.label}，${option.intervalDays} 天后复习`}
                    onChange={() => assess(option)}
                  />
                  <span className={styles.ratingCard}>
                    <span className={styles.ratingIcon}>{option.icon}</span>
                    <span className={styles.ratingCopy}>
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </span>
                    <span className={styles.ratingInterval}>{option.intervalDays} 天</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {assessment && (
            <div className={styles.resultRow}>
              <p role="status" aria-live="polite">
                {scheduleSaved
                  ? `已保存“${PRACTICE_REVIEW_OPTIONS.find((option) => option.rating === assessment.rating)?.label}”，${assessment.intervalDays} 天后进入复习队列。`
                  : `已选择“${PRACTICE_REVIEW_OPTIONS.find((option) => option.rating === assessment.rating)?.label}”，建议 ${assessment.intervalDays} 天后复习。仅本页保留，登录后可保存复习计划。`}
              </p>
              <button className={styles.nextButton} type="button" onClick={onNext} disabled={disabled}>
                {nextLabel}
                <ArrowRight aria-hidden="true" />
              </button>
            </div>
          )}
        </section>
      )}
    </section>
  )
}

export function PracticePanel({ questionKey, ...props }: PracticePanelProps) {
  return <PracticeSession key={questionKey} {...props} />
}

export const PracticeMode = PracticePanel
