import { CalendarClock, Check, Edit3, Highlighter, MessageSquareText, Save, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatRelativeDate } from '../lib/format'
import type { Annotation, HighlightColor, InterviewQuestion, QuestionProgress } from '../types'

interface ComposerDraft {
  quote: string
  color: HighlightColor
}

interface NotesPanelProps {
  question: InterviewQuestion
  progress: QuestionProgress
  annotations: Annotation[]
  composer?: ComposerDraft
  mobileOpen: boolean
  onClose: () => void
  onNoteChange: (note: string) => void
  onAddAnnotation: (quote: string, note: string, color: HighlightColor) => void
  onUpdateAnnotation: (id: string, note: string, color: HighlightColor) => void
  onDeleteAnnotation: (id: string) => void
  onComposerClose: () => void
  onScheduleReview: (days: number) => void
}

const COLORS: HighlightColor[] = ['yellow', 'blue', 'green', 'rose']

function AnnotationItem({ annotation, onUpdate, onDelete }: {
  annotation: Annotation
  onUpdate: (note: string, color: HighlightColor) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState(annotation.note)

  useEffect(() => setNote(annotation.note), [annotation.note])

  const save = () => {
    onUpdate(note, annotation.color)
    setEditing(false)
  }

  return (
    <article className={`annotation-card annotation-card--${annotation.color}`}>
      <blockquote>“{annotation.quote}”</blockquote>
      {editing ? (
        <div className="annotation-card__editor">
          <label>
            <span>批注内容</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} autoFocus />
          </label>
          <button type="button" onClick={save}><Save aria-hidden="true" />保存</button>
        </div>
      ) : (
        <p className={annotation.note ? '' : 'is-empty'}>{annotation.note || '仅高亮，暂未写批注。'}</p>
      )}
      <footer>
        <time>{formatRelativeDate(annotation.updatedAt)}</time>
        <div>
          <button type="button" onClick={() => setEditing((value) => !value)} aria-label="编辑批注" title="编辑批注"><Edit3 aria-hidden="true" /></button>
          <button type="button" onClick={onDelete} aria-label="删除批注" title="删除批注"><Trash2 aria-hidden="true" /></button>
        </div>
      </footer>
    </article>
  )
}

export function NotesPanel({
  question,
  progress,
  annotations,
  composer,
  mobileOpen,
  onClose,
  onNoteChange,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onComposerClose,
  onScheduleReview,
}: NotesPanelProps) {
  const [draftNote, setDraftNote] = useState('')
  const [draftColor, setDraftColor] = useState<HighlightColor>('yellow')

  useEffect(() => {
    if (!composer) return
    setDraftNote('')
    setDraftColor(composer.color)
  }, [composer])

  const add = () => {
    if (!composer) return
    onAddAnnotation(composer.quote, draftNote.trim(), draftColor)
    onComposerClose()
  }

  return (
    <aside className={`notes-panel${mobileOpen ? ' is-mobile-open' : ''}`} aria-label="批注与复习记录">
      <header className="notes-panel__header">
        <div>
          <span>Q{question.number}</span>
          <h2>边注</h2>
        </div>
        <button className="icon-button notes-panel__close" type="button" onClick={onClose} aria-label="关闭批注" title="关闭批注">
          <X aria-hidden="true" />
        </button>
      </header>

      <div className="notes-panel__scroll">
        {composer && (
          <section className="annotation-composer">
            <div className="annotation-composer__title">
              <MessageSquareText aria-hidden="true" />
              <strong>为选中内容写批注</strong>
            </div>
            <blockquote>“{composer.quote}”</blockquote>
            <div className="color-picker" role="radiogroup" aria-label="高亮颜色">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  role="radio"
                  aria-checked={draftColor === color}
                  className={`swatch swatch--${color}${draftColor === color ? ' is-active' : ''}`}
                  onClick={() => setDraftColor(color)}
                  aria-label={`选择${color}高亮`}
                />
              ))}
            </div>
            <label>
              <span>你的理解或追问</span>
              <textarea
                value={draftNote}
                onChange={(event) => setDraftNote(event.target.value)}
                placeholder="例如：这里为什么不能直接用 pendingMap？"
                autoFocus
              />
            </label>
            <div className="annotation-composer__actions">
              <button type="button" onClick={onComposerClose}>取消</button>
              <button className="button-strong" type="button" onClick={add}><Highlighter aria-hidden="true" />保存批注</button>
            </div>
          </section>
        )}

        <section className="question-note">
          <div className="notes-panel__section-title">
            <MessageSquareText aria-hidden="true" />
            <h3>本题总结</h3>
          </div>
          <label>
            <span className="sr-only">本题总结</span>
            <textarea
              value={progress.note}
              onChange={(event) => onNoteChange(event.target.value)}
              placeholder="用自己的话写下答题框架、薄弱点或要回看的代码。"
            />
          </label>
          <small>自动保存在当前浏览器</small>
        </section>

        <section className="review-schedule">
          <div className="notes-panel__section-title">
            <CalendarClock aria-hidden="true" />
            <h3>安排复习</h3>
          </div>
          <div className="review-schedule__buttons">
            {[1, 3, 7].map((days) => (
              <button key={days} type="button" onClick={() => onScheduleReview(days)}>{days} 天后</button>
            ))}
          </div>
          {progress.dueAt && <p><Check aria-hidden="true" />已安排至 {new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' }).format(new Date(progress.dueAt))}</p>}
        </section>

        <section className="annotation-list">
          <div className="notes-panel__section-title">
            <Highlighter aria-hidden="true" />
            <h3>文字批注</h3>
            <span>{annotations.length}</span>
          </div>
          {annotations.length ? annotations.map((annotation) => (
            <AnnotationItem
              key={annotation.id}
              annotation={annotation}
              onUpdate={(note, color) => onUpdateAnnotation(annotation.id, note, color)}
              onDelete={() => onDeleteAnnotation(annotation.id)}
            />
          )) : (
            <div className="annotation-list__empty">
              <Highlighter aria-hidden="true" />
              <p>选中正文即可高亮或写批注。</p>
            </div>
          )}
        </section>
      </div>
    </aside>
  )
}
