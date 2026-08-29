import { lazy, Suspense, type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, Highlighter, MessageSquareText } from 'lucide-react'
import { FloatingAiButton } from './components/FloatingAiButton'
import { NotesPanel } from './components/NotesPanel'
import { Rail } from './components/Rail'
import { Reader } from './components/Reader'
import type { PracticeAssessment } from './components/PracticeMode'
import { SelectionMenu } from './components/SelectionMenu'
import { Sidebar, type LibraryFilter } from './components/Sidebar'
import { StatusDock } from './components/StatusDock'
import { Topbar } from './components/Topbar'
import { UndoToast } from './components/UndoToast'
import { dateAfterDays } from './lib/format'
import { consumeInvitationToken } from './lib/invitations'
import {
  catalogIndexSections,
  getCatalogBank,
  getCatalogIndex,
  getMyState,
  getSession,
  loadSplitCatalogWithLegacyFallback,
  saveMyState,
  type PublicBankCatalog,
} from './lib/api'
import {
  openLibrary as transitionOpenLibrary,
  openNotes as transitionOpenNotes,
  toggleLibrary as transitionLibrary,
  visibleDrawerState,
  type DrawerState,
} from './lib/drawerState'
import { flattenQuestions } from './lib/markdown'
import {
  NOTES_PANEL_MAX_WIDTH,
  NOTES_PANEL_MIN_WIDTH,
  clampNotesPanelWidth,
  defaultNotesPanelWidth,
  maximumNotesPanelWidth,
} from './lib/notesPanelSizing'
import { selectLibraryResumeQuestion } from './lib/questionSelection'
import { isReviewDue } from './lib/reviewSchedule'
import { clearQueuedState, flushQueuedState, queueStudyState } from './lib/outbox'
import {
  createDefaultState,
  exportStudyState,
  legacyStudyState,
  parseStudyState,
  progressFor,
  saveFontTheme,
  uid,
  withActivity,
} from './lib/storage'
import {
  questionHash,
  resolveWorkspaceRoute,
  writeWorkspaceHash,
  type WorkspaceView,
} from './lib/workspaceRoute'
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
import './fonts.css'
import './styles.css'

const AdminPanel = lazy(() => import('./components/AdminPanel').then((module) => ({ default: module.AdminPanel })))
const AuthDialog = lazy(() => import('./components/AuthDialog').then((module) => ({ default: module.AuthDialog })))
const CommandPalette = lazy(() => import('./components/CommandPalette').then((module) => ({ default: module.CommandPalette })))
const DashboardDialog = lazy(() => import('./components/DashboardDialog').then((module) => ({ default: module.DashboardDialog })))
const InviteRegistrationDialog = lazy(() => import('./components/InviteRegistrationDialog').then((module) => ({ default: module.InviteRegistrationDialog })))
const LegacyMigrationDialog = lazy(() => import('./components/LegacyMigrationDialog').then((module) => ({ default: module.LegacyMigrationDialog })))
const QuestionBankHub = lazy(() => import('./components/QuestionBankHub').then((module) => ({ default: module.QuestionBankHub })))
const SettingsDialog = lazy(() => import('./components/SettingsDialog').then((module) => ({ default: module.SettingsDialog })))

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

const LOGIN_REASONS = {
  progress: '登录后可保存收藏、掌握状态和阅读进度。',
  notes: '登录后可高亮正文、添加批注和本题总结。',
  review: '登录后可建立复习队列并查看个人学习概览。',
  transfer: '登录后可导入或导出个人学习记录。',
} as const

const NOTES_PANEL_WIDTH_STORAGE_KEY = 'interview-margin:notes-pane-width:v1'

