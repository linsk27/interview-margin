import { afterEach, describe, expect, it, vi } from 'vitest'

import { getCatalog } from './api'

const catalog = {
  banks: [{
    id: 'public',
    title: '公开题库',
    shortTitle: '公开题库',
    kicker: 'PUBLIC',
    category: '面试',
    description: '公开内容',
    baseTags: ['公开'],
    tone: 'blue' as const,
    visibility: 'public' as const,
  }],
  sections: [],
}

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('public catalog failover', () => {
  it('uses the live catalog while the personal-computer API is reachable', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(catalog))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getCatalog()).resolves.toEqual(catalog)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/catalog')
  })

  it('falls back to the Vercel public snapshot when the live API is unavailable', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse(catalog))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getCatalog()).resolves.toEqual(catalog)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][0]).toBe('/catalog.json')
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ cache: 'no-cache' })
  })

  it('rejects an SPA HTML response and still loads the public snapshot', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('<!doctype html><title>App</title>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }))
      .mockResolvedValueOnce(jsonResponse(catalog))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getCatalog()).resolves.toEqual(catalog)
    expect(fetchMock.mock.calls[1][0]).toBe('/catalog.json')
  })

  it('uses the cached public snapshot when both live endpoints are offline', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('Live API unavailable'))
      .mockRejectedValueOnce(new TypeError('Snapshot revalidation unavailable'))
      .mockResolvedValueOnce(jsonResponse(catalog))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getCatalog()).resolves.toEqual(catalog)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[1][0]).toBe('/catalog.json')
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ cache: 'no-cache' })
    expect(fetchMock.mock.calls[2][0]).toBe('/catalog.json')
    expect(fetchMock.mock.calls[2][1]).toMatchObject({ cache: 'force-cache' })
  })
})
