import type { InterviewSection, QuestionBankDefinition, SessionUser, StudyState } from '../types'

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
  const response = await fetch(url, { ...options, headers, credentials: 'same-origin' })
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

export function getSession() {
  return api<{ user: SessionUser | null }>('/api/auth/session')
}

export function getCatalog() {
  return api<{ banks: QuestionBankDefinition[]; sections: InterviewSection[] }>('/api/catalog')
}

export function getMyState() {
  return api<StudyState>('/api/me/state')
}

export function saveMyState(state: StudyState) {
  return api<StudyState>('/api/me/state', { method: 'PUT', body: JSON.stringify(state) })
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

export async function hashState(state: StudyState): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(state))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((item) => item.toString(16).padStart(2, '0')).join('')
}

export function importLegacyState(state: StudyState, contentHash: string) {
  return api<{ repeated: boolean; summary: { progress: number; annotations: number; activityDays: number }; state: StudyState }>(
    '/api/me/import-local',
    { method: 'POST', body: JSON.stringify({ state, contentHash }) },
  )
}
