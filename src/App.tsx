import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, Highlighter, MessageSquareText } from 'lucide-react'
import { CommandPalette } from './components/CommandPalette'
import { DashboardDialog } from './components/DashboardDialog'
import { AiAssistantDialog } from './components/AiAssistantDialog'
import { AdminPanel } from './components/AdminPanel'
import { AuthDialog } from './components/AuthDialog'
import { FloatingAiButton } from './components/FloatingAiButton'
import { LegacyMigrationDialog } from './components/LegacyMigrationDialog'
import { InviteRegistrationDialog } from './components/InviteRegistrationDialog'
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
import { dateAfterDays } from './lib/format'
import { consumeInvitationToken } from './lib/invitations'
import { getCatalog, getMyState, getSession, saveMyState } from './lib/api'
import {
  isFocusMode,
  setFocusMode,
  toggleFocusMode as transitionFocusMode,
  toggleLibrary as transitionLibrary,
  type DrawerState,
} from './lib/drawerState'
import { flattenQuestions, questionFromHash } from './lib/markdown'
import {
  NOTES_PANEL_MAX_WIDTH,
  NOTES_PANEL_MIN_WIDTH,
  clampNotesPanelWidth,
  defaultNotesPanelWidth,
  maximumNotesPanelWidth,
} from './lib/notesPanelSizing'
import { clearQueuedState, flushQueuedState, queueStudyState } from './lib/outbox'
import {
  createDefaultState,
  exportStudyState,
  legacyStudyState,
  parseStudyState,
  progressFor,
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
  SessionUser,
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

interface ProgressUpdateOptions {
  recordActivity?: boolean
  guestBehavior?: 'prompt' | 'ignore'
  reason?: string
}

type WorkspaceView = 'reader' | 'banks' | 'admin'

const LOGIN_REASONS = {
  progress: '登录后可保存收藏、掌握状态和阅读进度。',
  notes: '登录后可高亮正文、添加批注和本题总结。',
  review: '登录后可建立复习队列并查看个人学习概览。',
  transfer: '登录后可导入或导出个人学习记录。',
} as const

const NOTES_PANEL_WIDTH_STORAGE_KEY = 'interview-margin:notes-pane-width:v1'

function loadNotesPanelWidth(): number {
  const fallback = defaultNotesPanelWidth(window.innerWidth)
  try {
    const stored = window.localStorage.getItem(NOTES_PANEL_WIDTH_STORAGE_KEY)
    if (stored === null) return fallback
    const saved = Number(stored)
    return Number.isFinite(saved)
      ? Math.min(NOTES_PANEL_MAX_WIDTH, Math.max(NOTES_PANEL_MIN_WIDTH, saved))
      : fallback
  } catch {
    return fallback
  }
}

function drawerStateForStudyState(studyState: StudyState): DrawerState {
  // The immersive reader always starts with a clear reading canvas. Drawers
  // remain one click away on the rail and can still be opened independently.
  return studyState.settings.focusMode
    ? setFocusMode(true)
    : { libraryOpen: false, notesOpen: false }
}

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

function useViewportWidth(): number {
  const [width, setWidth] = useState(() => window.innerWidth)

  useEffect(() => {
    const update = () => setWidth(window.innerWidth)
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return width
}

export default function App() {
  const [banks, setBanks] = useState<QuestionBankDefinition[]>([])
  const [sections, setSections] = useState<InterviewSection[]>([])
  const [loadError, setLoadError] = useState('')
  const [activeId, setActiveId] = useState('')
  const [state, setState] = useState<StudyState>(() => createDefaultState())
  const [user, setUser] = useState<SessionUser | null>(null)
  const [accountServiceAvailable, setAccountServiceAvailable] = useState(true)
  const [inviteToken, setInviteToken] = useState<string | null>(() => consumeInvitationToken())
  const [inviteAccepted, setInviteAccepted] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authReason, setAuthReason] = useState('')
  const [migrationOpen, setMigrationOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [syncReady, setSyncReady] = useState(false)
  const lastServerState = useRef('')
  const sessionGeneration = useRef(0)
  const [drawerState, setDrawerState] = useState<DrawerState>({ libraryOpen: false, notesOpen: false })
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<LibraryFilter>('all')
  const [mobileLibraryOpen, setMobileLibraryOpen] = useState(false)
  const [mobileNotesOpen, setMobileNotesOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [dashboardOpen, setDashboardOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [assistantFocusToken, setAssistantFocusToken] = useState(0)
  const [library, setLibrary] = useState<QuestionLibrary>('')
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>(() => (
    window.location.hash === '#question-banks' ? 'banks' : window.location.hash === '#admin' ? 'admin' : 'reader'
  ))
  const [spreadAvailable, setSpreadAvailable] = useState(false)
  const [selection, setSelection] = useState<SelectionDraft>()
  const [composer, setComposer] = useState<ComposerDraft>()
  const [undo, setUndo] = useState<UndoState>()
  const undoTimer = useRef<number | undefined>(undefined)
  const desktopLibraryLayout = useMediaQuery('(min-width: 60rem)')
  const desktopNotesLayout = useMediaQuery('(min-width: 60rem)')
  const wideNotesLayout = useMediaQuery('(min-width: 76rem)')
  const viewportWidth = useViewportWidth()
  const [notesPreferredWidth, setNotesPreferredWidth] = useState(loadNotesPanelWidth)
  const [notesResizing, setNotesResizing] = useState(false)
  const lastExpandedNotesWidth = useRef(
    notesPreferredWidth > NOTES_PANEL_MIN_WIDTH + 1
      ? notesPreferredWidth
      : defaultNotesPanelWidth(window.innerWidth),
  )

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
  const currentBank = banks.find((bank) => bank.id === library) ?? banks[0]
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
  const notesExpanded = notesVisible && (desktopNotesLayout || mobileNotesOpen)
  const notesMaximumWidth = maximumNotesPanelWidth(
    viewportWidth,
    desktopLibraryLayout && drawerState.libraryOpen,
  )
  const notesPanelWidth = clampNotesPanelWidth(
    notesPreferredWidth,
    viewportWidth,
    desktopLibraryLayout && drawerState.libraryOpen,
  )
  const notesCompact = notesPanelWidth <= NOTES_PANEL_MIN_WIDTH + 1

  const openAuth = (reason = '') => {
    setAuthReason(accountServiceAvailable
      ? reason
      : `账户服务暂时不可用，仍可继续游客阅读。${reason ? ` ${reason}` : ''}`)
    setAuthOpen(true)
  }

  const requireUser = (reason: string) => {
    if (user && !user.mustChangePassword) return true
    openAuth(reason)
    return false
  }

  useEffect(() => {
    if (desktopLibraryLayout) setMobileLibraryOpen(false)
  }, [desktopLibraryLayout])

  useEffect(() => {
    if (desktopNotesLayout) setMobileNotesOpen(false)
    else setNotesResizing(false)
  }, [desktopNotesLayout])

  useEffect(() => {
    try {
      window.localStorage.setItem(NOTES_PANEL_WIDTH_STORAGE_KEY, String(notesPreferredWidth))
    } catch {
      // A blocked storage API should not affect the reader.
    }
  }, [notesPreferredWidth])

  useEffect(() => {
    const consumeHash = () => {
      if (!window.location.hash.startsWith('#invite/')) return
      const token = consumeInvitationToken()
      setInviteAccepted(false)
      setInviteToken(token)
    }
    window.addEventListener('hashchange', consumeHash)
    window.addEventListener('popstate', consumeHash)
    return () => {
      window.removeEventListener('hashchange', consumeHash)
      window.removeEventListener('popstate', consumeHash)
    }
  }, [])

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

  const reloadCatalog = async () => {
    const catalog = await getCatalog()
    setBanks(catalog.banks)
    setSections(catalog.sections)
    return catalog
  }

  const refreshSession = async (offerMigration = true) => {
    const generation = ++sessionGeneration.current
    setSyncReady(false)
    lastServerState.current = ''
    window.clearTimeout(undoTimer.current)
    setState(createDefaultState())
    setDrawerState({ libraryOpen: false, notesOpen: false })
    setMobileNotesOpen(false)
    setSelection(undefined)
    setComposer(undefined)
    setUndo(undefined)
    setMigrationOpen(false)
    let session
    try {
      session = await getSession()
      setAccountServiceAvailable(true)
    } catch (error) {
      if (generation === sessionGeneration.current) {
        setUser(null)
        setAccountServiceAvailable(false)
      }
      throw error
    }
    if (generation !== sessionGeneration.current) return null
    setUser(session.user)
    if (session.user && !session.user.mustChangePassword) {
      const queued = await flushQueuedState(session.user.id).catch(() => undefined)
      const serverState = queued ?? await getMyState(session.user.id)
      if (generation !== sessionGeneration.current) return null
      lastServerState.current = JSON.stringify(serverState)
      setState(serverState)
      setDrawerState(drawerStateForStudyState(serverState))
      setMigrationOpen(offerMigration && Boolean(legacyStudyState()) && !session.user.mustChangePassword)
      setSyncReady(true)
    } else {
      setMigrationOpen(false)
    }
    return session.user
  }

  useEffect(() => {
    let cancelled = false
    const generation = ++sessionGeneration.current
    const sessionRequest = getSession()
      .then((session) => ({ session, available: true }))
      .catch(() => ({ session: { user: null }, available: false }))
    Promise.all([reloadCatalog(), sessionRequest])
      .then(async ([catalog, sessionResult]) => {
        if (cancelled) return
        const { session, available } = sessionResult
        setAccountServiceAvailable(available)
        if (generation === sessionGeneration.current) {
          setUser(session.user)
          if (session.user && !session.user.mustChangePassword) {
            try {
              const queued = await flushQueuedState(session.user.id).catch(() => undefined)
              const serverState = queued ?? await getMyState(session.user.id)
              if (!cancelled && generation === sessionGeneration.current) {
                lastServerState.current = JSON.stringify(serverState)
                setState(serverState)
                setDrawerState(drawerStateForStudyState(serverState))
                setMigrationOpen(Boolean(legacyStudyState()))
                setSyncReady(true)
              }
            } catch {
              if (!cancelled && generation === sessionGeneration.current) {
                setUser(null)
                setSyncReady(false)
                setAccountServiceAvailable(false)
              }
            }
          }
        }
        if (cancelled) return
        const loadedQuestions = flattenQuestions(catalog.sections)
        const hashQuestion = questionFromHash(loadedQuestions)
        setActiveId(hashQuestion?.id ?? loadedQuestions[0]?.id ?? '')
        setLibrary(hashQuestion?.library ?? catalog.banks[0]?.id ?? '')
        setHydrated(true)
      })
      .catch((error: Error) => { if (!cancelled) setLoadError(error.message) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!hydrated || !syncReady || !user || user.mustChangePassword) return
    const userId = user.id
    let active = true
    const serialized = JSON.stringify(state)
    if (serialized === lastServerState.current) return
    const queued = queueStudyState(user.id, state).catch(() => '')
    const timer = window.setTimeout(async () => {
      try {
        const revision = await queued
        const saved = await saveMyState(userId, state)
        if (active) lastServerState.current = JSON.stringify(saved)
        if (revision) await clearQueuedState(userId, revision)
      } catch {
        // The latest full state remains in IndexedDB and is retried when connectivity returns.
      }
    }, 700)
    return () => { active = false; window.clearTimeout(timer) }
  }, [hydrated, state, syncReady, user])

  useEffect(() => {
    let active = true
    const flush = () => {
      if (!user) return
      flushQueuedState(user.id).then((saved) => {
        if (active && saved) lastServerState.current = JSON.stringify(saved)
      }).catch(() => undefined)
    }
    window.addEventListener('online', flush)
    return () => { active = false; window.removeEventListener('online', flush) }
  }, [user])

  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme
    document.documentElement.style.colorScheme = state.settings.theme
  }, [state.settings.theme])

  useEffect(() => {
    document.documentElement.dataset.readingFont = state.settings.readingFont
  }, [state.settings.readingFont])

  useEffect(() => {
    const handleHistory = () => {
      if (window.location.hash === '#question-banks') {
        setWorkspaceView('banks')
        return
      }
      if (window.location.hash === '#admin' && user?.permissions.includes('banks.write')) {
        setWorkspaceView('admin')
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
  }, [questions, user])

  useEffect(() => {
    if (!activeQuestion || workspaceView !== 'reader' || !user) return
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
  }, [activeQuestion?.id, user?.id, workspaceView])

  useEffect(() => {
    if (!activeQuestion || workspaceView !== 'reader' || !user) return
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
  }, [activeQuestion?.id, user?.id, workspaceView])

  const openQuestion = (question: InterviewQuestion) => {
    setLibrary(question.library)
    setWorkspaceView('reader')
    if (question.id !== activeId || window.location.hash !== `#${question.id}`) {
      window.history.pushState(null, '', `#${question.id}`)
      setActiveId(question.id)
    }
    setMobileLibraryOpen(false)
    if (!desktopLibraryLayout) {
      setDrawerState((current) => ({ ...current, libraryOpen: false }))
    }
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

  const openAdmin = () => {
    if (!user?.permissions.includes('banks.write')) return
    window.history.pushState(null, '', '#admin')
    setWorkspaceView('admin')
    setMobileLibraryOpen(false)
    setMobileNotesOpen(false)
    setAssistantOpen(false)
  }

  const updateProgress = (patch: Partial<QuestionProgress>, options: ProgressUpdateOptions = {}) => {
    if (!activeQuestion) return
    if (!user || user.mustChangePassword) {
      if (options.guestBehavior !== 'ignore') openAuth(options.reason ?? LOGIN_REASONS.progress)
      return
    }
    setState((current) => {
      const next = {
        ...current,
        progress: {
          ...current.progress,
          [activeQuestion.id]: { ...progressFor(current, activeQuestion.id), ...patch },
        },
      }
      return options.recordActivity ? withActivity(next) : next
    })
  }

  const setStatus = (status: StudyStatus) => {
    updateProgress(
      { status, dueAt: status === 'review' ? dateAfterDays(1) : undefined },
      { recordActivity: true, reason: LOGIN_REASONS.progress },
    )
  }

  const addAnnotation = (quote: string, note: string, color: HighlightColor) => {
    if (!activeQuestion) return
    if (!requireUser(LOGIN_REASONS.notes)) return
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
    if (!requireUser(LOGIN_REASONS.notes)) return
    setState((current) => ({
      ...current,
      annotations: current.annotations.map((annotation) => annotation.id === id
        ? { ...annotation, note, color, updatedAt: new Date().toISOString() }
        : annotation),
    }))
  }

  const deleteAnnotation = (id: string) => {
    if (!requireUser(LOGIN_REASONS.notes)) return
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
    if (!requireUser(LOGIN_REASONS.notes)) return
    setState((current) => {
      const annotations = [...current.annotations]
      annotations.splice(Math.min(undo.index, annotations.length), 0, undo.annotation)
      return { ...current, annotations }
    })
    setUndo(undefined)
  }

  const openNotes = () => {
    if (!requireUser(LOGIN_REASONS.notes)) return false
    setDrawerState((current) => ({
      ...current,
      libraryOpen: wideNotesLayout ? current.libraryOpen : false,
      notesOpen: true,
    }))
    setMobileLibraryOpen(false)
    setMobileNotesOpen(!desktopNotesLayout)
    return true
  }

  const openAssistant = () => {
    setAssistantOpen(true)
    setAssistantFocusToken((current) => current + 1)
  }

  const closeNotes = () => {
    setDrawerState((current) => ({ ...current, notesOpen: false }))
    setMobileNotesOpen(false)
    setNotesResizing(false)
    setComposer(undefined)
  }

  const resizeNotesPanel = (nextWidth: number) => {
    const next = clampNotesPanelWidth(
      nextWidth,
      viewportWidth,
      desktopLibraryLayout && drawerState.libraryOpen,
    )
    setNotesPreferredWidth(next)
    if (next > NOTES_PANEL_MIN_WIDTH + 1) lastExpandedNotesWidth.current = next
  }

  const toggleNotesPanelWidth = () => {
    if (notesCompact) {
      setNotesPreferredWidth(Math.min(
        NOTES_PANEL_MAX_WIDTH,
        Math.max(lastExpandedNotesWidth.current, defaultNotesPanelWidth(viewportWidth)),
      ))
      return
    }

    lastExpandedNotesWidth.current = Math.max(notesPreferredWidth, notesPanelWidth)
    setNotesPreferredWidth(NOTES_PANEL_MIN_WIDTH)
  }

  const resetNotesPanelWidth = () => {
    const next = defaultNotesPanelWidth(viewportWidth)
    lastExpandedNotesWidth.current = next
    setNotesPreferredWidth(next)
  }

  const closeLibrary = () => {
    setDrawerState((current) => ({ ...current, libraryOpen: false }))
    setMobileLibraryOpen(false)
  }

  const closeMobileDrawers = () => {
    setDrawerState((current) => ({ ...current, libraryOpen: false, notesOpen: false }))
    setMobileLibraryOpen(false)
    setMobileNotesOpen(false)
    setComposer(undefined)
  }

  const toggleNotes = () => {
    if (notesExpanded) closeNotes()
    else void openNotes()
  }

  const toggleMobileLibrary = () => {
    const nextOpen = !libraryExpanded
    setMobileLibraryOpen(nextOpen)
    setDrawerState((current) => ({
      ...current,
      libraryOpen: nextOpen,
      notesOpen: nextOpen ? false : current.notesOpen,
    }))
    if (nextOpen) {
      setMobileNotesOpen(false)
    }
  }

  const toggleDesktopLibrary = () => {
    setDrawerState((current) => {
      const next = transitionLibrary(current)
      return !wideNotesLayout && next.libraryOpen
        ? { ...next, notesOpen: false }
        : next
    })
    if (!wideNotesLayout) setMobileNotesOpen(false)
  }

  const toggleFocus = () => {
    setDrawerState(transitionFocusMode)
    setMobileLibraryOpen(false)
    setMobileNotesOpen(false)
  }

  const openReviewLibrary = () => {
    if (!requireUser(LOGIN_REASONS.review)) return
    const reviewQuestion = currentLibraryQuestions.find((question) => {
      const progress = progressFor(state, question.id)
      return progress.status === 'review' || Boolean(progress.dueAt && new Date(progress.dueAt) <= new Date())
    })
    if (reviewQuestion) openQuestion(reviewQuestion)
    else if (activeQuestion) openQuestion(activeQuestion)
    setFilter('review')
    setDrawerState((current) => ({ ...current, libraryOpen: true }))
  }

  const openDashboard = () => {
    if (!requireUser(LOGIN_REASONS.review)) return
    setDashboardOpen(true)
  }

  const changeLibraryFilter = (nextFilter: LibraryFilter) => {
    if (nextFilter !== 'all' && !requireUser(LOGIN_REASONS.review)) return
    setFilter(nextFilter)
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
      if (event.key.toLowerCase() === 'f' && activeProgress) {
        updateProgress(
          { favorite: !activeProgress.favorite },
          { recordActivity: true, reason: LOGIN_REASONS.progress },
        )
      }
      if (event.key.toLowerCase() === 'n') toggleNotes()
      if (event.key === '?') setSettingsOpen(true)
    }
    window.addEventListener('keydown', handleKeyboard)
    return () => window.removeEventListener('keydown', handleKeyboard)
  })

  const importProgress = async (file: File) => {
    if (!requireUser(LOGIN_REASONS.transfer)) return
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
    <div
      className={`app-shell${workspaceView === 'banks' || workspaceView === 'admin'
      ? ' is-bank-hub is-notes-closed is-library-closed'
      : `${focusMode ? ' is-focus-mode' : ''}${notesVisible ? '' : ' is-notes-closed'}${drawerState.libraryOpen ? '' : ' is-library-closed'}${notesResizing ? ' is-resizing-notes' : ''}`}`}
      style={{ '--notes-panel-width': `${notesPanelWidth}px` } as CSSProperties}
    >
      <Rail
        mastered={railMasteredCount}
        total={railQuestions.length}
        reviewCount={railReviewCount}
        focusMode={focusMode}
        libraryOpen={libraryExpanded}
        notesOpen={notesExpanded}
        readerMode={readerMode}
        bankHubActive={workspaceView === 'banks'}
        adminActive={workspaceView === 'admin'}
        user={user}
        onToggleLibrary={toggleDesktopLibrary}
        onToggleNotes={toggleNotes}
        onOpenQuestionBanks={openQuestionBanks}
        onOpenDashboard={openDashboard}
        onOpenReview={openReviewLibrary}
        onToggleFocus={toggleFocus}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenAdmin={openAdmin}
        onOpenAccount={() => openAuth()}
      />

      {workspaceView === 'banks' ? (
        <QuestionBankHub
          banks={banks}
          questions={questions}
          state={state}
          currentBankId={library}
          onOpenBank={openQuestionBank}
          onOpenDashboard={openDashboard}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      ) : workspaceView === 'admin' && user?.permissions.includes('banks.write') ? (
        <AdminPanel
          user={user}
          initialCatalog={{ banks, sections }}
          onExit={openQuestionBanks}
          onCatalogChanged={async () => { await reloadCatalog() }}
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
        expanded={libraryExpanded}
        authenticated={Boolean(user)}
        onQueryChange={setQuery}
        onFilterChange={changeLibraryFilter}
        onSelect={openQuestion}
        onOpenQuestionBanks={openQuestionBanks}
        onOpenDashboard={() => { setMobileLibraryOpen(false); openDashboard() }}
        onOpenSettings={() => { setMobileLibraryOpen(false); setSettingsOpen(true) }}
        onOpenAccount={() => { setMobileLibraryOpen(false); openAuth() }}
        onClose={closeLibrary}
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
          onToggleFavorite={() => updateProgress(
            { favorite: !activeProgress.favorite },
            { recordActivity: true, reason: LOGIN_REASONS.progress },
          )}
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
          onScrollPosition={(scrollTop) => updateProgress({ scrollTop }, { guestBehavior: 'ignore' })}
          onSpreadChange={(spreadIndex) => updateProgress({ spreadIndex }, { guestBehavior: 'ignore' })}
          onSpreadAvailabilityChange={setSpreadAvailable}
        />
        <StatusDock value={activeProgress.status} onChange={setStatus} />
          </section>

          <NotesPanel
          question={activeQuestion}
          progress={activeProgress}
          annotations={activeAnnotations}
          composer={composer}
          mobileOpen={mobileNotesOpen}
          expanded={notesExpanded}
          synced={Boolean(user)}
          width={notesPanelWidth}
          minWidth={NOTES_PANEL_MIN_WIDTH}
          maxWidth={notesMaximumWidth}
          compact={notesCompact}
          onClose={closeNotes}
          onWidthChange={resizeNotesPanel}
          onResizeStart={() => setNotesResizing(true)}
          onResizeEnd={() => setNotesResizing(false)}
          onToggleWidth={toggleNotesPanelWidth}
          onResetWidth={resetNotesPanelWidth}
          onNoteChange={(note) => updateProgress({ note }, { reason: LOGIN_REASONS.notes })}
          onAddAnnotation={addAnnotation}
          onUpdateAnnotation={updateAnnotation}
          onDeleteAnnotation={deleteAnnotation}
          onComposerClose={() => setComposer(undefined)}
          onScheduleReview={(days) => updateProgress(
            { status: 'review', dueAt: dateAfterDays(days) },
            { recordActivity: true, reason: LOGIN_REASONS.review },
          )}
          />

          <SelectionMenu
        selection={selection}
        onHighlight={(color) => selection && addAnnotation(selection.quote, '', color)}
        onAnnotate={() => {
          if (!selection) return
          if (!requireUser(LOGIN_REASONS.notes)) {
            setSelection(undefined)
            return
          }
          setComposer({ quote: selection.quote, color: 'yellow' })
          void openNotes()
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
        onExport={() => {
          if (requireUser(LOGIN_REASONS.transfer)) exportStudyState(state)
        }}
        onImport={importProgress}
        synced={Boolean(user)}
      />
      <SettingsDialog
        open={settingsOpen}
        settings={{ ...state.settings, focusMode, notesOpen: drawerState.notesOpen }}
        spreadAvailable={spreadAvailable}
        onClose={() => setSettingsOpen(false)}
        onChange={changeSettings}
      />
      <AuthDialog
        open={authOpen}
        user={user}
        reason={authReason}
        onClose={() => { setAuthOpen(false); setAuthReason('') }}
        onSessionChanged={async () => {
          const nextUser = await refreshSession()
          await reloadCatalog()
          if (!nextUser && workspaceView === 'admin') openQuestionBanks()
        }}
      />
      {inviteToken && (
        <InviteRegistrationDialog
          key={inviteToken}
          token={inviteToken}
          user={user}
          onDismiss={() => {
            setInviteToken(null)
            if (inviteAccepted) {
              setInviteAccepted(false)
              setMigrationOpen(Boolean(user && !user.mustChangePassword && legacyStudyState()))
            }
          }}
          onAccepted={async () => {
            const acceptedUser = await refreshSession(false)
            await reloadCatalog()
            if (acceptedUser) setInviteAccepted(true)
          }}
        />
      )}
      <LegacyMigrationDialog
        legacy={legacyStudyState()}
        userId={user?.id ?? ''}
        open={migrationOpen}
        onClose={() => setMigrationOpen(false)}
        onImported={(nextState) => {
          lastServerState.current = JSON.stringify(nextState)
          setState(nextState)
        }}
      />

      {undo && <UndoToast message="批注已删除" onUndo={restoreAnnotation} onDismiss={() => setUndo(undefined)} />}
      {workspaceView === 'reader' && (mobileLibraryOpen || mobileNotesOpen) && <button className="mobile-scrim" type="button" onClick={closeMobileDrawers} aria-label="关闭侧栏" />}
      <div className="sr-only" aria-live="polite">
        {workspaceView === 'reader' ? `当前题目：${activeQuestion.title}` : workspaceView === 'admin' ? '当前页面：内容管理' : '当前页面：题库中心'}
      </div>
      {workspaceView === 'reader' && <footer className="app-colophon"><MessageSquareText aria-hidden="true" />{user
        ? '已同步到本机 SQLite'
        : accountServiceAvailable
          ? '游客浏览模式 · 登录后可保存批注与进度'
          : '云端游客模式 · 本机账户服务暂不可用'} · Q{activeQuestion.number} · {state.annotations.length} 条批注</footer>}
    </div>
  )
}
