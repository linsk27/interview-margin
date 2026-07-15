import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, Highlighter, MessageSquareText } from 'lucide-react'
import { CommandPalette } from './components/CommandPalette'
import { DashboardDialog } from './components/DashboardDialog'
import { AiAssistantDialog } from './components/AiAssistantDialog'
import { FloatingAiButton } from './components/FloatingAiButton'
import { NotesPanel } from './components/NotesPanel'
import { QuestionBankHub } from './components/QuestionBankHub'
import { Rail } from './components/Rail'
import { Reader } from './components/Reader'
import { SelectionMenu } from './components/SelectionMenu'
import { SettingsDialog } from './components/SettingsDialog'
import { Sidebar, type LibraryFilter } from './components/Sidebar'
import { StatusDock } from './components/StatusDock'
import { Topbar } from './components/Topbar'
import { UndoToast } from './components/UndoToast'
import { QUESTION_BANKS, questionBankFor } from './data/questionBanks'
import { dateAfterDays } from './lib/format'
import {
  isFocusMode,
  setFocusMode,
  toggleFocusMode as transitionFocusMode,
  toggleLibrary as transitionLibrary,
  type DrawerState,
} from './lib/drawerState'
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
  PageLayout,
  QuestionBankDefinition,
  QuestionProgress,
  QuestionLibrary,
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

type WorkspaceView = 'reader' | 'banks'

function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  return Boolean(element?.closest('input, textarea, select, [contenteditable="true"]'))
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])

  return matches
}

