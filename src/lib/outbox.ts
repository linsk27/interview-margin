import type { StudyState } from '../types'
import { saveMyState } from './api'

const DB_NAME = 'interview-margin-sync'
const STORE_NAME = 'outbox'
const STATE_KEY = 'study-state'

interface QueuedState {
  key: string
  revision: string
  state: StudyState
  queuedAt: string
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: 'key' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function transaction<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore, finish: (value: T) => void) => void): Promise<T> {
  const db = await openDatabase()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode)
    const store = tx.objectStore(STORE_NAME)
    let value: T
    operation(store, (result) => { value = result })
    tx.oncomplete = () => { db.close(); resolve(value) }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

export async function queueStudyState(state: StudyState): Promise<string> {
  const revision = crypto.randomUUID()
  await transaction<void>('readwrite', (store, finish) => {
    store.put({ key: STATE_KEY, revision, state, queuedAt: new Date().toISOString() } satisfies QueuedState)
    finish(undefined)
  })
  return revision
}

export async function queuedStudyState(): Promise<QueuedState | undefined> {
  return transaction<QueuedState | undefined>('readonly', (store, finish) => {
    const request = store.get(STATE_KEY)
    request.onsuccess = () => finish(request.result as QueuedState | undefined)
  })
}

export async function clearQueuedState(revision: string): Promise<void> {
  const queued = await queuedStudyState()
  if (!queued || queued.revision !== revision) return
  await transaction<void>('readwrite', (store, finish) => { store.delete(STATE_KEY); finish(undefined) })
}

export async function flushQueuedState(): Promise<StudyState | undefined> {
  const queued = await queuedStudyState()
  if (!queued) return undefined
  const saved = await saveMyState(queued.state)
  await clearQueuedState(queued.revision)
  return saved
}
