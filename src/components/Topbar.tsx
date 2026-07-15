import { ArrowLeft, ArrowRight, BookOpen, FileText, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Search, Star } from 'lucide-react'
import type { InterviewQuestion, PageLayout, QuestionProgress } from '../types'

interface TopbarProps {
  question: InterviewQuestion
  progress: QuestionProgress
  libraryOpen: boolean
  notesOpen: boolean
  pageLayout: PageLayout
  spreadAvailable: boolean
  hasPrevious: boolean
  hasNext: boolean
  onPrevious: () => void
  onNext: () => void
  onToggleLibrary: () => void
  onToggleNotes: () => void
  onPageLayoutChange: (layout: PageLayout) => void
  onOpenSearch: () => void
  onToggleFavorite: () => void
}

export function Topbar({
  question,
  progress,
  libraryOpen,
  notesOpen,
  pageLayout,
  spreadAvailable,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  onToggleLibrary,
  onToggleNotes,
  onPageLayoutChange,
  onOpenSearch,
  onToggleFavorite,
}: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar__mobile">
        <button
          className={`icon-button${libraryOpen ? ' is-active' : ''}`}
          type="button"
          onClick={onToggleLibrary}
          aria-label={libraryOpen ? '收起题库' : '展开题库'}
          aria-controls="question-library"
          aria-expanded={libraryOpen}
          title={libraryOpen ? '收起题库' : '展开题库'}
        >
          {libraryOpen ? <PanelLeftClose aria-hidden="true" /> : <PanelLeftOpen aria-hidden="true" />}
        </button>
      </div>
      <div className="topbar__crumb">
        <span>{question.sectionTitle.replace(/^Part\s*\d+[：:]?\s*/i, '')}</span>
        <strong>Q{question.number}</strong>
      </div>
      <div className="topbar__actions">
        <div className="topbar__layout-switch" role="radiogroup" aria-label="阅读版式">
          <button
            type="button"
            role="radio"
            aria-checked={pageLayout === 'single'}
            className={pageLayout === 'single' ? 'is-active' : ''}
            onClick={() => onPageLayoutChange('single')}
            aria-label="单页阅读"
            title="单页阅读"
          >
            <FileText aria-hidden="true" />
            <span>单页</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={pageLayout === 'spread'}
            className={pageLayout === 'spread' ? 'is-active' : ''}
            onClick={() => onPageLayoutChange('spread')}
            disabled={!spreadAvailable}
            aria-label="双页阅读"
            title={spreadAvailable ? '双页阅读' : '当前阅读区域宽度不足'}
          >
            <BookOpen aria-hidden="true" />
            <span>双页</span>
          </button>
        </div>
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
          aria-controls="notes-panel"
          aria-expanded={notesOpen}
          title={`${notesOpen ? '收起' : '展开'}批注（N）`}
        >
          {notesOpen ? <PanelRightClose aria-hidden="true" /> : <PanelRightOpen aria-hidden="true" />}
        </button>
      </div>
    </header>
  )
}
