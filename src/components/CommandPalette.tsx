import { Check, Circle, Clock3, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { searchCatalogPage, type CatalogSearchPage } from '../lib/api'
import { progressFor } from '../lib/storage'
import type { InterviewQuestion, QuestionBankDefinition, StudyState } from '../types'

const PAGE_SIZE = 24
const resultId = (id: string) => `search-result-${encodeURIComponent(id)}`

export function CommandPalette({ open, questions, banks = [], state, onClose, onSelect }: {
  open: boolean
  questions: InterviewQuestion[]
  banks?: QuestionBankDefinition[]
  state: StudyState
  onClose: () => void
  onSelect: (question: InterviewQuestion) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined])
  const [pageIndex, setPageIndex] = useState(0)
  const [remote, setRemote] = useState<{ key: string; page?: CatalogSearchPage; failed?: boolean }>()
  const [retry, setRetry] = useState(0)
  const needle = query.trim()
  const cursor = cursors[pageIndex]
  const requestKey = JSON.stringify([needle, cursor, retry])
  const response = remote?.key === requestKey ? remote : undefined
  const fallback = Boolean(response?.failed)
  const loading = Boolean(needle && !response)

  const localMatches = useMemo(() => {
    const lower = needle.toLowerCase()
    return questions.filter((question) => `${question.title} ${question.plainText} ${question.tags.join(' ')} ${(question.aliases ?? []).join(' ')}`.toLowerCase().includes(lower))
  }, [needle, questions])
  const results = !needle ? questions.slice(0, 14)
    : fallback ? localMatches.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE)
      : (response?.page?.results ?? []).map((result) => ({
          ...result, body: '', plainText: '',
          ...questions.find((question) => question.id === result.id),
          bankTitle: result.bankTitle,
          matchSnippet: result.matchSnippet ?? result.snippet,
        }))
  const total = fallback ? localMatches.length : response?.page?.total
  const hasNext = fallback ? (pageIndex + 1) * PAGE_SIZE < localMatches.length : Boolean(response?.page?.hasMore)
  const activeResult = results[activeIndex]

  const changeQuery = (value: string) => {
    setQuery(value)
    setPageIndex(0)
    setCursors([undefined])
    setActiveIndex(0)
  }

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      changeQuery('')
      inputRef.current?.focus()
    } else if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    if (!open || !needle) return
    const controller = new AbortController()
    let current = true
    let timeout: ReturnType<typeof setTimeout>
    const timer = setTimeout(() => {
      timeout = setTimeout(() => controller.abort(), 8000)
      searchCatalogPage(needle, { limit: PAGE_SIZE, cursor }, controller.signal)
        .then((page) => { if (current) setRemote({ key: requestKey, page }) })
        .catch(() => {
          if (current) {
            setRemote({ key: requestKey, failed: true })
            setPageIndex(0)
          }
        })
        .finally(() => clearTimeout(timeout))
    }, 250)
    return () => {
      current = false
      clearTimeout(timer)
      clearTimeout(timeout)
      controller.abort()
    }
  }, [open, needle, cursor, requestKey])

  useEffect(() => {
    if (activeResult) document.getElementById(resultId(activeResult.id))?.scrollIntoView?.({ block: 'nearest' })
  }, [activeResult?.id])

  const choose = (question: InterviewQuestion) => {
    onSelect(question)
    onClose()
  }

  const changePage = (direction: number) => {
    if (direction > 0 && !fallback) {
      setCursors((current) => [...current.slice(0, pageIndex + 1), response?.page?.nextCursor ?? undefined])
    }
    setPageIndex((current) => current + direction)
    setActiveIndex(0)
    inputRef.current?.focus()
  }

  return (
    <dialog className="command-dialog" ref={dialogRef} aria-label="搜索全部题库" onClose={onClose} onCancel={onClose}>
      <div className="command-dialog__search">
        <Search aria-hidden="true" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => changeQuery(event.target.value)}
          placeholder="搜索全部题库：题目、正文或技术点"
          aria-label="搜索全部题库"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="catalog-search-results"
          aria-activedescendant={activeResult ? resultId(activeResult.id) : undefined}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault()
              setActiveIndex((index) => Math.max(0, Math.min(index + (event.key === 'ArrowDown' ? 1 : -1), results.length - 1)))
            }
            if (event.key === 'Enter' && activeResult) { event.preventDefault(); choose(activeResult) }
          }}
        />
        <button type="button" onClick={onClose} aria-label="关闭搜索" title="关闭搜索"><X aria-hidden="true" /></button>
      </div>
      <div className="command-dialog__meta">
        <span role="status">{!needle ? '输入关键词，搜索所有题库正文' : loading ? '正在搜索全部题库…'
          : `${total === undefined ? `本页 ${results.length}` : `共 ${total}`} 个结果${total ? ` · 第 ${pageIndex + 1} 页` : ''}`}</span>
        <span><kbd>↑↓</kbd> 选择 <kbd>Enter</kbd> 打开 <kbd>Esc</kbd> 关闭</span>
      </div>
      {fallback && <div className="command-dialog__notice" role="status">
        <span>全站搜索暂时不可用，当前仅匹配本机已加载的题目；未打开题库的正文可能缺失。</span>
        <button type="button" onClick={() => { setPageIndex(0); setCursors([undefined]); setRetry((value) => value + 1) }}>重试全站搜索</button>
      </div>}
      <div className="command-dialog__results" id="catalog-search-results" role="listbox" aria-label="搜索结果" aria-busy={loading}>
        {results.map((question, index) => {
          const progress = progressFor(state, question.id)
          const bankTitle = 'bankTitle' in question ? String(question.bankTitle) : banks.find((bank) => bank.id === question.library)?.title
          const snippet = 'matchSnippet' in question ? question.matchSnippet as string | undefined : undefined
          return (
            <button
              key={question.id}
              id={resultId(question.id)}
              type="button"
              role="option"
              tabIndex={-1}
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
                <small>{[bankTitle, question.sectionTitle.replace(/^Part\s*\d+[：:]?\s*/i, '')].filter(Boolean).join(' · ')}</small>
                {snippet && <span className="command-dialog__snippet">{snippet}</span>}
              </span>
              <span className="command-dialog__tags">{question.tags.slice(0, 2).join(' · ')}</span>
            </button>
          )
        })}
      </div>
      {loading && <p className="command-dialog__empty">正在查找题目与正文中的匹配内容…</p>}
      {!loading && !results.length && <div className="command-dialog__empty">
        <p>没有找到匹配内容。试试更短的关键词，如“SSE”或“索引”。</p>
        <button type="button" onClick={() => { changeQuery(''); inputRef.current?.focus() }}>清除关键词</button>
      </div>}
      {needle && !loading && (pageIndex > 0 || hasNext) && <nav className="command-dialog__pagination" aria-label="搜索结果分页">
        <button type="button" disabled={pageIndex === 0} onClick={() => changePage(-1)}>上一页</button>
        <span>第 {pageIndex + 1} 页 · 每页最多 {PAGE_SIZE} 条</span>
        <button type="button" disabled={!hasNext} onClick={() => changePage(1)}>下一页</button>
      </nav>}
    </dialog>
  )
}
