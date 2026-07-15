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

export function AiAssistantDialog({ open, question, focusToken, onClose }: AiAssistantDialogProps) {
  const restoreFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
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
    >
      <section
        id="ai-dialog"
        className="ai-dialog__surface"
        role="dialog"
        aria-modal={false}
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
