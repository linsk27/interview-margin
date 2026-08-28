import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { QuestionBankDefinition, SessionUser } from '../types'
import { AdminPanel } from './AdminPanel'

const user = {
  id: 'admin-user',
  username: 'admin',
  displayName: '系统管理员',
  mustChangePassword: false,
  roles: ['admin'],
  permissions: ['banks.write', 'banks.delete'],
} satisfies SessionUser

const archivedBank = {
  id: 'frontend-engineering',
  title: '前端工程化、浏览器与 TypeScript',
  shortTitle: '前端工程',
  kicker: 'QUESTION BANK',
  category: '前端工程',
  description: '前端工程题库',
  baseTags: [],
  tone: 'blue',
  visibility: 'public',
  version: 3,
  archivedAt: '2026-07-18T18:30:00.000Z',
} satisfies QuestionBankDefinition

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('AdminPanel bank restore flow', () => {
  it('renders the catalog already loaded by the app while the admin refresh stays pending', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => undefined)))

    render(<AdminPanel
      user={user}
      initialCatalog={{ banks: [archivedBank], sections: [] }}
      onExit={vi.fn()}
      onCatalogChanged={vi.fn().mockResolvedValue(undefined)}
    />)

    expect(screen.getByRole('tab', { name: /前端工程.*已归档/ })).toBeTruthy()
    expect(screen.getByText('前端工程化、浏览器与 TypeScript')).toBeTruthy()
    expect(screen.queryByText('正在加载题库目录')).toBeNull()
  })

  it('shows a loading state instead of a false empty catalog and retries one transient failure', async () => {
    let catalogCalls = 0
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url !== '/api/admin/catalog') return Promise.reject(new Error(`Unexpected request: ${url}`))
      catalogCalls += 1
      if (catalogCalls === 1) return Promise.resolve(jsonResponse({ error: '服务正在重载。' }, 503))
      return Promise.resolve(jsonResponse({ banks: [archivedBank], sections: [] }))
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<AdminPanel user={user} onExit={vi.fn()} onCatalogChanged={vi.fn().mockResolvedValue(undefined)} />)

    expect(screen.getByRole('status').textContent).toContain('正在加载题库目录')
    expect(screen.queryByText('选择题库')).toBeNull()
    expect(await screen.findByRole('tab', { name: /前端工程.*已归档/ })).toBeTruthy()
    expect(catalogCalls).toBe(2)
  })

  it('updates the archived state and confirms success before the catalog refresh completes', async () => {
    let catalogCalls = 0
    let finishRefresh!: (response: Response) => void
    const pendingRefresh = new Promise<Response>((resolve) => { finishRefresh = resolve })
    const fetchMock = vi.fn((input: RequestInfo | URL, options?: RequestInit) => {
      const url = String(input)
      if (url === '/api/admin/catalog') {
        catalogCalls += 1
        return catalogCalls === 1
          ? Promise.resolve(jsonResponse({ banks: [archivedBank], sections: [] }))
          : pendingRefresh
      }
      if (url === '/api/banks/frontend-engineering/restore' && options?.method === 'POST') {
        return Promise.resolve(jsonResponse({ ok: true }))
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`))
    })
    vi.stubGlobal('fetch', fetchMock)
    const onCatalogChanged = vi.fn().mockResolvedValue(undefined)

    render(<AdminPanel user={user} onExit={vi.fn()} onCatalogChanged={onCatalogChanged} />)
    fireEvent.click(await screen.findByRole('button', { name: '恢复题库' }))

    expect(await screen.findByText('已恢复“前端工程”，学习用户现在可以再次看到该题库。')).toBeTruthy()
    expect((screen.getByRole('button', { name: '归档题库' }) as HTMLButtonElement).disabled).toBe(false)
    expect(screen.queryByText('已归档')).toBeNull()

    finishRefresh(jsonResponse({ banks: [{ ...archivedBank, archivedAt: undefined, version: 4 }], sections: [] }))
    await waitFor(() => expect(onCatalogChanged).toHaveBeenCalledOnce())
  })

  it('keeps restore available and shows the server error when the request fails', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, options?: RequestInit) => {
      const url = String(input)
      if (url === '/api/admin/catalog') return Promise.resolve(jsonResponse({ banks: [archivedBank], sections: [] }))
      if (url === '/api/banks/frontend-engineering/restore' && options?.method === 'POST') {
        return Promise.resolve(jsonResponse({ error: '恢复题库失败，请稍后重试。' }, 500))
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`))
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<AdminPanel user={user} onExit={vi.fn()} onCatalogChanged={vi.fn().mockResolvedValue(undefined)} />)
    fireEvent.click(await screen.findByRole('button', { name: '恢复题库' }))

    expect((await screen.findByRole('alert')).textContent).toContain('恢复题库失败，请稍后重试。')
    expect((screen.getByRole('button', { name: '恢复题库' }) as HTMLButtonElement).disabled).toBe(false)
    expect(screen.getByText('已归档')).toBeTruthy()
  })
})

describe('AdminPanel contact request inbox', () => {
  it('loads private contact details only after an authorized admin opens the inbox', async () => {
    const managingUser = { ...user, permissions: ['banks.write', 'banks.delete', 'users.manage'] } satisfies SessionUser
    const fetchMock = vi.fn((input: RequestInfo | URL, options?: RequestInit) => {
      const url = String(input)
      if (url === '/api/admin/catalog') return Promise.resolve(jsonResponse({ banks: [archivedBank], sections: [] }))
      if (url === '/api/users') return Promise.resolve(jsonResponse({ users: [] }))
      if (url === '/api/admin/contact-requests') return Promise.resolve(jsonResponse({ requests: [{
        id: 'request-1', kind: 'account', name: 'Linda', contact: 'linda@example.com',
        message: '正在准备前端面试，希望保存批注和复习计划。', status: 'new',
        createdAt: '2026-08-29T01:00:00.000Z', updatedAt: '2026-08-29T01:00:00.000Z',
      }] }))
      if (url === '/api/admin/contact-requests/request-1' && options?.method === 'PATCH') {
        return Promise.resolve(jsonResponse({ request: {
          id: 'request-1', kind: 'account', name: 'Linda', contact: 'linda@example.com',
          message: '正在准备前端面试，希望保存批注和复习计划。', status: 'reviewing',
          createdAt: '2026-08-29T01:00:00.000Z', updatedAt: '2026-08-29T01:05:00.000Z',
        } }))
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`))
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<AdminPanel user={managingUser} onExit={vi.fn()} onCatalogChanged={vi.fn().mockResolvedValue(undefined)} />)
    expect(fetchMock.mock.calls.some(([url]) => String(url) === '/api/admin/contact-requests')).toBe(false)
    const contentTab = screen.getByRole('tab', { name: '题库内容' })
    contentTab.focus()
    fireEvent.keyDown(contentTab, { key: 'ArrowRight' })

    expect(await screen.findByText('linda@example.com')).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: /反馈申请/ }))
    expect(screen.getByText('正在准备前端面试，希望保存批注和复习计划。')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Linda 的处理状态'), { target: { value: 'reviewing' } })
    expect(await screen.findByText('处理状态已更新。')).toBeTruthy()
  })
})
