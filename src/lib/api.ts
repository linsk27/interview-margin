import type {
  InterviewQuestion, InterviewSection, QuestionBankDefinition, SessionUser, StudyState,
} from '../types'
import { plainTextFromMarkdown } from './markdown'

export interface PublicCatalog {
  banks: QuestionBankDefinition[]
  sections: InterviewSection[]
}

export interface PublicCatalogIndexSection {
  id: string
  title: string
  order: number
  questionCount: number
  questions: PublicCatalogIndexQuestion[]
}

export type PublicCatalogIndexQuestion = Omit<InterviewQuestion, 'body' | 'plainText'>

export interface PublicCatalogIndexBank extends QuestionBankDefinition {
  questionCount: number
  sections: PublicCatalogIndexSection[]
}

export interface PublicCatalogIndex {
  version: 1
  banks: PublicCatalogIndexBank[]
}

export interface PublicBankCatalog {
  version: 1
  bank: QuestionBankDefinition
  sections: InterviewSection[]
}

const CATALOG_API_TIMEOUT_MS = 2_000
const APP_BASE = import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL.replace(/\/$/, '')

export function appPath(path: string) {
  return `${APP_BASE}${path.startsWith('/') ? path : `/${path}`}`
}

type CatalogQuestionPayload = Omit<InterviewQuestion, 'plainText'> & { plainText?: string }

function hydrateQuestion(value: unknown): InterviewQuestion {
  if (!value || typeof value !== 'object' || typeof (value as CatalogQuestionPayload).body !== 'string') {
    throw new ApiError('题库题目缺少正文。', 502)
  }
  const question = value as CatalogQuestionPayload
  return {
    ...question,
    plainText: typeof question.plainText === 'string'
      ? question.plainText
      : plainTextFromMarkdown(question.body),
  }
}

function hydrateSections(value: unknown): InterviewSection[] {
  if (!Array.isArray(value)) throw new ApiError('题库章节格式无效。', 502)
  return value.map((section) => {
    if (!section || typeof section !== 'object' || !Array.isArray((section as InterviewSection).questions)) {
      throw new ApiError('题库章节格式无效。', 502)
    }
    return {
      ...(section as InterviewSection),
      questions: (section as InterviewSection).questions.map(hydrateQuestion),
    }
  })
}

function parsePublicCatalog(value: unknown): PublicCatalog | undefined {
  if (!value || typeof value !== 'object' || !Array.isArray((value as PublicCatalog).banks)) return undefined
  try {
    return {
      banks: (value as PublicCatalog).banks,
      sections: hydrateSections((value as PublicCatalog).sections),
    }
  } catch {
    return undefined
  }
}

function parseCatalogIndex(value: unknown): PublicCatalogIndex | undefined {
  if (!value || typeof value !== 'object') return undefined
  const index = value as PublicCatalogIndex
  if (index.version !== 1 || !Array.isArray(index.banks)) return undefined
  if (!index.banks.every((bank) => bank && typeof bank.id === 'string'
    && Number.isInteger(bank.questionCount) && Array.isArray(bank.sections)
    && bank.sections.every((section) => section && typeof section.id === 'string'
      && Number.isInteger(section.questionCount) && Array.isArray(section.questions)
      && section.questions.every((question) => question && typeof question.id === 'string'
        && typeof question.library === 'string' && typeof question.title === 'string')))) return undefined
  return index
}

function parseBankCatalog(value: unknown): PublicBankCatalog | undefined {
  if (!value || typeof value !== 'object') return undefined
  const catalog = value as PublicBankCatalog
  if (catalog.version !== 1 || !catalog.bank || typeof catalog.bank.id !== 'string') return undefined
  try {
    return { ...catalog, sections: hydrateSections(catalog.sections) }
  } catch {
    return undefined
  }
}

export type InvitationStatus = 'pending' | 'active' | 'used' | 'revoked' | 'expired'

