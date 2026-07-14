import { ArrowLeft, ArrowRight, Menu, PanelRightClose, PanelRightOpen, Search, Star } from 'lucide-react'
import type { InterviewQuestion, QuestionProgress } from '../types'

interface TopbarProps {
  question: InterviewQuestion
  progress: QuestionProgress
  notesOpen: boolean
  hasPrevious: boolean
  hasNext: boolean
  onPrevious: () => void
  onNext: () => void
  onOpenLibrary: () => void
  onToggleNotes: () => void
  onOpenSearch: () => void
  onToggleFavorite: () => void
}

export function Topbar({
  question,
  progress,
  notesOpen,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  onOpenLibrary,
  onToggleNotes,
  onOpenSearch,
  onToggleFavorite,
}: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar__mobile">
        <button className="icon-button" type="button" onClick={onOpenLibrary} aria-label="打开题库" title="打开题库">
          <Menu aria-hidden="true" />
        </button>
      </div>
      <div className="topbar__crumb">
        <span>{question.sectionTitle.replace(/^Part\s*\d+[：:]?\s*/i, '')}</span>
        <strong>Q{question.number}</strong>
      </div>
      <div className="topbar__actions">
        <button className="icon-button topbar__search" type="button" onClick={onOpenSearch} aria-label="搜索题库" title="搜索题库（/）">
          <Search aria-hidden="true" /><kbd>/</kbd>
        </button>
        <button className={`icon-button${progress.favorite ? ' is-active' : ''}`} type="button" onClick={onToggleFavorite} aria-label={progress.favorite ? '取消收藏' : '收藏题目'} title={progress.favorite ? '取消收藏' : '收藏题目（F）'}>
          <Star aria-hidden="true" />
        </button>
        <span className="topbar__divider" />
        <button className="icon-button" type="button" onClick={onPrevious} disabled={!hasPrevious} aria-label="上一题" title="上一题（K）">
          <ArrowLeft aria-hidden="true" />
        </button>
        <button className="icon-button" type="button" onClick={onNext} disabled={!hasNext} aria-label="下一题" title="下一题（J）">
          <ArrowRight aria-hidden="true" />
        </button>
        <button
          className={`icon-button topbar__notes${notesOpen ? ' is-active' : ''}`}
          type="button"
          onClick={onToggleNotes}
          aria-label={notesOpen ? '收起批注' : '展开批注'}
          aria-pressed={notesOpen}
          title={`${notesOpen ? '收起' : '展开'}批注（N）`}
        >
          {notesOpen ? <PanelRightClose aria-hidden="true" /> : <PanelRightOpen aria-hidden="true" />}
        </button>
      </div>
    </header>
  )
}
