import type { QuestionProgress, StudyState } from '../types'
import { EMPTY_PROGRESS } from '../types'

const STORAGE_KEY = 'interview-margin:study-state:v1'

function preferredTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function createDefaultState(): StudyState {
  return {
    version: 1,
    progress: {},
    annotations: [],
    activity: {},
    settings: {
      theme: preferredTheme(),
      readingSize: 'comfortable',
      focusMode: false,
      notesOpen: true,
    },
  }
}

export function loadStudyState(): StudyState {
  const fallback = createDefaultState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    return parseStudyState(raw, fallback)
  } catch {
    return fallback
  }
}

export function saveStudyState(state: StudyState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function parseStudyState(raw: string, fallback = createDefaultState()): StudyState {
  const parsed = JSON.parse(raw) as Partial<StudyState>
  if (parsed.version !== 1 || typeof parsed.progress !== 'object' || !Array.isArray(parsed.annotations)) {
    throw new Error('这不是面试边注导出的进度文件。')
  }
  return {
    version: 1,
    progress: parsed.progress ?? {},
    annotations: parsed.annotations,
    activity: parsed.activity ?? {},
    settings: { ...fallback.settings, ...parsed.settings },
  }
}

export function progressFor(state: StudyState, questionId: string): QuestionProgress {
  return { ...EMPTY_PROGRESS, ...state.progress[questionId] }
}

export function todayKey(date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function withActivity(state: StudyState, amount = 1): StudyState {
  const day = todayKey()
  return {
    ...state,
    activity: {
      ...state.activity,
      [day]: (state.activity[day] ?? 0) + amount,
    },
  }
}

export function exportStudyState(state: StudyState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `interview-margin-progress-${todayKey()}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function uid(prefix: string): string {
  const value = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${prefix}-${value}`
}
