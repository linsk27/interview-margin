import type { InterviewSection, QuestionBankDefinition, SessionUser, StudyState } from '../types'

export interface PublicCatalog {
  banks: QuestionBankDefinition[]
  sections: InterviewSection[]
}

const CATALOG_API_TIMEOUT_MS = 2_000
const APP_BASE = import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL.replace(/\/$/, '')

export function appPath(path: string) {
  return `${APP_BASE}${path.startsWith('/') ? path : `/${path}`}`
}

function isPublicCatalog(value: unknown): value is PublicCatalog {
  return Boolean(value && typeof value === 'object'
    && Array.isArray((value as PublicCatalog).banks)
    && Array.isArray((value as PublicCatalog).sections))
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
  const controller = new AbortController()
  const timeout = globalThis.setTimeout(() => controller.abort(), CATALOG_API_TIMEOUT_MS)

  try {
    const catalog = await api<unknown>('/api/catalog', { signal: controller.signal })
    if (!isPublicCatalog(catalog)) throw new ApiError('实时题库返回了无效响应。', 502)
    return catalog
  } catch {
    // Vercel keeps this public-only snapshot available when the personal-computer API is offline.
    // Revalidate first so a previously visited browser does not keep an old question bank forever.
    // If the device is offline, fall back once more to the last cached snapshot.
    try {
      const catalog = await api<unknown>('/catalog.json', { cache: 'no-cache' })
      if (!isPublicCatalog(catalog)) throw new ApiError('云端题库快照返回了无效响应。', 502)
      return catalog
    } catch {
      const catalog = await api<unknown>('/catalog.json', { cache: 'force-cache' })
      if (!isPublicCatalog(catalog)) throw new ApiError('云端题库快照返回了无效响应。', 502)
      return catalog
    }
  } finally {
    globalThis.clearTimeout(timeout)
  }
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
