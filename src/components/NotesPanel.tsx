import {
  Bot,
  CalendarClock,
  Check,
  ChevronsLeft,
  ChevronsRight,
  Edit3,
  Highlighter,
  MessageSquareText,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import {
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react'
import { AiAssistant } from './AiAssistant'
import { appPath } from '../lib/api'
import { formatRelativeDate } from '../lib/format'
import { NOTES_PANEL_RESIZE_STEP } from '../lib/notesPanelSizing'
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
  expanded: boolean
  synced: boolean
  width: number
  minWidth: number
  maxWidth: number
  compact: boolean
  mode: 'notes' | 'assistant'
  assistantFocusToken: number
  onClose: () => void
  onModeChange: (mode: 'notes' | 'assistant') => void
  onWidthChange: (width: number) => void
  onResizeStart: () => void
  onResizeEnd: () => void
  onToggleWidth: () => void
  onResetWidth: () => void
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
  expanded,
  synced,
  width,
  minWidth,
  maxWidth,
  compact,
  mode,
  assistantFocusToken,
  onClose,
  onModeChange,
  onWidthChange,
  onResizeStart,
  onResizeEnd,
  onToggleWidth,
  onResetWidth,
  onNoteChange,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onComposerClose,
  onScheduleReview,
}: NotesPanelProps) {
  const [draftNote, setDraftNote] = useState('')
  const [draftColor, setDraftColor] = useState<HighlightColor>('yellow')
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackContact, setFeedbackContact] = useState('')
  const [feedbackState, setFeedbackState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [feedbackError, setFeedbackError] = useState('')
  const resizeGesture = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null)

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

  const submitFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (feedbackText.trim().length < 10) {
      setFeedbackState('error')
      setFeedbackError('请至少写 10 个字，方便定位问题。')
      return
    }
    setFeedbackState('sending')
    setFeedbackError('')
    try {
      const response = await fetch(appPath('/api/contact-requests'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          kind: 'feedback', name: '阅读页访客', contact: feedbackContact.trim(),
          message: feedbackText.trim(), questionId: question.id,
          pageContext: `阅读页 · Q${question.number}`, consent: true, website: '',
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : '反馈提交失败，请稍后再试。')
      setFeedbackState('success')
    } catch (error) {
      setFeedbackState('error')
      setFeedbackError(error instanceof Error ? error.message : '反馈提交失败，请稍后再试。')
    }
  }

  const finishResize = (target: HTMLDivElement, pointerId: number) => {
    if (!resizeGesture.current || resizeGesture.current.pointerId !== pointerId) return
    resizeGesture.current = null
    if (target.hasPointerCapture?.(pointerId)) target.releasePointerCapture(pointerId)
    onResizeEnd()
  }

  const handleResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.focus()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    resizeGesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: width,
    }
    onResizeStart()
  }

  const handleResizeMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = resizeGesture.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    onWidthChange(gesture.startWidth + gesture.startX - event.clientX)
  }

  const handleResizeKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? NOTES_PANEL_RESIZE_STEP * 3 : NOTES_PANEL_RESIZE_STEP
    let nextWidth: number | undefined

    if (event.key === 'ArrowLeft') nextWidth = width + step
    if (event.key === 'ArrowRight') nextWidth = width - step
    if (event.key === 'Home') nextWidth = minWidth
    if (event.key === 'End') nextWidth = maxWidth
    if (nextWidth === undefined) return

    event.preventDefault()
    onWidthChange(nextWidth)
  }

  return (
    <aside
      id="notes-panel"
      className={`notes-panel context-workspace${mobileOpen ? ' is-mobile-open' : ''}${expanded ? ' is-open' : ''}`}
      data-mode={mode}
      role={mobileOpen ? 'dialog' : 'complementary'}
      aria-modal={mobileOpen || undefined}
      aria-label="当前题目工作区"
      aria-hidden={!expanded}
      inert={!expanded}
    >
      <div
        className="notes-panel__resizer"
        role="separator"
        tabIndex={expanded ? 0 : -1}
        aria-label="调整批注栏宽度"
        aria-orientation="vertical"
        aria-valuemin={minWidth}
        aria-valuemax={maxWidth}
        aria-valuenow={Math.round(width)}
        aria-valuetext={`${Math.round(width)} 像素`}
        title="拖动调整宽度，双击恢复默认"
        onPointerDown={handleResizeStart}
        onPointerMove={handleResizeMove}
        onPointerUp={(event) => finishResize(event.currentTarget, event.pointerId)}
        onPointerCancel={(event) => finishResize(event.currentTarget, event.pointerId)}
        onLostPointerCapture={(event) => finishResize(event.currentTarget, event.pointerId)}
        onKeyDown={handleResizeKeyDown}
        onDoubleClick={onResetWidth}
      />
      <header className="notes-panel__header">
        <div>
          <span>CONTEXT · Q{question.number}</span>
          <h2>本题工作区</h2>
        </div>
        <div className="notes-panel__header-actions">
          <button
            className="icon-button notes-panel__width-toggle"
            type="button"
            onClick={onToggleWidth}
            aria-label={compact ? '恢复批注栏宽度' : '收窄批注栏宽度'}
            title={compact ? '恢复批注栏宽度' : '收窄批注栏宽度'}
          >
            {compact ? <ChevronsLeft aria-hidden="true" /> : <ChevronsRight aria-hidden="true" />}
          </button>
          <button className="icon-button notes-panel__close" type="button" onClick={onClose} aria-label="关闭本题工作区" title="关闭本题工作区">
            <X aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="context-workspace__tabs" role="tablist" aria-label="工作区工具">
        <button
          id="context-tab-notes"
          type="button"
          role="tab"
          aria-selected={mode === 'notes'}
          aria-controls="context-panel-notes"
          className={mode === 'notes' ? 'is-active' : ''}
          onClick={() => onModeChange('notes')}
        >
          <Highlighter aria-hidden="true" />
          批注
          {annotations.length > 0 && <span>{annotations.length}</span>}
        </button>
        <button
          id="context-tab-assistant"
          type="button"
          role="tab"
          aria-selected={mode === 'assistant'}
          aria-controls="context-panel-assistant"
          className={mode === 'assistant' ? 'is-active' : ''}
          onClick={() => onModeChange('assistant')}
        >
          <Bot aria-hidden="true" />
          AI 助手
        </button>
      </div>

      <div
        id="context-panel-notes"
        className="notes-panel__scroll context-workspace__panel"
        role="tabpanel"
        aria-labelledby="context-tab-notes"
        hidden={mode !== 'notes'}
        inert={mode !== 'notes'}
      >
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
          <small>{synced ? '自动同步到你的学习账号' : '访客只读，登录后可保存与跨设备同步'}</small>
          <button className="notes-panel__feedback-trigger" type="button" onClick={() => { setFeedbackOpen(true); setFeedbackState('idle') }}>
            <MessageSquareText aria-hidden="true" />反馈本题
          </button>
        </section>

        {feedbackOpen && (
          <section className="notes-panel__feedback" role="dialog" aria-label="反馈本题">
            {feedbackState === 'success' ? (
              <div className="notes-panel__feedback-success"><Check aria-hidden="true" /><strong>已收到反馈</strong><span>谢谢你帮忙把题目打磨得更好。</span><button type="button" onClick={() => { setFeedbackOpen(false); setFeedbackText('') }}>关闭</button></div>
            ) : (
              <form onSubmit={submitFeedback}>
                <header><strong>反馈本题</strong><button type="button" aria-label="关闭反馈" onClick={() => setFeedbackOpen(false)}><X aria-hidden="true" /></button></header>
                <label>哪里需要改进？<textarea value={feedbackText} onChange={(event) => setFeedbackText(event.target.value)} placeholder="例如：这道题的示例看不懂，想补一个输入输出。" autoFocus /></label>
                <label>联系方式（可选）<input value={feedbackContact} onChange={(event) => setFeedbackContact(event.target.value)} placeholder="邮箱或微信" /></label>
                {feedbackError && <p role="alert">{feedbackError}</p>}
                <button className="button-strong" type="submit" disabled={feedbackState === 'sending'}>{feedbackState === 'sending' ? '提交中…' : '提交反馈'}</button>
              </form>
            )}
          </section>
        )}

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
      <div
        id="context-panel-assistant"
        className="context-workspace__ai context-workspace__panel"
        role="tabpanel"
        aria-labelledby="context-tab-assistant"
        hidden={mode !== 'assistant'}
        inert={mode !== 'assistant'}
      >
        <AiAssistant question={question} focusToken={assistantFocusToken} embedded />
      </div>
    </aside>
  )
}
