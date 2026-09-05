import type { InterviewScoreWithAttempt } from './interviewScore'
import { mergeInterviewAttempts } from './api'

/** Small IndexedDB store for guest drafts and score history. */
const DATABASE_NAME = 'interview-margin-practice'
const DATABASE_VERSION = 1
const DRAFTS_STORE = 'drafts'
const ATTEMPTS_STORE = 'attempts'
const FALLBACK_DRAFT_PREFIX = 'interview-margin:draft:'
const FALLBACK_ATTEMPTS_KEY = 'interview-margin:attempts:v1'

export interface LocalInterviewAttempt {
  clientId: string
  questionId: string
  answer: string
  result: InterviewScoreWithAttempt
  createdAt: string
}

function hasIndexedDb() {
  return typeof indexedDB !== 'undefined'
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(DRAFTS_STORE)) database.createObjectStore(DRAFTS_STORE)
      if (!database.objectStoreNames.contains(ATTEMPTS_STORE)) {
        const store = database.createObjectStore(ATTEMPTS_STORE, { keyPath: 'clientId' })
        store.createIndex('questionId', 'questionId', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('无法打开练习记录存储。'))
  })
}

function fallbackRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

function fallbackWrite(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage is optional */ }
}

export async function savePracticeDraft(questionId: string, answer: string) {
  const value = answer.slice(0, 6_000)
  if (!hasIndexedDb()) {
    if (value) fallbackWrite(`${FALLBACK_DRAFT_PREFIX}${questionId}`, value)
    else { try { localStorage.removeItem(`${FALLBACK_DRAFT_PREFIX}${questionId}`) } catch { /* noop */ } }
    return
  }
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(DRAFTS_STORE, 'readwrite')
    if (value) transaction.objectStore(DRAFTS_STORE).put(value, questionId)
    else transaction.objectStore(DRAFTS_STORE).delete(questionId)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('练习草稿保存失败。'))
  }).finally(() => database.close())
}

export async function loadPracticeDraft(questionId: string): Promise<string> {
  if (!hasIndexedDb()) return fallbackRead(`${FALLBACK_DRAFT_PREFIX}${questionId}`, '')
  const database = await openDatabase()
  return new Promise<string>((resolve) => {
    const request = database.transaction(DRAFTS_STORE, 'readonly').objectStore(DRAFTS_STORE).get(questionId)
    request.onsuccess = () => { database.close(); resolve(typeof request.result === 'string' ? request.result : '') }
    request.onerror = () => { database.close(); resolve('') }
  })
}

export async function saveLocalInterviewAttempt(attempt: LocalInterviewAttempt) {
  if (!hasIndexedDb()) {
    const current = fallbackRead<LocalInterviewAttempt[]>(FALLBACK_ATTEMPTS_KEY, [])
    const next = [attempt, ...current.filter((item) => item.clientId !== attempt.clientId)].slice(0, 30)
    fallbackWrite(FALLBACK_ATTEMPTS_KEY, next)
    return
  }
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(ATTEMPTS_STORE, 'readwrite')
    transaction.objectStore(ATTEMPTS_STORE).put(attempt)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('本地评分记录保存失败。'))
  }).finally(() => database.close())
}

export async function listLocalInterviewAttempts(questionId?: string): Promise<LocalInterviewAttempt[]> {
  if (!hasIndexedDb()) {
    const current = fallbackRead<LocalInterviewAttempt[]>(FALLBACK_ATTEMPTS_KEY, [])
    return (questionId ? current.filter((item) => item.questionId === questionId) : current).slice(0, 30)
  }
  const database = await openDatabase()
  return new Promise<LocalInterviewAttempt[]>((resolve) => {
    const request = database.transaction(ATTEMPTS_STORE, 'readonly').objectStore(ATTEMPTS_STORE).getAll()
    request.onsuccess = () => {
      database.close()
      const items = (request.result as LocalInterviewAttempt[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      resolve((questionId ? items.filter((item) => item.questionId === questionId) : items).slice(0, 30))
    }
    request.onerror = () => { database.close(); resolve([]) }
  })
}

export async function clearLocalInterviewAttempt(clientId: string) {
  if (!hasIndexedDb()) {
    const current = fallbackRead<LocalInterviewAttempt[]>(FALLBACK_ATTEMPTS_KEY, [])
    fallbackWrite(FALLBACK_ATTEMPTS_KEY, current.filter((item) => item.clientId !== clientId))
    return
  }
  const database = await openDatabase()
  await new Promise<void>((resolve) => {
    const transaction = database.transaction(ATTEMPTS_STORE, 'readwrite')
    transaction.objectStore(ATTEMPTS_STORE).delete(clientId)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => resolve()
  }).finally(() => database.close())
}

/** Merge local guest records once an account becomes available. */
export async function mergeLocalInterviewAttempts() {
  const local = await listLocalInterviewAttempts()
  if (!local.length) return { inserted: 0, repeated: 0 }
  const result = await mergeInterviewAttempts(local.map((item) => ({
    clientId: item.clientId,
    questionId: item.questionId,
    answer: item.answer,
    score: item.result.score,
    dimensions: item.result.dimensions,
    corrections: item.result.corrections,
    strengths: item.result.strengths,
    gaps: item.result.gaps,
    nextStep: item.result.nextStep,
    band: item.result.band,
    summary: item.result.summary,
    createdAt: item.createdAt,
  })))
  await Promise.all(local.map((item) => clearLocalInterviewAttempt(item.clientId)))
  return result
}

