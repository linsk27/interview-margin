import { Check, Circle, Clock3, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { progressFor } from '../lib/storage'
import type { InterviewQuestion, StudyState } from '../types'

export function CommandPalette({ open, questions, state, onClose, onSelect }: {
  open: boolean
  questions: InterviewQuestion[]
  state: StudyState
  onClose: () => void
  onSelect: (question: InterviewQuestion) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return questions.slice(0, 14)
    return questions.filter((question) => `${question.title} ${question.plainText} ${question.tags.join(' ')}`.toLowerCase().includes(needle)).slice(0, 24)
  }, [query, questions])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      setQuery('')
      setActiveIndex(0)
      window.setTimeout(() => inputRef.current?.focus(), 0)
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  useEffect(() => setActiveIndex(0), [query])

  const choose = (question: InterviewQuestion) => {
    onSelect(question)
    onClose()
  }

  return (
    <dialog className="command-dialog" ref={dialogRef} onClose={onClose} onCancel={onClose}>
      <div className="command-dialog__search">
        <Search aria-hidden="true" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索题目、技术点或项目…"
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setActiveIndex((index) => Math.min(index + 1, results.length - 1))
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActiveIndex((index) => Math.max(index - 1, 0))
            }
            if (event.key === 'Enter' && results[activeIndex]) choose(results[activeIndex])
          }}
        />
        <button type="button" onClick={onClose} aria-label="关闭搜索" title="关闭搜索"><X aria-hidden="true" /></button>
      </div>
      <div className="command-dialog__meta">
        <span>{results.length} 个结果</span>
        <span><kbd>↑↓</kbd> 选择 <kbd>Enter</kbd> 打开 <kbd>Esc</kbd> 关闭</span>
      </div>
      <div className="command-dialog__results" role="listbox" aria-label="搜索结果">
        {results.map((question, index) => {
          const progress = progressFor(state, question.id)
          return (
            <button
              key={question.id}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={index === activeIndex ? 'is-active' : ''}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(question)}
            >
              <span className={`command-dialog__status status-${progress.status}`}>
                {progress.status === 'mastered' ? <Check aria-hidden="true" /> : progress.status === 'review' ? <Clock3 aria-hidden="true" /> : <Circle aria-hidden="true" />}
              </span>
              <span className="command-dialog__number">Q{question.number}</span>
              <span>
                <strong>{question.title.replace(/^Q[\d.]+[：:]?\s*/, '')}</strong>
                <small>{question.sectionTitle.replace(/^Part\s*\d+[：:]?\s*/i, '')}</small>
              </span>
              <span className="command-dialog__tags">{question.tags.slice(0, 2).join(' · ')}</span>
            </button>
          )
        })}
        {!results.length && <p className="command-dialog__empty">没有找到匹配内容。试试 “SSE”“索引” 或 “字段联动”。</p>}
      </div>
    </dialog>
  )
}
