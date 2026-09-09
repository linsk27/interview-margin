import { useRef } from 'react'
import { BookOpen, Check, Circle, RotateCcw } from 'lucide-react'
import type { StudyStatus } from '../types'
import { STATUS_LABELS } from '../types'

const OPTIONS: Array<{ status: StudyStatus; icon: React.ReactNode }> = [
  { status: 'unread', icon: <Circle aria-hidden="true" /> },
  { status: 'learning', icon: <BookOpen aria-hidden="true" /> },
  { status: 'review', icon: <RotateCcw aria-hidden="true" /> },
  { status: 'mastered', icon: <Check aria-hidden="true" /> },
]

const STATUS_ORDER = OPTIONS.map((option) => option.status)

export function StatusDock({ value, onChange }: { value: StudyStatus; onChange: (status: StudyStatus) => void }) {
  const buttonRefs = useRef<Partial<Record<StudyStatus, HTMLButtonElement | null>>>({})

  const moveSelection = (current: StudyStatus, offset: number) => {
    const currentIndex = STATUS_ORDER.indexOf(current)
    const nextIndex = (currentIndex + offset + STATUS_ORDER.length) % STATUS_ORDER.length
    const nextStatus = STATUS_ORDER[nextIndex]
    onChange(nextStatus)
    buttonRefs.current[nextStatus]?.focus()
  }

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
            aria-label={STATUS_LABELS[option.status]}
            tabIndex={value === option.status ? 0 : -1}
            ref={(element) => { buttonRefs.current[option.status] = element }}
            className={value === option.status ? 'is-active' : ''}
            onClick={() => onChange(option.status)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                event.preventDefault()
                moveSelection(option.status, 1)
              } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                event.preventDefault()
                moveSelection(option.status, -1)
              } else if (event.key === 'Home') {
                event.preventDefault()
                onChange(STATUS_ORDER[0])
                buttonRefs.current[STATUS_ORDER[0]]?.focus()
              } else if (event.key === 'End') {
                event.preventDefault()
                onChange(STATUS_ORDER[STATUS_ORDER.length - 1])
                buttonRefs.current[STATUS_ORDER[STATUS_ORDER.length - 1]]?.focus()
              }
            }}
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