function mergeLoadedBankSections(
  baseSections: InterviewSection[],
  bankId: QuestionLibrary,
  loadedSections: InterviewSection[],
) {
  const nextSections: InterviewSection[] = []
  let inserted = false

  for (const section of baseSections) {
    const belongsToBank = section.questions.some((question) => question.library === bankId)
    if (!belongsToBank) {
      nextSections.push(section)
      continue
    }
    if (!inserted) {
      nextSections.push(...loadedSections)
      inserted = true
    }
  }

  return nextSections
}

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
  return { libraryOpen: false, notesOpen: studyState.settings.notesOpen }
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
  const [bankLoadError, setBankLoadError] = useState<{ bankId: QuestionLibrary; message: string }>()
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
  const [focusMode, setFocusMode] = useState(false)
  const [practiceMode, setPracticeMode] = useState(false)
  const [practiceRevealed, setPracticeRevealed] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<LibraryFilter>('all')
  const [mobileLibraryOpen, setMobileLibraryOpen] = useState(false)
  const [mobileNotesOpen, setMobileNotesOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [dashboardOpen, setDashboardOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [contextMode, setContextMode] = useState<'notes' | 'assistant'>('notes')
  const [assistantFocusToken, setAssistantFocusToken] = useState(0)
  const [library, setLibrary] = useState<QuestionLibrary>('')
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('reader')
  const [spreadAvailable, setSpreadAvailable] = useState(false)
  const [selection, setSelection] = useState<SelectionDraft>()
  const [composer, setComposer] = useState<ComposerDraft>()
  const [undo, setUndo] = useState<UndoState>()
  const undoTimer = useRef<number | undefined>(undefined)
  const loadedBankCatalogs = useRef(new Map<QuestionLibrary, PublicBankCatalog>())
  const pendingBankCatalogs = useRef(new Map<QuestionLibrary, Promise<PublicBankCatalog>>())
  const catalogGeneration = useRef(0)
  const sectionsRef = useRef<InterviewSection[]>([])
  const banksRef = useRef<QuestionBankDefinition[]>([])
  const mobileDrawerTrigger = useRef<HTMLElement | null>(null)
  const mobileDrawerWasOpen = useRef(false)
  const desktopLibraryLayout = useMediaQuery('(min-width: 60rem)')
  const desktopNotesLayout = useMediaQuery('(min-width: 60rem)')
  const wideNotesLayout = useMediaQuery('(min-width: 90rem)')
  const viewportWidth = useViewportWidth()
  const [notesPreferredWidth, setNotesPreferredWidth] = useState(loadNotesPanelWidth)
  const [notesResizing, setNotesResizing] = useState(false)
  const lastExpandedNotesWidth = useRef(
    notesPreferredWidth > NOTES_PANEL_MIN_WIDTH + 1
      ? notesPreferredWidth
      : defaultNotesPanelWidth(window.innerWidth),
  )

  const questions = useMemo(() => flattenQuestions(sections), [sections])
  const workspaceRouteContext = useRef({
    questions,
    activeId,
    canAccessAdmin: Boolean(user?.permissions.includes('banks.write')),
  })
  workspaceRouteContext.current = {
    questions,
    activeId,
    canAccessAdmin: Boolean(user?.permissions.includes('banks.write')),
  }
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
        || (filter === 'review' && isReviewDue(progress))
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
    return isReviewDue(progress)
  }).length
  const visibleDrawers = visibleDrawerState(drawerState, focusMode)
  const visibleMobileLibrary = focusMode ? false : mobileLibraryOpen
  const visibleMobileNotes = focusMode ? false : mobileNotesOpen
  const libraryExpanded = desktopLibraryLayout ? visibleDrawers.libraryOpen : visibleMobileLibrary
  const notesVisible = visibleDrawers.notesOpen
  const notesExpanded = notesVisible && (desktopNotesLayout || visibleMobileNotes)
  const mobileDrawerOpen = visibleMobileLibrary || visibleMobileNotes
  const notesMaximumWidth = maximumNotesPanelWidth(
    viewportWidth,
    desktopLibraryLayout && visibleDrawers.libraryOpen,
  )
  const notesPanelWidth = clampNotesPanelWidth(
    notesPreferredWidth,
    viewportWidth,
    desktopLibraryLayout && visibleDrawers.libraryOpen,
  )
  const notesCompact = notesPanelWidth <= NOTES_PANEL_MIN_WIDTH + 1
  const practiceWorkspaceLocked = practiceMode && !practiceRevealed
  sectionsRef.current = sections
  banksRef.current = banks

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

  const clearActiveSelection = () => {
    window.getSelection()?.removeAllRanges()
    setSelection(undefined)
  }

  const rememberMobileDrawerTrigger = () => {
    if (!desktopLibraryLayout && !mobileDrawerOpen && document.activeElement instanceof HTMLElement) {
      mobileDrawerTrigger.current = document.activeElement
    }
  }

  useEffect(() => {
    if (desktopLibraryLayout) setMobileLibraryOpen(false)
  }, [desktopLibraryLayout])

  useEffect(() => {
    if (desktopNotesLayout) setMobileNotesOpen(false)
    else setNotesResizing(false)
  }, [desktopNotesLayout])

  useEffect(() => {
    if (wideNotesLayout) return
    setDrawerState((current) => (
      current.libraryOpen && current.notesOpen
        ? { ...current, libraryOpen: false }
        : current
    ))
  }, [wideNotesLayout])

  useEffect(() => {
    let focusFrame: number | undefined

    if (mobileDrawerOpen) {
      if (!mobileDrawerWasOpen.current && !mobileDrawerTrigger.current && document.activeElement instanceof HTMLElement) {
        mobileDrawerTrigger.current = document.activeElement
      }
      const drawer = document.getElementById(visibleMobileLibrary ? 'question-library' : 'notes-panel')
      focusFrame = window.requestAnimationFrame(() => {
        const preferredControl = drawer?.querySelector<HTMLElement>(
          visibleMobileLibrary ? '.library__close' : '.notes-panel__close',
        )
        const fallbackControl = drawer?.querySelector<HTMLElement>('button, input, textarea, select')
        const focusTarget = preferredControl ?? fallbackControl
        focusTarget?.focus({ preventScroll: true })
      })
    } else if (mobileDrawerWasOpen.current) {
      const trigger = mobileDrawerTrigger.current
      mobileDrawerTrigger.current = null
      focusFrame = window.requestAnimationFrame(() => {
        if (trigger?.isConnected) trigger.focus({ preventScroll: true })
      })
    }

    mobileDrawerWasOpen.current = mobileDrawerOpen
    return () => {
      if (focusFrame !== undefined) window.cancelAnimationFrame(focusFrame)
    }
  }, [mobileDrawerOpen, visibleMobileLibrary])

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

  const ensureBankLoaded = useCallback(async (bankId: QuestionLibrary) => {
    const loaded = loadedBankCatalogs.current.get(bankId)
    if (loaded) return loaded
    const pending = pendingBankCatalogs.current.get(bankId)
    if (pending) return pending

    const generation = catalogGeneration.current
    const request = getCatalogBank(bankId)
    pendingBankCatalogs.current.set(bankId, request)
    try {
      const catalog = await request
      if (generation !== catalogGeneration.current) return catalog
      if (!banksRef.current.some((bank) => bank.id === bankId)) return catalog
      const nextSections = mergeLoadedBankSections(sectionsRef.current, bankId, catalog.sections)
      loadedBankCatalogs.current.set(bankId, catalog)
      sectionsRef.current = nextSections
      setSections(nextSections)

      const nextQuestions = flattenQuestions(nextSections)
      const routeContext = workspaceRouteContext.current
      workspaceRouteContext.current = { ...routeContext, questions: nextQuestions }
      if (!nextQuestions.some((question) => question.id === routeContext.activeId)) {
        const route = resolveWorkspaceRoute({
          hash: window.location.hash,
          questions: nextQuestions,
          canAccessAdmin: routeContext.canAccessAdmin,
          preferredQuestionId: nextQuestions.find((question) => question.library === bankId)?.id,
        })
        if (route) {
          workspaceRouteContext.current = {
            questions: nextQuestions,
            activeId: route.question.id,
            canAccessAdmin: routeContext.canAccessAdmin,
          }
          setActiveId(route.question.id)
          setLibrary(route.question.library)
          setWorkspaceView(route.view)
          if (route.needsReplace) writeWorkspaceHash(route.hash, 'replace')
        } else {
          workspaceRouteContext.current = {
            questions: [],
            activeId: '',
            canAccessAdmin: routeContext.canAccessAdmin,
          }
          setActiveId('')
          setLibrary(banksRef.current[0]?.id ?? '')
          setWorkspaceView('banks')
          writeWorkspaceHash('#question-banks', 'replace')
        }
      }
      return catalog
    } finally {
      if (pendingBankCatalogs.current.get(bankId) === request) pendingBankCatalogs.current.delete(bankId)
    }
  }, [])

  const reloadCatalog = async () => {
    const generation = ++catalogGeneration.current
    pendingBankCatalogs.current.clear()
    let targetBankId: QuestionLibrary | undefined
    let currentBankCatalog: PublicBankCatalog | undefined
    const nextCatalog = await loadSplitCatalogWithLegacyFallback(async () => {
      const index = await getCatalogIndex()
      const metadataSections = catalogIndexSections(index)
      const metadataQuestions = flattenQuestions(metadataSections)
      const indexedRoute = resolveWorkspaceRoute({
        hash: window.location.hash,
        questions: metadataQuestions,
        canAccessAdmin: true,
      })
      const indexedBankIds = new Set(index.banks.map((bank) => bank.id))
      const retainedLibrary = library && indexedBankIds.has(library) ? library : undefined
      const metadataOnly = window.location.hash === '#question-banks' || window.location.hash === '#admin'
      targetBankId = (metadataOnly
        ? retainedLibrary || indexedRoute?.question.library
        : indexedRoute?.question.library) ?? index.banks[0]?.id

      if (metadataOnly) return { banks: index.banks, sections: metadataSections }
      if (!targetBankId) throw new Error('题库索引中没有可读取的题库。')

      currentBankCatalog = await getCatalogBank(targetBankId)
      return {
        banks: index.banks,
        sections: mergeLoadedBankSections(metadataSections, targetBankId, currentBankCatalog.sections),
      }
    })

    if (generation !== catalogGeneration.current) return nextCatalog
    // Invalidate bank requests that started while this reload was in flight.
    catalogGeneration.current += 1
    pendingBankCatalogs.current.clear()
    loadedBankCatalogs.current = targetBankId && currentBankCatalog
      ? new Map([[targetBankId, currentBankCatalog]])
      : new Map()
    banksRef.current = nextCatalog.banks
    sectionsRef.current = nextCatalog.sections
    setBanks(nextCatalog.banks)
    setSections(nextCatalog.sections)
    setLoadError('')
    setBankLoadError(undefined)

    if (hydrated) {
      const nextQuestions = flattenQuestions(nextCatalog.sections)
      const route = resolveWorkspaceRoute({
        hash: window.location.hash,
        questions: nextQuestions,
        canAccessAdmin: Boolean(user?.permissions.includes('banks.write')),
        preferredQuestionId: nextQuestions.find((question) => question.library === targetBankId)?.id,
      })
      if (route) {
        workspaceRouteContext.current = {
          questions: nextQuestions,
          activeId: route.question.id,
          canAccessAdmin: Boolean(user?.permissions.includes('banks.write')),
        }
        setActiveId(route.question.id)
        setLibrary(route.question.library)
        setWorkspaceView(route.view)
        if (route.needsReplace) writeWorkspaceHash(route.hash, 'replace')
      } else {
        const canAccessAdmin = Boolean(user?.permissions.includes('banks.write'))
        const emptyView: WorkspaceView = window.location.hash === '#admin' && canAccessAdmin ? 'admin' : 'banks'
        workspaceRouteContext.current = { questions: [], activeId: '', canAccessAdmin }
        setActiveId('')
        setLibrary(nextCatalog.banks[0]?.id ?? '')
        setWorkspaceView(emptyView)
        const emptyHash = emptyView === 'admin' ? '#admin' : '#question-banks'
        if (window.location.hash !== emptyHash) writeWorkspaceHash(emptyHash, 'replace')
      }
    }
    return nextCatalog
  }

  const refreshSession = async (offerMigration = true) => {
    const generation = ++sessionGeneration.current
    setSyncReady(false)
    lastServerState.current = ''
    window.clearTimeout(undoTimer.current)
    setState(createDefaultState())
    setDrawerState({ libraryOpen: false, notesOpen: false })
    setFocusMode(false)
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
      setFocusMode(serverState.settings.focusMode)
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
                setFocusMode(serverState.settings.focusMode)
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
        const route = resolveWorkspaceRoute({
          hash: window.location.hash,
          questions: loadedQuestions,
          canAccessAdmin: Boolean(session.user?.permissions.includes('banks.write')),
        })
        if (route) {
          workspaceRouteContext.current = {
            questions: loadedQuestions,
            activeId: route.question.id,
            canAccessAdmin: Boolean(session.user?.permissions.includes('banks.write')),
          }
          setActiveId(route.question.id)
          setLibrary(route.question.library)
          setWorkspaceView(route.view)
          if (route.needsReplace) writeWorkspaceHash(route.hash, 'replace')
        } else {
          const canAccessAdmin = Boolean(session.user?.permissions.includes('banks.write'))
          const emptyView: WorkspaceView = window.location.hash === '#admin' && canAccessAdmin ? 'admin' : 'banks'
          setActiveId('')
          setLibrary(catalog.banks[0]?.id ?? '')
          setWorkspaceView(emptyView)
          const emptyHash = emptyView === 'admin' ? '#admin' : '#question-banks'
          if (window.location.hash !== emptyHash) writeWorkspaceHash(emptyHash, 'replace')
        }
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
    document.documentElement.dataset.fontTheme = state.settings.fontTheme
    document.documentElement.style.colorScheme = state.settings.theme
    saveFontTheme(state.settings.fontTheme)
  }, [state.settings.fontTheme, state.settings.theme])

  useEffect(() => {
    const handleHistory = () => {
      const routeContext = workspaceRouteContext.current
      const route = resolveWorkspaceRoute({
        hash: window.location.hash,
        questions: routeContext.questions,
        canAccessAdmin: routeContext.canAccessAdmin,
        preferredQuestionId: routeContext.activeId,
      })
      if (!route) return

      if (route.needsReplace) writeWorkspaceHash(route.hash, 'replace')
      workspaceRouteContext.current.activeId = route.question.id
      setActiveId(route.question.id)
      setLibrary(route.question.library)
      setWorkspaceView(route.view)
      if (route.view !== 'reader') {
        setMobileLibraryOpen(false)
        setMobileNotesOpen(false)
        setContextMode('notes')
      }
    }
    window.addEventListener('popstate', handleHistory)
    window.addEventListener('hashchange', handleHistory)
    return () => {
      window.removeEventListener('popstate', handleHistory)
      window.removeEventListener('hashchange', handleHistory)
    }
  }, [])

  useEffect(() => {
    if (workspaceView !== 'reader' || !hydrated || !activeQuestion || activeQuestion.body || loadedBankCatalogs.current.has(activeQuestion.library)) return
    let cancelled = false
    const bankId = activeQuestion.library
    setBankLoadError((current) => current?.bankId === bankId ? undefined : current)
    void ensureBankLoaded(activeQuestion.library).catch((error: unknown) => {
      if (!cancelled) {
        setBankLoadError({
          bankId,
          message: error instanceof Error ? error.message : '该题库暂时无法载入。',
        })
      }
    })
    return () => { cancelled = true }
  }, [activeQuestion, ensureBankLoaded, hydrated, workspaceView])

  useEffect(() => {
    setPracticeRevealed(false)
  }, [activeQuestion?.id, practiceMode])

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
    clearActiveSelection()
    if (practiceMode) {
      setPracticeRevealed(false)
      setDrawerState((current) => ({ ...current, notesOpen: false }))
      setMobileNotesOpen(false)
      setComposer(undefined)
    }
    setLibrary(question.library)
    setWorkspaceView('reader')
    writeWorkspaceHash(questionHash(question.id))
    workspaceRouteContext.current.activeId = question.id
    setActiveId(question.id)
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
    setFocusMode(false)
    setDrawerState(transitionOpenLibrary)
    const resumeQuestion = selectLibraryResumeQuestion(questions, state, bank.id)
    if (resumeQuestion) openQuestion(resumeQuestion)
  }

  const openQuestionBanks = () => {
    clearActiveSelection()
    writeWorkspaceHash('#question-banks')
    setWorkspaceView('banks')
    setMobileLibraryOpen(false)
    setMobileNotesOpen(false)
    setContextMode('notes')
  }

  const openAdmin = () => {
    if (!user?.permissions.includes('banks.write')) return
    clearActiveSelection()
    writeWorkspaceHash('#admin')
    setWorkspaceView('admin')
    setMobileLibraryOpen(false)
    setMobileNotesOpen(false)
    setContextMode('notes')
  }

  const updateProgress = (patch: Partial<QuestionProgress>, options: ProgressUpdateOptions = {}) => {
    if (!activeQuestion) return false
    if (!user || user.mustChangePassword) {
      if (options.guestBehavior !== 'ignore') openAuth(options.reason ?? LOGIN_REASONS.progress)
      return false
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
    return true
  }

  const setStatus = (status: StudyStatus) => {
    updateProgress(
      { status, dueAt: status === 'review' ? dateAfterDays(1) : undefined },
      { recordActivity: true, reason: LOGIN_REASONS.progress },
    )
  }

  const schedulePracticeReview = ({ rating, intervalDays }: PracticeAssessment) => {
    return updateProgress(
      {
        status: rating === 'mastered' ? 'mastered' : 'review',
        dueAt: dateAfterDays(intervalDays),
      },
      { recordActivity: true, reason: LOGIN_REASONS.review },
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
    if (practiceMode && !practiceRevealed) return false
    if (!requireUser(LOGIN_REASONS.notes)) return false
    rememberMobileDrawerTrigger()
    clearActiveSelection()
    setContextMode('notes')
    setFocusMode(false)
    setDrawerState((current) => ({
      ...transitionOpenNotes(current),
      libraryOpen: wideNotesLayout ? current.libraryOpen : false,
    }))
    setMobileLibraryOpen(false)
    setMobileNotesOpen(!desktopNotesLayout)
    return true
  }

  const openAssistant = () => {
    if (practiceMode && !practiceRevealed) return false
    rememberMobileDrawerTrigger()
    clearActiveSelection()
    setContextMode('assistant')
    setFocusMode(false)
    setDrawerState((current) => ({
      ...transitionOpenNotes(current),
      libraryOpen: wideNotesLayout ? current.libraryOpen : false,
    }))
    setMobileLibraryOpen(false)
    setMobileNotesOpen(!desktopNotesLayout)
    setAssistantFocusToken((current) => current + 1)
    return true
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
      desktopLibraryLayout && visibleDrawers.libraryOpen,
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
    if (notesExpanded && contextMode === 'notes') closeNotes()
    else void openNotes()
  }

  const toggleMobileLibrary = () => {
    if (!libraryExpanded || focusMode) {
      rememberMobileDrawerTrigger()
      clearActiveSelection()
    }
    if (focusMode) {
      setFocusMode(false)
      setMobileLibraryOpen(true)
      setMobileNotesOpen(false)
      setDrawerState((current) => ({
        ...transitionOpenLibrary(current),
        notesOpen: false,
      }))
      return
    }
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
    if (!libraryExpanded || focusMode) clearActiveSelection()
    if (focusMode) {
      setFocusMode(false)
      setDrawerState((current) => {
        const next = transitionOpenLibrary(current)
        return !wideNotesLayout ? { ...next, notesOpen: false } : next
      })
      if (!wideNotesLayout) setMobileNotesOpen(false)
      return
    }
    setDrawerState((current) => {
      const next = transitionLibrary(current)
      return !wideNotesLayout && next.libraryOpen
        ? { ...next, notesOpen: false }
        : next
    })
    if (!wideNotesLayout) setMobileNotesOpen(false)
  }

  const toggleFocus = () => {
    setFocusMode((current) => !current)
  }

  const togglePracticeMode = () => {
    const next = !practiceMode
    setPracticeMode(next)
    setPracticeRevealed(false)
    clearActiveSelection()
    if (next) closeNotes()
  }

  const openReviewLibrary = () => {
    if (!requireUser(LOGIN_REASONS.review)) return
    const reviewQuestion = currentLibraryQuestions.find((question) => {
      const progress = progressFor(state, question.id)
      return isReviewDue(progress)
    })
    if (reviewQuestion) openQuestion(reviewQuestion)
    else if (activeQuestion) openQuestion(activeQuestion)
    setFilter('review')
    setFocusMode(false)
    setDrawerState(transitionOpenLibrary)
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
      if (mobileDrawerOpen) {
        if (event.key === 'Escape') {
          event.preventDefault()
          closeMobileDrawers()
        }
        return
      }
      if (isTypingTarget(event.target)) return
      const commandKey = event.ctrlKey || event.metaKey
      if ((commandKey && event.key.toLowerCase() === 'k') || event.key === '/') {
        event.preventDefault()
        setCommandOpen(true)
        return
      }
      if (workspaceView !== 'reader') return
      if (practiceMode && ['j', 'k', 'm', 'r'].includes(event.key.toLowerCase())) {
        event.preventDefault()
        return
      }
      if (practiceWorkspaceLocked && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        return
      }
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
      setDrawerState({ libraryOpen: true, notesOpen: imported.settings.notesOpen })
      setFocusMode(imported.settings.focusMode)
      setMobileLibraryOpen(false)
      setMobileNotesOpen(false)
      setState(imported)
    } catch (error) {
      const message = error instanceof Error ? error.message : '导入文件无法识别。'
      window.alert(message)
    }
  }

  const changeSettings = (settings: ReaderSettings) => {
    if (settings.focusMode !== focusMode) setFocusMode(settings.focusMode)
    setState((current) => ({
      ...current,
      settings: {
        ...settings,
        focusMode: settings.focusMode,
        notesOpen: drawerState.notesOpen,
      },
    }))
  }

  const changePageLayout = (pageLayout: PageLayout) => {
    setState((current) => ({
      ...current,
      settings: { ...current.settings, pageLayout },
    }))
  }

  const activeLoadError = workspaceView === 'reader'
    && activeQuestion
    && bankLoadError?.bankId === activeQuestion.library
      ? bankLoadError.message
      : ''

  if (loadError || activeLoadError) {
    return (
      <main className="load-state load-state--error">
        <AlertCircle aria-hidden="true" />
        <h1>题库没有载入</h1>
        <p>{loadError || activeLoadError}</p>
        <button type="button" onClick={() => {
          if (!activeLoadError || !activeQuestion) {
            window.location.reload()
            return
          }
          setBankLoadError(undefined)
          void ensureBankLoaded(activeQuestion.library).catch((error: unknown) => {
            setBankLoadError({
              bankId: activeQuestion.library,
              message: error instanceof Error ? error.message : '该题库暂时无法载入。',
            })
          })
        }}>重新读取</button>
      </main>
    )
  }

  if (workspaceView === 'reader' && (!activeQuestion || !activeProgress || !activeQuestion.body)) {
    return (
      <main className="load-state" aria-busy="true">
        <span className="load-state__mark"><Highlighter aria-hidden="true" /></span>
        <h1>正在编排题库</h1>
        <p>解析章节、题目与代码示例…</p>
        <span className="load-state__line" />
      </main>
    )
  }

  const readerProgress = activeProgress ?? progressFor(state, '')

  return (
    <div
      className={`app-shell${workspaceView === 'banks' || workspaceView === 'admin'
      ? ' is-bank-hub is-notes-closed is-library-closed'
      : `${focusMode ? ' is-focus-mode' : ''}${notesVisible ? '' : ' is-notes-closed'}${visibleDrawers.libraryOpen ? '' : ' is-library-closed'}${notesResizing ? ' is-resizing-notes' : ''}`}`}
      data-font-theme={state.settings.fontTheme}
      style={{ '--notes-panel-width': `${notesPanelWidth}px` } as CSSProperties}
    >
      <Rail
        mastered={railMasteredCount}
        total={railQuestions.length}
        reviewCount={railReviewCount}
        focusMode={focusMode}
        libraryOpen={libraryExpanded}
        notesOpen={notesExpanded && contextMode === 'notes'}
        workspaceOpen={notesExpanded}
        notesDisabled={practiceWorkspaceLocked}
        modalBlocked={mobileDrawerOpen}
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
        <Suspense fallback={<main className="load-state" aria-live="polite"><p>正在打开题库中心…</p></main>}>
          <QuestionBankHub
            banks={banks}
            questions={questions}
            state={state}
            currentBankId={library}
            onOpenBank={openQuestionBank}
            onOpenDashboard={openDashboard}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </Suspense>
      ) : workspaceView === 'admin' && user?.permissions.includes('banks.write') ? (
        <Suspense fallback={<main className="load-state" aria-live="polite"><p>正在打开管理工作区…</p></main>}>
          <AdminPanel
            user={user}
            initialCatalog={{ banks, sections }}
            onExit={openQuestionBanks}
            onCatalogChanged={async () => { await reloadCatalog() }}
          />
        </Suspense>
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
        mobileOpen={visibleMobileLibrary}
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

          <section className="reading-desk" inert={mobileDrawerOpen}>
        <Topbar
          question={activeQuestion}
          progress={readerProgress}
          libraryOpen={libraryExpanded}
          notesOpen={notesExpanded && contextMode === 'notes'}
          workspaceOpen={notesExpanded}
          pageLayout={state.settings.pageLayout}
          spreadAvailable={spreadAvailable}
          practiceMode={practiceMode}
          notesDisabled={practiceWorkspaceLocked}
          hasPrevious={!practiceMode && activeLibraryIndex > 0}
          hasNext={!practiceMode && activeLibraryIndex < activeLibraryQuestions.length - 1}
          onPrevious={() => navigateRelative(-1)}
          onNext={() => navigateRelative(1)}
          onToggleLibrary={toggleMobileLibrary}
          onToggleNotes={toggleNotes}
          onPageLayoutChange={changePageLayout}
          onTogglePracticeMode={togglePracticeMode}
          onOpenSearch={() => setCommandOpen(true)}
          onToggleFavorite={() => updateProgress(
            { favorite: !readerProgress.favorite },
            { recordActivity: true, reason: LOGIN_REASONS.progress },
          )}
        />
        <Reader
          question={activeQuestion}
          annotations={activeAnnotations}
          fontTheme={state.settings.fontTheme}
          readingSize={state.settings.readingSize}
          pageLayout={state.settings.pageLayout}
          practiceMode={practiceMode}
          initialScrollTop={readerProgress.scrollTop ?? 0}
          initialSpreadIndex={readerProgress.spreadIndex ?? 0}
          onSelection={setSelection}
          onAnnotationClick={() => openNotes()}
          onScrollPosition={(scrollTop) => updateProgress({ scrollTop }, { guestBehavior: 'ignore' })}
          onSpreadChange={(spreadIndex) => updateProgress({ spreadIndex }, { guestBehavior: 'ignore' })}
          onSpreadAvailabilityChange={setSpreadAvailable}
          onPracticeSchedule={schedulePracticeReview}
          onPracticeRevealChange={setPracticeRevealed}
          practiceCanSaveReview={Boolean(user && !user.mustChangePassword && syncReady)}
          onPracticeNext={() => {
            if (activeLibraryIndex < activeLibraryQuestions.length - 1) navigateRelative(1)
            else setPracticeMode(false)
          }}
          practiceNextLabel={activeLibraryIndex < activeLibraryQuestions.length - 1 ? '下一题' : '返回阅读'}
        />
        {!practiceMode && <StatusDock value={readerProgress.status} onChange={setStatus} />}
          </section>

          {!practiceWorkspaceLocked && <NotesPanel
          question={activeQuestion}
          progress={readerProgress}
          annotations={activeAnnotations}
          composer={composer}
          mobileOpen={visibleMobileNotes}
          expanded={notesExpanded}
          synced={Boolean(user)}
          width={notesPanelWidth}
          minWidth={NOTES_PANEL_MIN_WIDTH}
          maxWidth={notesMaximumWidth}
          compact={notesCompact}
          mode={contextMode}
          assistantFocusToken={assistantFocusToken}
          onClose={closeNotes}
          onModeChange={(mode) => {
            if (mode === 'assistant') openAssistant()
            else void openNotes()
          }}
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
          />}

          {!practiceWorkspaceLocked && <SelectionMenu
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
          />}

          {!practiceWorkspaceLocked && !notesExpanded && !visibleMobileLibrary && <FloatingAiButton open={false} onOpen={openAssistant} />}
        </>
      )}

      {commandOpen && <Suspense fallback={null}><CommandPalette open questions={questions} state={state} onClose={() => setCommandOpen(false)} onSelect={openQuestion} /></Suspense>}
      {dashboardOpen && <Suspense fallback={null}><DashboardDialog
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
      /></Suspense>}
      {settingsOpen && <Suspense fallback={null}><SettingsDialog
        open={settingsOpen}
        settings={{ ...state.settings, focusMode, notesOpen: drawerState.notesOpen }}
        spreadAvailable={spreadAvailable}
        fontSampleText={`${activeQuestion?.title ?? ''} ${activeQuestion?.plainText ?? ''} ${activeQuestion?.body ?? ''}`}
        onClose={() => setSettingsOpen(false)}
        onChange={changeSettings}
      /></Suspense>}
      {authOpen && <Suspense fallback={null}><AuthDialog
        open={authOpen}
        user={user}
        reason={authReason}
        onClose={() => { setAuthOpen(false); setAuthReason('') }}
        onSessionChanged={async () => {
          const nextUser = await refreshSession()
          await reloadCatalog()
          if (!nextUser && workspaceView === 'admin') openQuestionBanks()
        }}
      /></Suspense>}
      {inviteToken && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}
      {migrationOpen && <Suspense fallback={null}><LegacyMigrationDialog
        legacy={legacyStudyState()}
        userId={user?.id ?? ''}
        open={migrationOpen}
        onClose={() => setMigrationOpen(false)}
        onImported={(nextState) => {
          lastServerState.current = JSON.stringify(nextState)
          setState(nextState)
        }}
      /></Suspense>}

      {undo && <UndoToast message="批注已删除" onUndo={restoreAnnotation} onDismiss={() => setUndo(undefined)} />}
      {workspaceView === 'reader' && mobileDrawerOpen && <button className="mobile-scrim" type="button" tabIndex={-1} aria-hidden="true" onClick={closeMobileDrawers} aria-label="关闭侧栏" />}
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
