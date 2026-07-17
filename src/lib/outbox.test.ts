import 'fake-indexeddb/auto'

import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearQueuedState, flushQueuedState, queueStudyState, queuedStudyState } from './outbox'
import { createDefaultState } from './storage'

describe('IndexedDB study-state outbox', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('keeps only the latest full state and removes it after server confirmation', async () => {
    const first = createDefaultState()
    first.activity['2026-07-17'] = 1
    await queueStudyState(first)

    const latest = createDefaultState()
    latest.activity['2026-07-17'] = 2
    await queueStudyState(latest)
    expect((await queuedStudyState())?.state.activity['2026-07-17']).toBe(2)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(latest), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })))
    const saved = await flushQueuedState()
    expect(saved?.activity['2026-07-17']).toBe(2)
    expect(await queuedStudyState()).toBeUndefined()
  })

  it('does not clear a newer revision when an older save finishes', async () => {
    const first = createDefaultState()
    const oldRevision = await queueStudyState(first)
    const second = createDefaultState()
    second.activity['2026-07-17'] = 3
    await queueStudyState(second)
    await clearQueuedState(oldRevision)
    expect((await queuedStudyState())?.state.activity['2026-07-17']).toBe(3)
  })
})
