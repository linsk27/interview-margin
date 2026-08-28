import { BookOpen, CheckCircle2, Clock3, Download, Flame, Highlighter, RotateCcw, Upload, X } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { formatDuration } from '../lib/format'
import { isReviewDue } from '../lib/reviewSchedule'
import { progressFor, todayKey } from '../lib/storage'
import type { InterviewQuestion, InterviewSection, StudyState } from '../types'

function lastDays(count: number): string[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (count - index - 1))
    return todayKey(date)
  })
}

function calculateStreak(activity: Record<string, number>): number {
  let streak = 0
  const date = new Date()
  while (activity[todayKey(date)] > 0) {
    streak += 1
    date.setDate(date.getDate() - 1)
  }
  return streak
}

export function DashboardDialog({
  open,
  sections,
  questions,
  state,
  onClose,
  onSelect,
  onExport,
  onImport,
  synced,
}: {
  open: boolean
  sections: InterviewSection[]
  questions: InterviewQuestion[]
  state: StudyState
  onClose: () => void
  onSelect: (question: InterviewQuestion) => void
  onExport: () => void
  onImport: (file: File) => void
  synced?: boolean
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const now = new Date()
  const mastered = questions.filter((question) => progressFor(state, question.id).status === 'mastered').length
  const review = questions.filter((question) => isReviewDue(progressFor(state, question.id), now)).length
  const read = questions.filter((question) => progressFor(state, question.id).status !== 'unread').length
  const seconds = questions.reduce((sum, question) => sum + progressFor(state, question.id).seconds, 0)
  const days = useMemo(() => lastDays(14), [])
  const maxActivity = Math.max(1, ...days.map((day) => state.activity[day] ?? 0))
  const reviewQueue = questions
    .filter((question) => isReviewDue(progressFor(state, question.id), now))
    .slice(0, 6)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog className="dashboard-dialog" ref={dialogRef} onClose={onClose} onCancel={onClose}>
      <header className="dialog-header">
        <div>
          <p>STUDY LEDGER</p>
          <h2>学习概览</h2>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="关闭概览" title="关闭概览"><X aria-hidden="true" /></button>
      </header>

      <div className="dashboard-dialog__body">
        <section className="dashboard-stats" aria-label="学习统计">
          <div><BookOpen aria-hidden="true" /><strong>{read}</strong><span>已阅读 / {questions.length}</span></div>
          <div><CheckCircle2 aria-hidden="true" /><strong>{mastered}</strong><span>已掌握</span></div>
          <div><RotateCcw aria-hidden="true" /><strong>{review}</strong><span>需复习</span></div>
          <div><Clock3 aria-hidden="true" /><strong>{formatDuration(seconds)}</strong><span>累计阅读</span></div>
        </section>

        <section className="activity-ledger">
          <div className="dashboard-section-title">
            <div><Flame aria-hidden="true" /><h3>最近 14 天</h3></div>
            <span>连续 {calculateStreak(state.activity)} 天</span>
          </div>
          <div className="activity-strip" aria-label="最近十四天学习记录">
            {days.map((day) => {
              const count = state.activity[day] ?? 0
              const level = Math.ceil((count / maxActivity) * 4)
              return <span key={day} className={`level-${level}`} title={`${day}：${count} 次学习记录`}><i /></span>
            })}
          </div>
        </section>

        <div className={`dashboard-columns${reviewQueue.length ? '' : ' dashboard-columns--review-empty'}`}>
          <section className="section-progress">
            <div className="dashboard-section-title"><div><CheckCircle2 aria-hidden="true" /><h3>章节进度</h3></div></div>
            {sections.map((section) => {
              const sectionMastered = section.questions.filter((question) => progressFor(state, question.id).status === 'mastered').length
              const percent = Math.round((sectionMastered / section.questions.length) * 100)
              return (
                <div className="section-progress__row" key={section.id}>
                  <div><span>{section.title.replace(/^Part\s*\d+[：:]?\s*/i, '')}</span><small>{sectionMastered}/{section.questions.length}</small></div>
                  <span className="progress-line"><span style={{ width: `${percent}%` }} /></span>
                </div>
              )
            })}
          </section>

          <section className="review-queue">
            <div className="dashboard-section-title"><div><RotateCcw aria-hidden="true" /><h3>复习队列</h3></div><span>{reviewQueue.length}</span></div>
            {reviewQueue.length ? reviewQueue.map((question) => (
              <button key={question.id} type="button" onClick={() => { onSelect(question); onClose() }}>
                <span>Q{question.number}</span>
                <strong>{question.title.replace(/^Q[\d.]+[：:]?\s*/, '')}</strong>
              </button>
            )) : <p className="review-queue__empty"><CheckCircle2 aria-hidden="true" />当前没有待复习题目。</p>}
          </section>
        </div>

        <section className="data-backup">
          <div>
            <Highlighter aria-hidden="true" />
            <p><strong>{state.annotations.length} 条批注</strong><span>{synced ? '账号数据已保存到本机 SQLite，可跨设备恢复。' : '访客为只读模式，登录后可同步学习记录。'}</span></p>
          </div>
          <div className="data-backup__actions">
            <button type="button" onClick={onExport}><Download aria-hidden="true" />导出记录</button>
            <button type="button" onClick={() => fileRef.current?.click()}><Upload aria-hidden="true" />导入记录</button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) onImport(file)
                event.target.value = ''
              }}
            />
          </div>
        </section>
      </div>
    </dialog>
  )
}