export interface ManagedInvitation {
  id: string
  status: InvitationStatus
  expiresAt: string
  createdAt: string
  usedAt?: string
  revokedAt?: string
  usedByUsername?: string
}

export class ApiError extends Error {
  status: number
  payload?: Record<string, unknown>

  constructor(message: string, status: number, payload?: Record<string, unknown>) {
    super(message)
    this.status = status
    this.payload = payload
  }
}

export async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const method = (options.method ?? 'GET').toUpperCase()
  const response = await fetch(appPath(url), {
    ...options,
    headers,
    credentials: 'same-origin',
    ...(method === 'GET' && !options.cache ? { cache: 'no-store' as const } : {}),
  })
  const contentType = response.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json') ? await response.json() : await response.text()
  if (!response.ok) {
    const message = typeof payload === 'object' && payload && 'error' in payload
      ? String(payload.error)
      : `请求失败：HTTP ${response.status}`
    throw new ApiError(message, response.status, typeof payload === 'object' ? payload as Record<string, unknown> : undefined)
  }
  return payload as T
}

export async function getSession() {
  const session = await api<unknown>('/api/auth/session')
  if (!session || typeof session !== 'object' || !('user' in session)) {
    throw new ApiError('账户服务返回了无效响应。', 502)
  }
  return session as { user: SessionUser | null }
}

export async function getCatalog(): Promise<PublicCatalog> {
  const load = async (path: string, cache: RequestCache, invalidResponseMessage: string) => {
    const controller = new AbortController()
    const timeout = globalThis.setTimeout(() => controller.abort(), CATALOG_API_TIMEOUT_MS)
    try {
      const catalog = parsePublicCatalog(await api<unknown>(path, { signal: controller.signal, cache }))
      if (!catalog) throw new ApiError(invalidResponseMessage, 502)
      return catalog
    } catch (error) {
      if (controller.signal.aborted) throw new ApiError('题库请求超时。', 504)
      throw error
    } finally {
      globalThis.clearTimeout(timeout)
    }
  }

  try {
    return await load('/api/catalog', 'no-cache', '实时题库返回了无效响应。')
  } catch {
    // Vercel keeps this public-only snapshot available when the personal-computer API is offline.
    // Revalidate first so a previously visited browser does not keep an old question bank forever.
    // If the device is offline, fall back once more to the last cached snapshot.
    try {
      return await load('/catalog.json', 'no-cache', '云端题库快照返回了无效响应。')
    } catch {
      return load('/catalog.json', 'force-cache', '云端题库快照返回了无效响应。')
    }
  }
}

function isAuthoritativeCatalogClientError(error: unknown) {
  return error instanceof ApiError && error.status >= 400 && error.status < 500
}

async function getSplitCatalogResource<T>({
  livePath,
  snapshotPath,
  parse,
}: {
  livePath: string
  snapshotPath: string
  parse: (value: unknown) => T | undefined
}): Promise<T> {
  const load = async (path: string, cache: RequestCache, invalidResponseMessage: string) => {
    const controller = new AbortController()
    const timeout = globalThis.setTimeout(() => controller.abort(), CATALOG_API_TIMEOUT_MS)
    try {
      const result = parse(await api<unknown>(path, { signal: controller.signal, cache }))
      if (!result) throw new ApiError(invalidResponseMessage, 502)
      return result
    } catch (error) {
      if (controller.signal.aborted) throw new ApiError('题库请求超时。', 504)
      throw error
    } finally {
      globalThis.clearTimeout(timeout)
    }
  }

  try {
    return await load(livePath, 'no-cache', '实时题库返回了无效响应。')
  } catch (error) {
    if (isAuthoritativeCatalogClientError(error)) throw error
    try {
      return await load(snapshotPath, 'no-cache', '题库快照返回了无效响应。')
    } catch (snapshotError) {
      if (isAuthoritativeCatalogClientError(snapshotError)) throw snapshotError
      return load(snapshotPath, 'force-cache', '题库快照返回了无效响应。')
    }
  }
}

