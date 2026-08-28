import { ArrowLeft, ArrowRight, BookOpen, Brain, FileText, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Search, Star } from 'lucide-react'
import type { InterviewQuestion, PageLayout, QuestionProgress } from '../types'

interface TopbarProps {
  question: InterviewQuestion
  progress: QuestionProgress
  libraryOpen: boolean
  notesOpen: boolean
  workspaceOpen?: boolean
  pageLayout: PageLayout
  spreadAvailable: boolean
  practiceMode?: boolean
  notesDisabled?: boolean
  hasPrevious: boolean
  hasNext: boolean
  onPrevious: () => void
  onNext: () => void
  onToggleLibrary: () => void
  onToggleNotes: () => void
  onPageLayoutChange: (layout: PageLayout) => void
  onTogglePracticeMode?: () => void
  onOpenSearch: () => void
  onToggleFavorite: () => void
}

export function Topbar({
  question,
  progress,
  libraryOpen,
  notesOpen,
  workspaceOpen = notesOpen,
  pageLayout,
  spreadAvailable,
  practiceMode = false,
  notesDisabled = false,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  onToggleLibrary,
  onToggleNotes,
  onPageLayoutChange,
  onTogglePracticeMode = () => undefined,
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
        <button
          className={`topbar__practice${practiceMode ? ' is-active' : ''}`}
          type="button"
          aria-label="刷题模式"
          aria-pressed={practiceMode}
          onClick={onTogglePracticeMode}
          title={practiceMode ? '退出刷题模式，查看完整答案' : '进入刷题模式，先作答再揭晓'}
        >
          <Brain aria-hidden="true" />
          <span>{practiceMode ? '刷题中' : '刷题'}</span>
        </button>
        {!practiceMode && <div className="topbar__layout-switch" role="radiogroup" aria-label="阅读版式">
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
        </div>}
        <button className="icon-button topbar__search" type="button" onClick={onOpenSearch} aria-label="搜索全部题库" title="搜索全部题库（/）">
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
          disabled={notesDisabled}
          aria-label={notesDisabled ? '批注工作区（揭晓标准答案后可用）' : notesOpen ? '收起批注工作区' : workspaceOpen ? '切换到批注' : '展开批注工作区'}
          aria-controls="notes-panel"
          aria-expanded={workspaceOpen}
          title={notesDisabled ? '揭晓标准答案后可使用批注工作区' : `${notesOpen ? '收起批注工作区' : workspaceOpen ? '切换到批注' : '展开批注工作区'}（N）`}
        >
          {notesOpen ? <PanelRightClose aria-hidden="true" /> : <PanelRightOpen aria-hidden="true" />}
        </button>
      </div>
    </header>
  )
}
