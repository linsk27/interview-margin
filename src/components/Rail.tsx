import {
  BookOpenText,
  BookOpenCheck,
  Braces,
  ChartNoAxesCombined,
  Focus,
  ListRestart,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
} from 'lucide-react'
import type { QuestionLibrary } from '../types'

interface RailProps {
  mastered: number
  total: number
  reviewCount: number
  focusMode: boolean
  libraryOpen: boolean
  library: QuestionLibrary
  onToggleLibrary: () => void
  onOpenLibrary: (library: QuestionLibrary) => void
  onOpenDashboard: () => void
  onOpenReview: () => void
  onToggleFocus: () => void
  onOpenSettings: () => void
}

function RailButton({ label, onClick, active, expanded, controls, pressed, module, children }: {
  label: string
  onClick: () => void
  active?: boolean
  expanded?: boolean
  controls?: string
  pressed?: boolean
  module?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      className={`rail__button${active ? ' is-active' : ''}${module ? ' is-module' : ''}`}
      type="button"
      aria-label={label}
      aria-controls={controls}
      aria-expanded={expanded}
      aria-pressed={module ? active : pressed}
      title={label}
      data-tooltip={label}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export function Rail({
  mastered,
  total,
  reviewCount,
  focusMode,
  libraryOpen,
  library,
  onToggleLibrary,
  onOpenLibrary,
  onOpenDashboard,
  onOpenReview,
  onToggleFocus,
  onOpenSettings,
}: RailProps) {
  const progress = total ? Math.round((mastered / total) * 100) : 0

  return (
    <nav className="rail" aria-label="主工具栏">
      <span className="rail__brand" role="img" aria-label="面试边注" title="面试边注" data-tooltip="面试边注">
        <BookOpenCheck aria-hidden="true" />
      </span>

      <div className="rail__modules" aria-label="题库模块">
        <RailButton label="面试问答题库" onClick={() => onOpenLibrary('interview')} active={library === 'interview'} module>
          <BookOpenText aria-hidden="true" />
        </RailButton>
        <RailButton label="JavaScript 100 题" onClick={() => onOpenLibrary('javascript')} active={library === 'javascript'} module>
          <Braces aria-hidden="true" />
        </RailButton>
      </div>

      <div className="rail__tools">
        <RailButton
          label={libraryOpen ? '收起题库侧栏' : '展开题库侧栏'}
          onClick={onToggleLibrary}
          active={libraryOpen}
          expanded={libraryOpen}
          controls="question-library"
        >
          {libraryOpen ? <PanelLeftClose aria-hidden="true" /> : <PanelLeftOpen aria-hidden="true" />}
        </RailButton>
        <RailButton label="学习概览" onClick={onOpenDashboard}><ChartNoAxesCombined aria-hidden="true" /></RailButton>
        <RailButton label={reviewCount ? `查看复习队列，共 ${reviewCount} 题` : '复习队列，当前为空'} onClick={onOpenReview}>
          <ListRestart aria-hidden="true" />
          {reviewCount > 0 && <span className="rail__badge">{reviewCount}</span>}
        </RailButton>
        <RailButton label="专注阅读" onClick={onToggleFocus} active={focusMode} pressed={focusMode}><Focus aria-hidden="true" /></RailButton>
      </div>

      <div className="rail__progress" title={`已掌握 ${mastered}/${total}`} aria-label={`已掌握 ${progress}%`}>
        <span className="rail__progress-track"><span style={{ height: `${progress}%` }} /></span>
        <strong>{progress}</strong>
      </div>

      <RailButton label="阅读设置" onClick={onOpenSettings}><Settings2 aria-hidden="true" /></RailButton>
    </nav>
  )
}
