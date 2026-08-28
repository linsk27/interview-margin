export type StudyStatus = 'unread' | 'learning' | 'review' | 'mastered'
export type HighlightColor = 'yellow' | 'blue' | 'green' | 'rose'
export type ThemeMode = 'light' | 'dark'
export type FontTheme = 'clean' | 'playful' | 'notebook' | 'flowing'
export type ReadingSize = 'compact' | 'comfortable' | 'large'
export type PageLayout = 'single' | 'spread'
// Question banks are registered at runtime, so new packs do not require widening a union type.
export type QuestionLibrary = string

export interface QuestionBankDefinition {
  id: QuestionLibrary
  title: string
  shortTitle: string
  kicker: string
  category: string
  description: string
  source?: string
  idPrefix?: string
  baseTags: string[]
  tone: 'blue' | 'amber' | 'green' | 'rose'
  visibility?: 'public' | 'private'
  version?: number
  archivedAt?: string
}

export interface QuestionSource {
  id?: string
  title: string
  url: string
  kind?: string
  verifiedAt?: string
}

export interface InterviewQuestion {
  id: string
  library: QuestionLibrary
  number: string
  title: string
  body: string
  plainText: string
  sectionId: string
  sectionTitle: string
  tags: string[]
  readMinutes: number
  order: number
  difficulty?: 'basic' | 'intermediate' | 'advanced'
  version?: number
  provenance?: string
  verifiedAt?: string
  archivedAt?: string
  sources?: QuestionSource[]
}

export interface SessionUser {
  id: string
  username: string
  displayName: string
  mustChangePassword: boolean
  roles: Array<'admin' | 'editor' | 'learner'>
  permissions: string[]
}

export interface InterviewSection {
  id: string
  title: string
  questions: InterviewQuestion[]
  order: number
}

export interface QuestionProgress {
  status: StudyStatus
  favorite: boolean
  note: string
  readCount: number
  seconds: number
  lastOpenedAt?: string
  dueAt?: string
  scrollTop?: number
  spreadIndex?: number
}

export interface Annotation {
  id: string
  questionId: string
  quote: string
  note: string
  color: HighlightColor
  createdAt: string
  updatedAt: string
}

export interface ReaderSettings {
  theme: ThemeMode
  fontTheme: FontTheme
  readingSize: ReadingSize
  pageLayout: PageLayout
  focusMode: boolean
  notesOpen: boolean
}

export interface StudyState {
  version: 1
  progress: Record<string, QuestionProgress>
  annotations: Annotation[]
  activity: Record<string, number>
  settings: ReaderSettings
}

export interface SelectionDraft {
  quote: string
  x: number
  y: number
}

export const STATUS_LABELS: Record<StudyStatus, string> = {
  unread: '未开始',
  learning: '学习中',
  review: '需复习',
  mastered: '已掌握',
}

export const STATUS_ORDER: StudyStatus[] = ['unread', 'learning', 'review', 'mastered']

export const EMPTY_PROGRESS: QuestionProgress = {
  status: 'unread',
  favorite: false,
  note: '',
  readCount: 0,
  seconds: 0,
  scrollTop: 0,
  spreadIndex: 0,
}