export default function App() {
  const [sections, setSections] = useState<InterviewSection[]>([])
  const [loadError, setLoadError] = useState('')
  const [activeId, setActiveId] = useState('')
  const [state, setState] = useState<StudyState>(() => loadStudyState())
  const [drawerState, setDrawerState] = useState<DrawerState>(() => (
    state.settings.focusMode
      ? setFocusMode(true)
      : { libraryOpen: true, notesOpen: state.settings.notesOpen }
  ))
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<LibraryFilter>('all')
  const [mobileLibraryOpen, setMobileLibraryOpen] = useState(false)
  const [mobileNotesOpen, setMobileNotesOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [dashboardOpen, setDashboardOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [assistantFocusToken, setAssistantFocusToken] = useState(0)
  const [library, setLibrary] = useState<QuestionLibrary>(QUESTION_BANKS[0].id)
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>(() => (
    window.location.hash === '#question-banks' ? 'banks' : 'reader'
  ))
  const [spreadAvailable, setSpreadAvailable] = useState(false)
  const [selection, setSelection] = useState<SelectionDraft>()
  const [composer, setComposer] = useState<ComposerDraft>()
  const [undo, setUndo] = useState<UndoState>()
  const undoTimer = useRef<number | undefined>(undefined)
  const desktopLibraryLayout = useMediaQuery('(min-width: 60rem)')
  const wideNotesLayout = useMediaQuery('(min-width: 76rem)')

  const questions = useMemo(() => flattenQuestions(sections), [sections])
  const activeIndex = questions.findIndex((question) => question.id === activeId)
  const activeQuestion = questions[activeIndex]
  const activeLibraryQuestions = activeQuestion
    ? questions.filter((question) => question.library === activeQuestion.library)
    : []
  const activeLibraryIndex = activeLibraryQuestions.findIndex((question) => question.id === activeId)
  const activeProgress = activeQuestion ? progressFor(state, activeQuestion.id) : undefined
  const activeAnnotations = activeQuestion
    ? state.annotations.filter((annotation) => annotation.questionId === activeQuestion.id)
    : []

  const visibleQuestions = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return questions.filter((question) => {
      if (question.library !== library) return false
      const progress = progressFor(state, question.id)
      const matchesQuery = !needle || `${question.title} ${question.plainText} ${question.tags.join(' ')}`.toLowerCase().includes(needle)
      const matchesFilter = filter === 'all'
        || (filter === 'favorite' && progress.favorite)
        || (filter === 'review' && (progress.status === 'review' || Boolean(progress.dueAt && new Date(progress.dueAt) <= new Date())))
        || (filter === 'mastered' && progress.status === 'mastered')
      return matchesQuery && matchesFilter
    })
  }, [filter, library, query, questions, state])

  const currentLibraryQuestions = questions.filter((question) => question.library === library)
  const currentBank = questionBankFor(library) ?? QUESTION_BANKS[0]
  const readerMode = workspaceView === 'reader'
  const railQuestions = readerMode ? currentLibraryQuestions : questions
  const railMasteredCount = railQuestions.filter((question) => progressFor(state, question.id).status === 'mastered').length
  const railReviewCount = railQuestions.filter((question) => {
    const progress = progressFor(state, question.id)
    return progress.status === 'review' || Boolean(progress.dueAt && new Date(progress.dueAt) <= new Date())
  }).length
  const focusMode = isFocusMode(drawerState)
  const libraryExpanded = desktopLibraryLayout ? drawerState.libraryOpen : mobileLibraryOpen
  const notesVisible = drawerState.notesOpen
  const notesExpanded = notesVisible && (wideNotesLayout || mobileNotesOpen)

  useEffect(() => {
    if (desktopLibraryLayout) setMobileLibraryOpen(false)
  }, [desktopLibraryLayout])

  useEffect(() => {
    if (wideNotesLayout) setMobileNotesOpen(false)
  }, [wideNotesLayout])

  useEffect(() => {
    setState((current) => {
      if (current.settings.focusMode === focusMode && current.settings.notesOpen === drawerState.notesOpen) {
        return current
      }
      return {
        ...current,
        settings: {
          ...current.settings,
          focusMode,
          notesOpen: drawerState.notesOpen,
        },
      }
    })
  }, [drawerState.notesOpen, focusMode])

  useEffect(() => {
    let cancelled = false

    Promise.all(QUESTION_BANKS.map(async (bank) => {
      const response = await fetch(bank.source)
      if (!response.ok) throw new Error(`${bank.title}读取失败：HTTP ${response.status}`)
      const markdown = await response.text()
      const parsed = parseInterviewMarkdown(markdown, {
        library: bank.id,
        idPrefix: bank.idPrefix,
        baseTags: bank.baseTags,
      })
      if (!parsed.length) throw new Error(`${bank.title}中没有识别到 Q 开头的二级标题。`)
      return parsed
    }))
      .then((loadedBanks) => {
        if (cancelled) return
        const loadedSections = loadedBanks.flat()
        const loadedQuestions = flattenQuestions(loadedSections)
        const hashQuestion = questionFromHash(loadedQuestions)
        setSections(loadedSections)
        setActiveId(hashQuestion?.id ?? loadedQuestions[0].id)
        if (hashQuestion) setLibrary(hashQuestion.library)
      })
      .catch((error: Error) => {
        if (!cancelled) setLoadError(error.message)
      })

    return () => { cancelled = true }
  }, [])

  useEffect(() => saveStudyState(state), [state])

  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme
    document.documentElement.style.colorScheme = state.settings.theme
  }, [state.settings.theme])

  useEffect(() => {
    const handleHistory = () => {
      if (window.location.hash === '#question-banks') {
        setWorkspaceView('banks')
        return
      }
      const match = questionFromHash(questions)
      if (match) {
        setActiveId(match.id)
        setLibrary(match.library)
        setWorkspaceView('reader')
      }
    }
    window.addEventListener('popstate', handleHistory)
    return () => window.removeEventListener('popstate', handleHistory)
  }, [questions])

  useEffect(() => {
    if (!activeQuestion || workspaceView !== 'reader') return
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
  }, [activeQuestion?.id, workspaceView])

  useEffect(() => {
    if (!activeQuestion || workspaceView !== 'reader') return
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
  }, [activeQuestion?.id, workspaceView])

  const openQuestion = (question: InterviewQuestion) => {
    setLibrary(question.library)
    setWorkspaceView('reader')
    if (question.id !== activeId || window.location.hash !== `#${question.id}`) {
      window.history.pushState(null, '', `#${question.id}`)
      setActiveId(question.id)
    }
    setMobileLibraryOpen(false)
  }

  const openQuestionBank = (bank: QuestionBankDefinition) => {
    setLibrary(bank.id)
    setWorkspaceView('reader')
    setQuery('')
    setFilter('all')
    setDrawerState((current) => ({ ...current, libraryOpen: true }))
    const firstQuestion = questions.find((question) => question.library === bank.id)
    if (firstQuestion) openQuestion(firstQuestion)
  }

  const openQuestionBanks = () => {
    if (window.location.hash !== '#question-banks') {
      window.history.pushState(null, '', '#question-banks')
    }
    setWorkspaceView('banks')
    setMobileLibraryOpen(false)
    setMobileNotesOpen(false)
    setAssistantOpen(false)
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
    setDrawerState((current) => ({ ...current, notesOpen: true }))
    setMobileLibraryOpen(false)
    setMobileNotesOpen(!wideNotesLayout)
  }

  const openAssistant = () => {
    setAssistantOpen(true)
    setAssistantFocusToken((current) => current + 1)
  }

  const closeNotes = () => {
    setDrawerState((current) => ({ ...current, notesOpen: false }))
    setMobileNotesOpen(false)
    setComposer(undefined)
  }

  const toggleNotes = () => {
    if (notesExpanded) closeNotes()
    else openNotes()
  }

  const toggleMobileLibrary = () => {
    const nextOpen = !libraryExpanded
    setMobileLibraryOpen(nextOpen)
    setDrawerState((current) => ({ ...current, libraryOpen: nextOpen }))
    if (nextOpen) {
      setMobileNotesOpen(false)
    }
  }

  const toggleDesktopLibrary = () => {
    setDrawerState(transitionLibrary)
  }

  const toggleFocus = () => {
    setDrawerState(transitionFocusMode)
    setMobileLibraryOpen(false)
    setMobileNotesOpen(false)
  }

  const openReviewLibrary = () => {
    const reviewQuestion = currentLibraryQuestions.find((question) => {
      const progress = progressFor(state, question.id)
      return progress.status === 'review' || Boolean(progress.dueAt && new Date(progress.dueAt) <= new Date())
    })
    if (reviewQuestion) openQuestion(reviewQuestion)
    else if (activeQuestion) openQuestion(activeQuestion)
    setFilter('review')
    setDrawerState((current) => ({ ...current, libraryOpen: true }))
  }

  const navigateRelative = (offset: number) => {
    const question = activeLibraryQuestions[activeLibraryIndex + offset]
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
      if (workspaceView !== 'reader') return
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
      setDrawerState(imported.settings.focusMode
        ? setFocusMode(true)
        : { libraryOpen: true, notesOpen: imported.settings.notesOpen })
      setMobileLibraryOpen(false)
      setMobileNotesOpen(false)
      setState(imported)
    } catch (error) {
      const message = error instanceof Error ? error.message : '导入文件无法识别。'
      window.alert(message)
    }
  }

  const changeSettings = (settings: ReaderSettings) => {
    const nextDrawerState = settings.focusMode === focusMode
      ? drawerState
      : setFocusMode(settings.focusMode)

    if (nextDrawerState !== drawerState) {
      setDrawerState(nextDrawerState)
      setMobileLibraryOpen(false)
      setMobileNotesOpen(false)
    }
    setState((current) => ({
      ...current,
      settings: {
        ...settings,
        focusMode: isFocusMode(nextDrawerState),
        notesOpen: nextDrawerState.notesOpen,
      },
    }))
  }

  const changePageLayout = (pageLayout: PageLayout) => {
    setState((current) => ({
      ...current,
      settings: { ...current.settings, pageLayout },
    }))
  }

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

  return (
    <div className={`app-shell${workspaceView === 'banks'
      ? ' is-bank-hub is-notes-closed is-library-closed'
      : `${focusMode ? ' is-focus-mode' : ''}${notesVisible ? '' : ' is-notes-closed'}${drawerState.libraryOpen ? '' : ' is-library-closed'}`}`}>
      <Rail
        mastered={railMasteredCount}
        total={railQuestions.length}
        reviewCount={railReviewCount}
        focusMode={focusMode}
        libraryOpen={libraryExpanded}
        readerMode={readerMode}
        bankHubActive={workspaceView === 'banks'}
        onToggleLibrary={toggleDesktopLibrary}
        onOpenQuestionBanks={openQuestionBanks}
        onOpenDashboard={() => setDashboardOpen(true)}
        onOpenReview={openReviewLibrary}
        onToggleFocus={toggleFocus}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {workspaceView === 'banks' ? (
        <QuestionBankHub
          banks={QUESTION_BANKS}
          questions={questions}
          state={state}
          currentBankId={library}
          onOpenBank={openQuestionBank}
          onOpenDashboard={() => setDashboardOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      ) : (
        <>
          <Sidebar
        sections={sections}
        questions={visibleQuestions}
        activeId={activeId}
        state={state}
        query={query}
        filter={filter}
        bank={currentBank}
        mobileOpen={mobileLibraryOpen}
        onQueryChange={setQuery}
        onFilterChange={setFilter}
        onSelect={openQuestion}
        onOpenQuestionBanks={openQuestionBanks}
        onOpenDashboard={() => { setMobileLibraryOpen(false); setDashboardOpen(true) }}
        onOpenSettings={() => { setMobileLibraryOpen(false); setSettingsOpen(true) }}
        onClose={() => setMobileLibraryOpen(false)}
          />

          <section className="reading-desk">
        <Topbar
          question={activeQuestion}
          progress={activeProgress}
          libraryOpen={libraryExpanded}
          notesOpen={notesExpanded}
          pageLayout={state.settings.pageLayout}
          spreadAvailable={spreadAvailable}
          hasPrevious={activeLibraryIndex > 0}
          hasNext={activeLibraryIndex < activeLibraryQuestions.length - 1}
          onPrevious={() => navigateRelative(-1)}
          onNext={() => navigateRelative(1)}
          onToggleLibrary={toggleMobileLibrary}
          onToggleNotes={toggleNotes}
          onPageLayoutChange={changePageLayout}
          onOpenSearch={() => setCommandOpen(true)}
          onToggleFavorite={() => updateProgress({ favorite: !activeProgress.favorite }, true)}
        />
        <Reader
          question={activeQuestion}
          annotations={activeAnnotations}
          readingSize={state.settings.readingSize}
          pageLayout={state.settings.pageLayout}
          initialScrollTop={activeProgress.scrollTop ?? 0}
          initialSpreadIndex={activeProgress.spreadIndex ?? 0}
          onSelection={setSelection}
          onAnnotationClick={() => openNotes()}
          onScrollPosition={(scrollTop) => updateProgress({ scrollTop })}
          onSpreadChange={(spreadIndex) => updateProgress({ spreadIndex })}
          onSpreadAvailabilityChange={setSpreadAvailable}
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

          <FloatingAiButton open={assistantOpen} onOpen={openAssistant} />
          <AiAssistantDialog
            open={assistantOpen}
            question={activeQuestion}
            focusToken={assistantFocusToken}
            onClose={() => setAssistantOpen(false)}
          />
        </>
      )}

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
      <SettingsDialog
        open={settingsOpen}
        settings={{ ...state.settings, focusMode, notesOpen: drawerState.notesOpen }}
        spreadAvailable={spreadAvailable}
        onClose={() => setSettingsOpen(false)}
        onChange={changeSettings}
      />

      {undo && <UndoToast message="批注已删除" onUndo={restoreAnnotation} onDismiss={() => setUndo(undefined)} />}
      {workspaceView === 'reader' && (mobileLibraryOpen || mobileNotesOpen) && <button className="mobile-scrim" type="button" onClick={() => { setMobileLibraryOpen(false); setMobileNotesOpen(false) }} aria-label="关闭侧栏" />}
      <div className="sr-only" aria-live="polite">
        {workspaceView === 'reader' ? `当前题目：${activeQuestion.title}` : '当前页面：题库中心'}
      </div>
      {workspaceView === 'reader' && <footer className="app-colophon"><MessageSquareText aria-hidden="true" />记录仅保存在当前浏览器 · Q{activeQuestion.number} · {state.annotations.length} 条批注</footer>}
    </div>
  )
}
