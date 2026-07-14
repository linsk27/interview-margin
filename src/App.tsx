import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, Highlighter, MessageSquareText } from 'lucide-react'
import { CommandPalette } from './components/CommandPalette'
import { DashboardDialog } from './components/DashboardDialog'
import { NotesPanel } from './components/NotesPanel'
import { Rail } from './components/Rail'
import { Reader } from './components/Reader'
import { SelectionMenu } from './components/SelectionMenu'
import { SettingsDialog } from './components/SettingsDialog'
import { Sidebar, type LibraryFilter } from './components/Sidebar'
import { StatusDock } from './components/StatusDock'
import { Topbar } from './components/Topbar'
import { UndoToast } from './components/UndoToast'
import { dateAfterDays } from './lib/format'
import { flattenQuestions, parseInterviewMarkdown, questionFromHash } from './lib/markdown'
import {
  exportStudyState,
  loadStudyState,
  parseStudyState,
  progressFor,
  saveStudyState,
  uid,
  withActivity,
} from './lib/storage'
import type {
  Annotation,
  HighlightColor,
  InterviewQuestion,
  InterviewSection,
  QuestionProgress,
  ReaderSettings,
  SelectionDraft,
  StudyState,
  StudyStatus,
} from './types'

interface ComposerDraft {
  quote: string
  color: HighlightColor
}

interface UndoState {
  annotation: Annotation
  index: number
}

function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  return Boolean(element?.closest('input, textarea, select, [contenteditable="true"]'))
}

