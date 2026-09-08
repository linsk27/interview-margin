import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandPalette } from './CommandPalette'
import { searchCatalogPage, type CatalogSearchPage } from '../lib/api'
import { createDefaultState } from '../lib/storage'
import type { InterviewQuestion } from '../types'

vi.mock('../lib/api', () => ({ searchCatalogPage: vi.fn() }))
const search = vi.mocked(searchCatalogPage)
const question = (id: string): InterviewQuestion => ({
  id, library: 'java', number: id, title: `题目 ${id}`, body: '', plainText: '',
  sectionTitle: 'Java 基础', sectionId: 'java-1', tags: [], readMinutes: 2, order: 1,
})
const page = (ids: string[], more = false): CatalogSearchPage => ({
  query: '关键字', total: more ? 25 : ids.length,
  results: ids.map((id) => ({ ...question(id), bankTitle: 'Java 题库', matchSnippet: '正文里的关键字，题名没有包含。' })),
  hasMore: more, nextCursor: more ? 'page-2' : null,
})
const mount = (questions = [question('1')]) => {
  const onSelect = vi.fn()
  render(<CommandPalette open questions={questions} state={createDefaultState()} onClose={vi.fn()} onSelect={onSelect} />)
  return { input: screen.getByRole('combobox', { name: '搜索全部题库' }), onSelect }
}

beforeEach(() => {
  search.mockReset()
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('global question search', () => {
  it('finds server-side body matches in a bank that has not been opened', async () => {
    search.mockResolvedValue(page(['1']))
    const { input, onSelect } = mount()
    expect(search).not.toHaveBeenCalled()
    fireEvent.change(input, { target: { value: '关键字' } })
    await screen.findByText('正文里的关键字，题名没有包含。')
    expect(search).toHaveBeenCalledWith('关键字', { limit: 24, cursor: undefined }, expect.any(AbortSignal))
    expect(screen.getByText('Java 题库 · Java 基础')).toBeTruthy()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }))
  })

  it('shows the real total and retrieves subsequent results without growing the list', async () => {
    search.mockResolvedValueOnce(page(Array.from({ length: 24 }, (_, i) => String(i + 1)), true))
      .mockResolvedValueOnce({ ...page(['25']), total: 25 })
    const { input } = mount()
    fireEvent.change(input, { target: { value: '关键字' } })
    await screen.findByText('共 25 个结果 · 第 1 页')
    expect(screen.getAllByRole('option')).toHaveLength(24)
    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
    await screen.findByText('共 25 个结果 · 第 2 页')
    expect(screen.getAllByRole('option')).toHaveLength(1)
    expect(search.mock.calls[1][1]).toMatchObject({ cursor: 'page-2' })
    expect(input.getAttribute('aria-activedescendant')).toBe(screen.getByRole('option').id)
  })

  it('ignores a late response for a keyword that has been replaced', async () => {
    let resolveOld!: (value: CatalogSearchPage) => void
    search.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve }))
      .mockResolvedValueOnce(page(['new']))
    const { input } = mount()
    fireEvent.change(input, { target: { value: 'old' } })
    await waitFor(() => expect(search).toHaveBeenCalledTimes(1))
    fireEvent.change(input, { target: { value: 'new' } })
    await screen.findByText('题目 new')
    await act(async () => resolveOld(page(['old'])))
    expect(screen.queryByText('题目 old')).toBeNull()
    expect(search.mock.calls[0][2]?.aborted).toBe(true)
  })

  it('labels degraded coverage honestly and can retry the full search', async () => {
    search.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(page(['remote']))
    const { input } = mount([{ ...question('local'), title: '本机关键字' }])
    fireEvent.change(input, { target: { value: '关键字' } })
    await screen.findByRole('button', { name: '重试全站搜索' })
    expect(screen.getByText('本机关键字')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '重试全站搜索' }))
    await screen.findByText('题目 remote')
    expect(screen.queryByRole('button', { name: '重试全站搜索' })).toBeNull()
  })

  it('keeps keyboard selection valid after an empty search and does not submit during composition', async () => {
    search.mockResolvedValueOnce(page([])).mockResolvedValueOnce(page(['1']))
    const { input, onSelect } = mount()
    fireEvent.change(input, { target: { value: 'missing' } })
    await screen.findByRole('button', { name: '清除关键词' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input.hasAttribute('aria-activedescendant')).toBe(false)
    fireEvent.change(input, { target: { value: 'found' } })
    await screen.findByRole('option')
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    expect(onSelect).not.toHaveBeenCalled()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledTimes(1)
  })
})
