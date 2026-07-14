import {
  BookOpenCheck,
  ChartNoAxesCombined,
  Focus,
  ListRestart,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
} from 'lucide-react'

interface RailProps {
  mastered: number
  total: number
  reviewCount: number
  focusMode: boolean
  libraryCollapsed: boolean
  onOpenLibrary: () => void
  onToggleLibrary: () => void
  onOpenDashboard: () => void
  onOpenReview: () => void
  onToggleFocus: () => void
  onOpenSettings: () => void
}

function RailButton({ label, onClick, active, children }: {
  label: string
  onClick: () => void
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      className={`rail__button${active ? ' is-active' : ''}`}
      type="button"
      aria-label={label}
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
  libraryCollapsed,
  onOpenLibrary,
  onToggleLibrary,
  onOpenDashboard,
  onOpenReview,
  onToggleFocus,
  onOpenSettings,
}: RailProps) {
  const progress = total ? Math.round((mastered / total) * 100) : 0

  return (
    <nav className="rail" aria-label="主工具栏">
      <button className="rail__brand" type="button" onClick={onOpenLibrary} aria-label="打开题库" title="打开题库" data-tooltip="打开题库">
        <BookOpenCheck aria-hidden="true" />
      </button>

      <div className="rail__tools">
        <RailButton label={libraryCollapsed ? '展开题库侧栏' : '收起题库侧栏'} onClick={onToggleLibrary} active={!libraryCollapsed}>
          {libraryCollapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
        </RailButton>
        <RailButton label="学习概览" onClick={onOpenDashboard}><ChartNoAxesCombined aria-hidden="true" /></RailButton>
        <RailButton label={reviewCount ? `查看复习队列，共 ${reviewCount} 题` : '复习队列，当前为空'} onClick={onOpenReview}>
          <ListRestart aria-hidden="true" />
          {reviewCount > 0 && <span className="rail__badge">{reviewCount}</span>}
        </RailButton>
        <RailButton label="专注阅读" onClick={onToggleFocus} active={focusMode}><Focus aria-hidden="true" /></RailButton>
      </div>

      <div className="rail__progress" title={`已掌握 ${mastered}/${total}`} aria-label={`已掌握 ${progress}%`}>
        <span className="rail__progress-track"><span style={{ height: `${progress}%` }} /></span>
        <strong>{progress}</strong>
      </div>

      <RailButton label="阅读设置" onClick={onOpenSettings}><Settings2 aria-hidden="true" /></RailButton>
    </nav>
  )
}
