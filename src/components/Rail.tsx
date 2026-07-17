import {
  BookOpenText,
  BookOpenCheck,
  ChartNoAxesCombined,
  Focus,
  ListRestart,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  LogIn,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import type { SessionUser } from '../types'

interface RailProps {
  mastered: number
  total: number
  reviewCount: number
  focusMode: boolean
  libraryOpen: boolean
  readerMode: boolean
  bankHubActive: boolean
  adminActive?: boolean
  user?: SessionUser | null
  onToggleLibrary: () => void
  onOpenQuestionBanks: () => void
  onOpenDashboard: () => void
  onOpenReview: () => void
  onToggleFocus: () => void
  onOpenSettings: () => void
  onOpenAdmin?: () => void
  onOpenAccount?: () => void
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
  readerMode,
  bankHubActive,
  adminActive = false,
  user = null,
  onToggleLibrary,
  onOpenQuestionBanks,
  onOpenDashboard,
  onOpenReview,
  onToggleFocus,
  onOpenSettings,
  onOpenAdmin = () => undefined,
  onOpenAccount = () => undefined,
}: RailProps) {
  const progress = total ? Math.round((mastered / total) * 100) : 0

  return (
    <nav className="rail" aria-label="主工具栏">
      <span className="rail__brand" role="img" aria-label="面试边注">
        <BookOpenCheck aria-hidden="true" />
      </span>

      <div className="rail__modules" aria-label="学习模块">
        <RailButton label="题库中心" onClick={onOpenQuestionBanks} active={bankHubActive} module>
          <BookOpenText aria-hidden="true" />
        </RailButton>
        {user?.permissions.includes('banks.write') && (
          <RailButton label="内容管理" onClick={onOpenAdmin} active={adminActive} module>
            <ShieldCheck aria-hidden="true" />
          </RailButton>
        )}
      </div>

      <div className="rail__tools">
        {readerMode && (
          <RailButton
            label={libraryOpen ? '收起题库侧栏' : '展开题库侧栏'}
            onClick={onToggleLibrary}
            active={libraryOpen}
            expanded={libraryOpen}
            controls="question-library"
          >
            {libraryOpen ? <PanelLeftClose aria-hidden="true" /> : <PanelLeftOpen aria-hidden="true" />}
          </RailButton>
        )}
        <RailButton label="学习概览" onClick={onOpenDashboard}><ChartNoAxesCombined aria-hidden="true" /></RailButton>
        <RailButton label={reviewCount ? `查看复习队列，共 ${reviewCount} 题` : '复习队列，当前为空'} onClick={onOpenReview}>
          <ListRestart aria-hidden="true" />
          {reviewCount > 0 && <span className="rail__badge">{reviewCount}</span>}
        </RailButton>
        {readerMode && <RailButton label="专注阅读" onClick={onToggleFocus} active={focusMode} pressed={focusMode}><Focus aria-hidden="true" /></RailButton>}
      </div>

      <div className="rail__progress" title={`已掌握 ${mastered}/${total}`} aria-label={`已掌握 ${progress}%`}>
        <span className="rail__progress-track"><span style={{ height: `${progress}%` }} /></span>
        <strong>{progress}</strong>
      </div>

      <RailButton label="阅读设置" onClick={onOpenSettings}><Settings2 aria-hidden="true" /></RailButton>
      <RailButton label={user ? `${user.displayName}：账号与同步` : '登录学习账号'} onClick={onOpenAccount} active={Boolean(user)}>
        {user ? <UserRound aria-hidden="true" /> : <LogIn aria-hidden="true" />}
      </RailButton>
    </nav>
  )
}
