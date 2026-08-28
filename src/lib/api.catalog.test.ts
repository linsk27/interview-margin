import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  ApiError,
  catalogIndexSections,
  getCatalog,
  getCatalogBank,
  getCatalogIndex,
  loadSplitCatalogWithLegacyFallback,
} from './api'

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
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('public catalog failover', () => {
  it('uses the live catalog while the personal-computer API is reachable', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(catalog))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getCatalog()).resolves.toEqual(catalog)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/catalog')
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: 'no-cache' })
  })

  it('derives plain text when the transport omits the duplicate field', async () => {
    const compactCatalog = {
      ...catalog,
      sections: [{
        id: 'section-1', title: '基础', order: 0, questions: [{
          id: 'question-1', library: 'public', number: '1', title: 'Q1：缓存',
          body: '**短回答：** 使用 `ETag` 复用响应。', sectionId: 'section-1', sectionTitle: '基础',
          tags: ['HTTP'], readMinutes: 1, order: 0,
        }],
      }],
    }
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(compactCatalog))
    vi.stubGlobal('fetch', fetchMock)

    const result = await getCatalog()
    expect(result.sections[0].questions[0].plainText).toBe('短回答： 使用 ETag 复用响应。')
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

describe('split public catalog delivery', () => {
  const index = {
    version: 1 as const,
    banks: [{
      ...catalog.banks[0],
      questionCount: 1,
      sections: [{
        id: 'section-1', title: '基础', order: 0, questionCount: 1, questions: [{
          id: 'question-1', library: 'public', number: '1', title: 'Q1：缓存',
          sectionId: 'section-1', sectionTitle: '基础', tags: ['HTTP'], readMinutes: 1, order: 0,
        }],
      }],
    }],
  }
  const bank = {
    version: 1 as const,
    bank: catalog.banks[0],
    sections: [{
      id: 'section-1', title: '基础', order: 0, questions: [{
        id: 'question-1', library: 'public', number: '1', title: 'Q1：缓存',
        body: '通过 **ETag** 重新验证。', sectionId: 'section-1', sectionTitle: '基础',
        tags: ['HTTP'], readMinutes: 1, order: 0,
      }],
    }],
  }

  it('loads the lightweight live index with revalidation enabled', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(index))
    vi.stubGlobal('fetch', fetchMock)

    const result = await getCatalogIndex()
    expect(result).toEqual(index)
    expect(catalogIndexSections(result)[0].questions[0]).toMatchObject({
      id: 'question-1', library: 'public', body: '', plainText: '',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/catalog/index')
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: 'no-cache' })
  })

  it('falls back to a bank snapshot and hydrates its searchable plain text', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('Live API unavailable'))
      .mockResolvedValueOnce(jsonResponse(bank))
    vi.stubGlobal('fetch', fetchMock)

    const result = await getCatalogBank('public')
    expect(result.sections[0].questions[0].plainText).toBe('通过 ETag 重新验证。')
    expect(fetchMock.mock.calls[0][0]).toBe('/api/catalog/banks/public')
    expect(fetchMock.mock.calls[1][0]).toBe('/catalog-banks/public.json')
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ cache: 'no-cache' })
  })

  it('falls back on a retryable live 5xx response', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'Temporarily unavailable' }, 503))
      .mockResolvedValueOnce(jsonResponse(index))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getCatalogIndex()).resolves.toEqual(index)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][0]).toBe('/catalog-index.json')
  })

  it('does not replace an authoritative live 4xx response with a snapshot', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: 'Not found' }, 404))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getCatalogBank('removed')).rejects.toMatchObject<ApiError>({ status: 404 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/catalog/banks/removed')
  })

  it('does not use an older cached snapshot after snapshot revalidation returns 4xx', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('Live API unavailable'))
      .mockResolvedValueOnce(jsonResponse({ error: 'Snapshot removed' }, 404))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getCatalogBank('removed')).rejects.toMatchObject<ApiError>({ status: 404 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][0]).toBe('/catalog-banks/removed.json')
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ cache: 'no-cache' })
  })

  it('times out snapshot revalidation independently before using the cached snapshot', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('Live API unavailable'))
      .mockImplementationOnce((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
        options.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
      }))
      .mockResolvedValueOnce(jsonResponse(index))
    vi.stubGlobal('fetch', fetchMock)

    const result = getCatalogIndex()
    await vi.advanceTimersByTimeAsync(2_000)

    await expect(result).resolves.toEqual(index)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ cache: 'no-cache' })
    expect(fetchMock.mock.calls[2][1]).toMatchObject({ cache: 'force-cache' })
    expect(fetchMock.mock.calls[1][1].signal).not.toBe(fetchMock.mock.calls[2][1].signal)
  })

  it('keeps the legacy catalog lazy on split success', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(loadSplitCatalogWithLegacyFallback(async () => catalog)).resolves.toEqual(catalog)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uses the live legacy catalog only after the complete split flow fails', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'Bank removed' }, 404))
      .mockResolvedValueOnce(jsonResponse(catalog))
    vi.stubGlobal('fetch', fetchMock)

    await expect(loadSplitCatalogWithLegacyFallback(async () => {
      await getCatalogBank('removed')
      throw new Error('unreachable')
    })).resolves.toEqual(catalog)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/catalog/banks/removed',
      '/api/catalog',
    ])
  })
})