export default function App() {
  const [sections, setSections] = useState<InterviewSection[]>([])
  const [loadError, setLoadError] = useState('')
  const [activeId, setActiveId] = useState('')
  const [state, setState] = useState<StudyState>(() => loadStudyState())
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<LibraryFilter>('all')
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [libraryCollapsed, setLibraryCollapsed] = useState(false)
  const [mobileNotesOpen, setMobileNotesOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [dashboardOpen, setDashboardOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selection, setSelection] = useState<SelectionDraft>()
  const [composer, setComposer] = useState<ComposerDraft>()
  const [undo, setUndo] = useState<UndoState>()
  const undoTimer = useRef<number | undefined>(undefined)

  const questions = useMemo(() => flattenQuestions(sections), [sections])
  const activeIndex = questions.findIndex((question) => question.id === activeId)
  const activeQuestion = questions[activeIndex]
  const activeProgress = activeQuestion ? progressFor(state, activeQuestion.id) : undefined
  const activeAnnotations = activeQuestion
    ? state.annotations.filter((annotation) => annotation.questionId === activeQuestion.id)
    : []

  const visibleQuestions = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return questions.filter((question) => {
      const progress = progressFor(state, question.id)
      const matchesQuery = !needle || `${question.title} ${question.plainText} ${question.tags.join(' ')}`.toLowerCase().includes(needle)
      const matchesFilter = filter === 'all'
        || (filter === 'favorite' && progress.favorite)
        || (filter === 'review' && (progress.status === 'review' || Boolean(progress.dueAt && new Date(progress.dueAt) <= new Date())))
        || (filter === 'mastered' && progress.status === 'mastered')
      return matchesQuery && matchesFilter
    })
  }, [filter, query, questions, state])

  const masteredCount = questions.filter((question) => progressFor(state, question.id).status === 'mastered').length
  const reviewCount = questions.filter((question) => {
    const progress = progressFor(state, question.id)
    return progress.status === 'review' || Boolean(progress.dueAt && new Date(progress.dueAt) <= new Date())
  }).length

  useEffect(() => {
    fetch('/interview.md')
      .then((response) => {
        if (!response.ok) throw new Error(`题库读取失败：HTTP ${response.status}`)
        return response.text()
      })
      .then((markdown) => {
        const parsed = parseInterviewMarkdown(markdown)
        if (!parsed.length) throw new Error('题库中没有识别到 Q 开头的二级标题。')
        setSections(parsed)
        const flat = flattenQuestions(parsed)
        setActiveId(questionFromHash(flat)?.id ?? flat[0].id)
      })
      .catch((error: Error) => setLoadError(error.message))
  }, [])

  useEffect(() => saveStudyState(state), [state])

  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme
    document.documentElement.style.colorScheme = state.settings.theme
  }, [state.settings.theme])

  useEffect(() => {
    const handleHistory = () => {
      const match = questionFromHash(questions)
      if (match) setActiveId(match.id)
    }
    window.addEventListener('popstate', handleHistory)
    return () => window.removeEventListener('popstate', handleHistory)
  }, [questions])

  useEffect(() => {
    if (!activeQuestion) return
    setSelection(undefined)
    setComposer(undefined)
    setState((current) => {
      const previous = progressFor(current, activeQuestion.id)
      return withActivity({
        ...current,
        progress: {
          ...current.progress,
          [activeQuestion.id]: {
            ...previous,
            status: previous.status === 'unread' ? 'learning' : previous.status,
            readCount: previous.readCount + 1,
            lastOpenedAt: new Date().toISOString(),
          },
        },
      })
    })
  }, [activeQuestion?.id])

  useEffect(() => {
    if (!activeQuestion) return
    let lastCommitted = Date.now()
    const commit = () => {
      if (document.visibilityState === 'hidden') return
      const now = Date.now()
      const seconds = Math.max(0, Math.round((now - lastCommitted) / 1000))
      lastCommitted = now
      if (!seconds) return
      setState((current) => {
        const previous = progressFor(current, activeQuestion.id)
        return {
          ...current,
          progress: {
            ...current.progress,
            [activeQuestion.id]: { ...previous, seconds: previous.seconds + seconds },
          },
        }
      })
    }
    const interval = window.setInterval(commit, 20_000)
    return () => {
      window.clearInterval(interval)
      commit()
    }
  }, [activeQuestion?.id])

  const openQuestion = (question: InterviewQuestion) => {
    if (question.id !== activeId) {
      window.history.pushState(null, '', `#${question.id}`)
      setActiveId(question.id)
    }
    setLibraryOpen(false)
  }

  const updateProgress = (patch: Partial<QuestionProgress>, recordActivity = false) => {
    if (!activeQuestion) return
    setState((current) => {
      const next = {
        ...current,
        progress: {
          ...current.progress,
          [activeQuestion.id]: { ...progressFor(current, activeQuestion.id), ...patch },
        },
      }
      return recordActivity ? withActivity(next) : next
    })
  }

  const setStatus = (status: StudyStatus) => {
    updateProgress({ status, dueAt: status === 'review' ? dateAfterDays(1) : undefined }, true)
  }

  const addAnnotation = (quote: string, note: string, color: HighlightColor) => {
    if (!activeQuestion) return
    const now = new Date().toISOString()
    const annotation: Annotation = {
      id: uid('annotation'),
      questionId: activeQuestion.id,
      quote,
      note,
      color,
      createdAt: now,
      updatedAt: now,
    }
    setState((current) => withActivity({ ...current, annotations: [...current.annotations, annotation] }))
    window.getSelection()?.removeAllRanges()
    setSelection(undefined)
  }

  const updateAnnotation = (id: string, note: string, color: HighlightColor) => {
    setState((current) => ({
      ...current,
      annotations: current.annotations.map((annotation) => annotation.id === id
        ? { ...annotation, note, color, updatedAt: new Date().toISOString() }
        : annotation),
    }))
  }

  const deleteAnnotation = (id: string) => {
    setState((current) => {
      const index = current.annotations.findIndex((annotation) => annotation.id === id)
      if (index < 0) return current
      window.clearTimeout(undoTimer.current)
      setUndo({ annotation: current.annotations[index], index })
      undoTimer.current = window.setTimeout(() => setUndo(undefined), 7000)
      return { ...current, annotations: current.annotations.filter((annotation) => annotation.id !== id) }
    })
  }

  const restoreAnnotation = () => {
    if (!undo) return
    setState((current) => {
      const annotations = [...current.annotations]
      annotations.splice(Math.min(undo.index, annotations.length), 0, undo.annotation)
      return { ...current, annotations }
    })
    setUndo(undefined)
  }

  const openNotes = () => {
    setState((current) => ({
      ...current,
      settings: { ...current.settings, notesOpen: true, focusMode: false },
    }))
    setMobileNotesOpen(true)
  }

  const closeNotes = () => {
    setState((current) => ({ ...current, settings: { ...current.settings, notesOpen: false } }))
    setMobileNotesOpen(false)
    setComposer(undefined)
  }

  const toggleNotes = () => {
    const notesAreVisible = state.settings.notesOpen && !state.settings.focusMode
    if (notesAreVisible) closeNotes()
    else openNotes()
  }

  const navigateRelative = (offset: number) => {
    const question = questions[activeIndex + offset]
    if (question) openQuestion(question)
  }

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      const commandKey = event.ctrlKey || event.metaKey
      if ((commandKey && event.key.toLowerCase() === 'k') || event.key === '/') {
        event.preventDefault()
        setCommandOpen(true)
        return
      }
      if (event.key.toLowerCase() === 'j') navigateRelative(1)
      if (event.key.toLowerCase() === 'k') navigateRelative(-1)
      if (event.key.toLowerCase() === 'm') setStatus('mastered')
      if (event.key.toLowerCase() === 'r') setStatus('review')
      if (event.key.toLowerCase() === 'f' && activeProgress) updateProgress({ favorite: !activeProgress.favorite }, true)
      if (event.key.toLowerCase() === 'n') toggleNotes()
      if (event.key === '?') setSettingsOpen(true)
    }
    window.addEventListener('keydown', handleKeyboard)
    return () => window.removeEventListener('keydown', handleKeyboard)
  })

  const importProgress = async (file: File) => {
    try {
      const imported = parseStudyState(await file.text())
      setState(imported)
    } catch (error) {
      const message = error instanceof Error ? error.message : '导入文件无法识别。'
      window.alert(message)
    }
  }

  const changeSettings = (settings: ReaderSettings) => setState((current) => ({ ...current, settings }))

  if (loadError) {
    return (
      <main className="load-state load-state--error">
        <AlertCircle aria-hidden="true" />
        <h1>题库没有载入</h1>
        <p>{loadError}</p>
        <button type="button" onClick={() => window.location.reload()}>重新读取</button>
      </main>
    )
  }

  if (!activeQuestion || !activeProgress) {
    return (
      <main className="load-state" aria-busy="true">
        <span className="load-state__mark"><Highlighter aria-hidden="true" /></span>
        <h1>正在编排题库</h1>
        <p>解析章节、题目与代码示例…</p>
        <span className="load-state__line" />
      </main>
    )
  }

  const notesVisible = state.settings.notesOpen && !state.settings.focusMode

  return (
    <div className={`app-shell${state.settings.focusMode ? ' is-focus-mode' : ''}${notesVisible ? '' : ' is-notes-closed'}${libraryCollapsed ? ' is-library-closed' : ''}`}>
      <Rail
        mastered={masteredCount}
        total={questions.length}
        reviewCount={reviewCount}
        focusMode={state.settings.focusMode}
        libraryCollapsed={libraryCollapsed}
        onOpenLibrary={() => { setLibraryCollapsed(false); setLibraryOpen(true) }}
        onToggleLibrary={() => setLibraryCollapsed((value) => !value)}
        onOpenDashboard={() => setDashboardOpen(true)}
        onOpenReview={() => { setFilter('review'); setLibraryCollapsed(false); setLibraryOpen(true) }}
        onToggleFocus={() => changeSettings({ ...state.settings, focusMode: !state.settings.focusMode })}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <Sidebar
        sections={sections}
        questions={visibleQuestions}
        activeId={activeId}
        state={state}
        query={query}
        filter={filter}
        mobileOpen={libraryOpen}
        onQueryChange={setQuery}
        onFilterChange={setFilter}
        onSelect={openQuestion}
        onOpenDashboard={() => { setLibraryOpen(false); setDashboardOpen(true) }}
        onOpenSettings={() => { setLibraryOpen(false); setSettingsOpen(true) }}
        onClose={() => setLibraryOpen(false)}
      />

      <section className="reading-desk">
        <Topbar
          question={activeQuestion}
          progress={activeProgress}
          notesOpen={notesVisible}
          hasPrevious={activeIndex > 0}
          hasNext={activeIndex < questions.length - 1}
          onPrevious={() => navigateRelative(-1)}
          onNext={() => navigateRelative(1)}
          onOpenLibrary={() => setLibraryOpen(true)}
          onToggleNotes={toggleNotes}
          onOpenSearch={() => setCommandOpen(true)}
          onToggleFavorite={() => updateProgress({ favorite: !activeProgress.favorite }, true)}
        />
        <Reader
          question={activeQuestion}
          annotations={activeAnnotations}
          readingSize={state.settings.readingSize}
          initialScrollTop={activeProgress.scrollTop ?? 0}
          onSelection={setSelection}
          onAnnotationClick={() => openNotes()}
          onScrollPosition={(scrollTop) => updateProgress({ scrollTop })}
        />
        <StatusDock value={activeProgress.status} onChange={setStatus} />
      </section>

      {notesVisible && (
        <NotesPanel
          question={activeQuestion}
          progress={activeProgress}
          annotations={activeAnnotations}
          composer={composer}
          mobileOpen={mobileNotesOpen}
          onClose={closeNotes}
          onNoteChange={(note) => updateProgress({ note })}
          onAddAnnotation={addAnnotation}
          onUpdateAnnotation={updateAnnotation}
          onDeleteAnnotation={deleteAnnotation}
          onComposerClose={() => setComposer(undefined)}
          onScheduleReview={(days) => updateProgress({ status: 'review', dueAt: dateAfterDays(days) }, true)}
        />
      )}

      <SelectionMenu
        selection={selection}
        onHighlight={(color) => selection && addAnnotation(selection.quote, '', color)}
        onAnnotate={() => {
          if (!selection) return
          setComposer({ quote: selection.quote, color: 'yellow' })
          openNotes()
          setSelection(undefined)
        }}
      />

      <CommandPalette open={commandOpen} questions={questions} state={state} onClose={() => setCommandOpen(false)} onSelect={openQuestion} />
      <DashboardDialog
        open={dashboardOpen}
        sections={sections}
        questions={questions}
        state={state}
        onClose={() => setDashboardOpen(false)}
        onSelect={openQuestion}
        onExport={() => exportStudyState(state)}
        onImport={importProgress}
      />
      <SettingsDialog open={settingsOpen} settings={state.settings} onClose={() => setSettingsOpen(false)} onChange={changeSettings} />

      {undo && <UndoToast message="批注已删除" onUndo={restoreAnnotation} onDismiss={() => setUndo(undefined)} />}
      {(libraryOpen || mobileNotesOpen) && <button className="mobile-scrim" type="button" onClick={() => { setLibraryOpen(false); setMobileNotesOpen(false) }} aria-label="关闭侧栏" />}
      <div className="sr-only" aria-live="polite">当前题目：{activeQuestion.title}</div>
      <footer className="app-colophon"><MessageSquareText aria-hidden="true" />记录仅保存在当前浏览器 · Q{activeQuestion.number} · {state.annotations.length} 条批注</footer>
    </div>
  )
}