/**
 * Runs the complete split-catalog bootstrap first and only pays for the legacy
 * full catalog when that caller-defined flow cannot produce a usable catalog.
 * Resource-level 4xx responses still never probe their matching split snapshot.
 */
export async function loadSplitCatalogWithLegacyFallback(
  loadSplitCatalog: () => Promise<PublicCatalog>,
): Promise<PublicCatalog> {
  try {
    return await loadSplitCatalog()
  } catch {
    return getCatalog()
  }
}

export function getCatalogIndex(): Promise<PublicCatalogIndex> {
  return getSplitCatalogResource({
    livePath: '/api/catalog/index',
    snapshotPath: '/catalog-index.json',
    parse: parseCatalogIndex,
  })
}

export function catalogIndexSections(index: PublicCatalogIndex): InterviewSection[] {
  return index.banks.flatMap((bank) => bank.sections.map((section) => ({
    id: section.id,
    title: section.title,
    order: section.order,
    questions: section.questions.map((question) => ({
      ...question,
      body: '',
      plainText: '',
    })),
  })))
}

export async function getCatalogBank(bankId: string): Promise<PublicBankCatalog> {
  const encodedBankId = encodeURIComponent(bankId)
  const catalog = await getSplitCatalogResource({
    livePath: `/api/catalog/banks/${encodedBankId}`,
    snapshotPath: `/catalog-banks/${encodedBankId}.json`,
    parse: parseBankCatalog,
  })
  if (catalog.bank.id !== bankId) throw new ApiError('题库快照与请求不匹配。', 502)
  return catalog
}

function expectedUserHeaders(userId: string): HeadersInit {
  return { 'X-Expected-User-Id': userId }
}

export function getMyState(userId: string) {
  return api<StudyState>('/api/me/state', { headers: expectedUserHeaders(userId) })
}

export function saveMyState(userId: string, state: StudyState) {
  return api<StudyState>('/api/me/state', {
    method: 'PUT', headers: expectedUserHeaders(userId), body: JSON.stringify(state),
  })
}

export function login(username: string, password: string) {
  return api<{ ok: true; mustChangePassword: boolean }>('/api/auth/login', {
    method: 'POST', body: JSON.stringify({ username, password }),
  })
}

export function logout() {
  return api<{ ok: true }>('/api/auth/logout', { method: 'POST' })
}

export function changePassword(currentPassword: string, newPassword: string) {
  return api<{ ok: true }>('/api/auth/change-password', {
    method: 'POST', body: JSON.stringify({ currentPassword, newPassword }),
  })
}

export function inspectInvitation(token: string) {
  return api<{ valid: true; expiresAt: string }>('/api/invitations/inspect', {
    method: 'POST', body: JSON.stringify({ token }),
  })
}

export function acceptInvitation(token: string, username: string, displayName: string, password: string) {
  return api<{ ok: true; user: SessionUser }>('/api/invitations/accept', {
    method: 'POST', body: JSON.stringify({ token, username, displayName, password }),
  })
}

export function listInvitations() {
  return api<{ invitations: ManagedInvitation[] }>('/api/admin/invitations')
}

export function createInvitation(expiresInHours: number) {
  return api<{ invitation: ManagedInvitation; token: string }>('/api/admin/invitations', {
    method: 'POST', body: JSON.stringify({ expiresInHours }),
  })
}

export function revokeInvitation(id: string) {
  return api<{ ok: true }>(`/api/admin/invitations/${encodeURIComponent(id)}/revoke`, { method: 'POST' })
}

export async function hashState(state: StudyState): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(state))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((item) => item.toString(16).padStart(2, '0')).join('')
}

export function importLegacyState(userId: string, state: StudyState, contentHash: string) {
  return api<{ repeated: boolean; summary: { progress: number; annotations: number; activityDays: number }; state: StudyState }>(
    '/api/me/import-local',
    { method: 'POST', headers: expectedUserHeaders(userId), body: JSON.stringify({ state, contentHash }) },
  )
}
