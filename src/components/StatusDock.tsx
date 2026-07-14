import { BookOpen, Check, Circle, RotateCcw } from 'lucide-react'
import type { StudyStatus } from '../types'
import { STATUS_LABELS } from '../types'

const OPTIONS: Array<{ status: StudyStatus; icon: React.ReactNode }> = [
  { status: 'unread', icon: <Circle aria-hidden="true" /> },
  { status: 'learning', icon: <BookOpen aria-hidden="true" /> },
  { status: 'review', icon: <RotateCcw aria-hidden="true" /> },
  { status: 'mastered', icon: <Check aria-hidden="true" /> },
]

export function StatusDock({ value, onChange }: { value: StudyStatus; onChange: (status: StudyStatus) => void }) {
  return (
    <aside className="status-dock" aria-label="掌握状态">
      <span className="status-dock__label">掌握状态</span>
      <div className="status-segment" role="radiogroup" aria-label="选择掌握状态">
        {OPTIONS.map((option) => (
          <button
            key={option.status}
            type="button"
            role="radio"
            aria-checked={value === option.status}
            className={value === option.status ? 'is-active' : ''}
            onClick={() => onChange(option.status)}
          >
            {option.icon}
            <span>{STATUS_LABELS[option.status]}</span>
          </button>
        ))}
      </div>
      <span className="status-dock__hint"><kbd>M</kbd> 掌握 · <kbd>R</kbd> 复习</span>
    </aside>
  )
}
