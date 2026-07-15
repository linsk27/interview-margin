import { Bot, Sparkles } from 'lucide-react'

interface FloatingAiButtonProps {
  open: boolean
  onOpen: () => void
}

export function FloatingAiButton({ open, onOpen }: FloatingAiButtonProps) {
  return (
    <button
      className={`ai-fab${open ? ' is-open' : ''}`}
      type="button"
      onClick={onOpen}
      aria-label="打开 AI 学习助手"
      aria-controls="ai-dialog"
      aria-expanded={open}
      title="询问 AI"
    >
      <Bot aria-hidden="true" />
      <Sparkles className="ai-fab__sparkle" aria-hidden="true" />
    </button>
  )
}
