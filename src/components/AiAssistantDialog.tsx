import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { AiAssistant } from './AiAssistant'
import type { InterviewQuestion } from '../types'

interface AiAssistantDialogProps {
  open: boolean
  question: InterviewQuestion
  focusToken: number
  onClose: () => void
}

function focusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(
    'button:not([disabled]), textarea:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )).filter((element) => !element.hasAttribute('hidden'))
}

export function AiAssistantDialog({ open, question, focusToken, onClose }: AiAssistantDialogProps) {
  const panelRef = useRef<HTMLElement>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab' || !panelRef.current) return
      const elements = focusableElements(panelRef.current)
      if (!elements.length) return

      const first = elements[0]
      const last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      restoreFocusRef.current?.focus()
      restoreFocusRef.current = null
    }
  }, [onClose, open])

  return (
    <div
      className={`ai-dialog${open ? ' is-open' : ''}`}
      aria-hidden={!open}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <section
        ref={panelRef}
        id="ai-dialog"
        className="ai-dialog__surface"
        role="dialog"
        aria-modal={open}
        aria-labelledby="ai-assistant-title"
        tabIndex={-1}
      >
        <button className="icon-button ai-dialog__close" type="button" onClick={onClose} aria-label="关闭 AI 助手" title="关闭 AI 助手">
          <X aria-hidden="true" />
        </button>
        <AiAssistant question={question} focusToken={focusToken} />
      </section>
    </div>
  )
}
