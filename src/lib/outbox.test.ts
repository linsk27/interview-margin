import 'fake-indexeddb/auto'

import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearQueuedState, flushQueuedState, queueStudyState, queuedStudyState } from './outbox'
import { createDefaultState } from './storage'

describe('IndexedDB study-state outbox', () => {
  const userA = 'user-a'
  const userB = 'user-b'

  afterEach(() => vi.unstubAllGlobals())

  it('keeps only the latest full state and removes it after server confirmation', async () => {
    const first = createDefaultState()
    first.activity['2026-07-17'] = 1
    await queueStudyState(userA, first)

    const latest = createDefaultState()
    latest.activity['2026-07-17'] = 2
    await queueStudyState(userA, latest)
    expect((await queuedStudyState(userA))?.state.activity['2026-07-17']).toBe(2)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(latest), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })))
    const saved = await flushQueuedState(userA)
    expect(saved?.activity['2026-07-17']).toBe(2)
    expect(await queuedStudyState(userA)).toBeUndefined()
  })

  it('does not clear a newer revision when an older save finishes', async () => {
    const first = createDefaultState()
    const oldRevision = await queueStudyState(userA, first)
    const second = createDefaultState()
    second.activity['2026-07-17'] = 3
    await queueStudyState(userA, second)
    await clearQueuedState(userA, oldRevision)
    expect((await queuedStudyState(userA))?.state.activity['2026-07-17']).toBe(3)
  })

  it('keeps queues isolated by account and never flushes another user state', async () => {
    const stateA = createDefaultState()
    stateA.activity['2026-07-17'] = 4
    const stateB = createDefaultState()
    stateB.activity['2026-07-17'] = 9
    await queueStudyState(userA, stateA)
    await queueStudyState(userB, stateB)

    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(stateB), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    await flushQueuedState(userB)
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).activity['2026-07-17']).toBe(9)
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get('X-Expected-User-Id')).toBe(userB)
    expect((await queuedStudyState(userA))?.state.activity['2026-07-17']).toBe(4)
    expect(await queuedStudyState(userB)).toBeUndefined()
  })

  it('does not upload user A state when a new user B signs in, and resumes it only for A', async () => {
    const stateA = createDefaultState()
    stateA.activity['2026-07-18'] = 6
    await queueStudyState(userA, stateA)
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(stateA), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    expect(await flushQueuedState(userB)).toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
    expect((await queuedStudyState(userA))?.state.activity['2026-07-18']).toBe(6)

    await flushQueuedState(userA)
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(await queuedStudyState(userA)).toBeUndefined()
  })
})
