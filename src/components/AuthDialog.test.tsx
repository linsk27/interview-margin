import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthDialog } from './AuthDialog'
import type { SessionUser } from '../types'

const apiMocks = vi.hoisted(() => ({
  changePassword: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}))

vi.mock('../lib/api', () => apiMocks)

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() { this.open = true }
  HTMLDialogElement.prototype.close = function close() { this.open = false }
})

const firstLoginUser = {
  id: 'user-1', username: 'learner.one', displayName: '学习者一号', mustChangePassword: true,
  roles: ['learner'], permissions: [],
} satisfies SessionUser

describe('account password dialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMocks.changePassword.mockResolvedValue({ ok: true })
  })

  it('allows the six-character password 123456 on first login', async () => {
    const onClose = vi.fn()
    const onSessionChanged = vi.fn().mockResolvedValue(undefined)
    render(<AuthDialog open user={firstLoginUser} onClose={onClose} onSessionChanged={onSessionChanged} />)

    await screen.findByText('新密码至少 6 位。')
    const currentPassword = screen.getByLabelText('当前密码')
    const newPassword = screen.getByLabelText('新密码') as HTMLInputElement
    const confirmPassword = screen.getByLabelText('确认新密码') as HTMLInputElement
    expect(newPassword.minLength).toBe(6)
    expect(confirmPassword.minLength).toBe(6)

    fireEvent.change(currentPassword, { target: { value: '123123' } })
    fireEvent.change(newPassword, { target: { value: '123456' } })
    fireEvent.change(confirmPassword, { target: { value: '123456' } })
    fireEvent.submit(screen.getByRole('button', { name: '保存新密码' }).closest('form')!)

    await waitFor(() => expect(apiMocks.changePassword).toHaveBeenCalledWith('123123', '123456'))
    expect(onSessionChanged).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })
})
