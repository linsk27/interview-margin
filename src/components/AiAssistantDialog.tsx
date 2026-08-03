import { useEffect, useRef } from 'react'
import { AiAssistant } from './AiAssistant'
import type { InterviewQuestion } from '../types'
import styles from './AiAssistant.module.css'

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
      className={`ai-dialog ${styles.dialogRoot}${open ? ` is-open ${styles.dialogOpen}` : ''}`}
      aria-hidden={!open}
    >
      <section
        id="ai-dialog"
        className={styles.surface}
        role="dialog"
        aria-modal={false}
        aria-labelledby="ai-assistant-title"
        tabIndex={-1}
      >
        <AiAssistant question={question} focusToken={focusToken} onClose={onClose} />
      </section>
    </div>
  )
}
