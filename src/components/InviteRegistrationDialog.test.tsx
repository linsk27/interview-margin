import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { InviteRegistrationDialog } from './InviteRegistrationDialog'
import type { SessionUser } from '../types'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() { this.open = true }
})

const learner = {
  id: 'user-2', username: 'new.learner', displayName: '新同学', mustChangePassword: false,
  roles: ['learner'], permissions: [],
} satisfies SessionUser

describe('invitation registration dialog', () => {
  beforeEach(() => vi.unstubAllGlobals())

  it('keeps the token out of request URLs and accepts a valid invitation', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ valid: true, expiresAt: '2026-07-20T00:00:00.000Z' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, user: learner }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }))
    vi.stubGlobal('fetch', fetchMock)
    const onAccepted = vi.fn().mockResolvedValue(undefined)

    render(<InviteRegistrationDialog token="top-secret-token" user={null} onDismiss={vi.fn()} onAccepted={onAccepted} />)
    await screen.findByText('创建你的学习账号')

    expect(fetchMock.mock.calls[0][0]).toBe('/api/invitations/inspect')
    expect(fetchMock.mock.calls[0][0]).not.toContain('top-secret-token')
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ token: 'top-secret-token' })

    fireEvent.change(screen.getByLabelText('用户名'), { target: { value: 'new.learner' } })
    fireEvent.change(screen.getByLabelText('显示名称'), { target: { value: '新同学' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: '123456' } })
    fireEvent.change(screen.getByLabelText('确认密码'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: '接受邀请并注册' }))

    await waitFor(() => expect(onAccepted).toHaveBeenCalledOnce())
    expect(fetchMock.mock.calls[1][0]).toBe('/api/invitations/accept')
    expect(fetchMock.mock.calls[1][0]).not.toContain('top-secret-token')
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      token: 'top-secret-token', username: 'new.learner', displayName: '新同学', password: '123456',
    })
    expect(await screen.findByText('账号创建成功')).toBeTruthy()
  })

  it('does not inspect or accept an invitation while another account is signed in', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<InviteRegistrationDialog token="unused-token" user={learner} onDismiss={vi.fn()} onAccepted={vi.fn()} />)

    expect(await screen.findByText('请先退出当前账号')).toBeTruthy()
    expect(screen.getByText(/@new\.learner/)).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: '接受邀请并注册' })).toBeNull()
  })

  it('explains an expired invitation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: '邀请无效或已失效。' }), {
      status: 410, headers: { 'Content-Type': 'application/json' },
    })))

    render(<InviteRegistrationDialog token="expired-token" user={null} onDismiss={vi.fn()} onAccepted={vi.fn()} />)

    expect(await screen.findByText('这个邀请已失效，可能已过期、已使用或已撤销。')).toBeTruthy()
  })
})
