import { KeyRound, LogIn, LogOut, ShieldCheck, UserRound, X } from 'lucide-react'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { changePassword, login, logout } from '../lib/api'
import type { SessionUser } from '../types'

export function AuthDialog({ open, user, onClose, onSessionChanged }: {
  open: boolean
  user: SessionUser | null
  onClose: () => void
  onSessionChanged: () => Promise<void>
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changing, setChanging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const forceChange = Boolean(user?.mustChangePassword)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if ((open || forceChange) && !dialog.open) dialog.showModal()
    if (!open && !forceChange && dialog.open) dialog.close()
  }, [forceChange, open])

  useEffect(() => {
    if (forceChange) setChanging(true)
  }, [forceChange])

  const close = () => {
    if (forceChange) return
    setError('')
    setPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setChanging(false)
    onClose()
  }

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(username, password)
      setPassword('')
      await onSessionChanged()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '登录失败。')
    } finally {
      setBusy(false)
    }
  }

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致。')
      return
    }
    setBusy(true)
    setError('')
    try {
      await changePassword(password, newPassword)
      setPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setChanging(false)
      await onSessionChanged()
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '密码修改失败。')
    } finally {
      setBusy(false)
    }
  }

  const signOut = async () => {
    setBusy(true)
    try {
      await logout()
      await onSessionChanged()
      close()
    } finally {
      setBusy(false)
    }
  }

  return (
    <dialog className="auth-dialog" ref={dialogRef} onCancel={(event) => { if (forceChange) event.preventDefault(); else close() }} onClose={close}>
      <header className="dialog-header">
        <div>
          <p>ACCOUNT &amp; SYNC</p>
          <h2>{!user ? '登录学习账号' : changing ? '修改登录密码' : '账号与同步'}</h2>
        </div>
        {!forceChange && <button className="icon-button" type="button" onClick={close} aria-label="关闭"><X aria-hidden="true" /></button>}
      </header>

      {!user ? (
        <form className="auth-dialog__body" onSubmit={submitLogin}>
          <div className="auth-dialog__intro"><LogIn aria-hidden="true" /><p><strong>跨设备保存学习记录</strong><span>账号由管理员创建，不开放公共注册。</span></p></div>
          <label>用户名<input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required /></label>
          <label>密码<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={busy}>{busy ? '正在登录…' : '登录'}</button>
        </form>
      ) : changing ? (
        <form className="auth-dialog__body" onSubmit={submitPassword}>
          <div className="auth-dialog__intro"><KeyRound aria-hidden="true" /><p><strong>{forceChange ? '首次登录需要修改一次性密码' : '更新账号密码'}</strong><span>新密码至少 12 位，建议混合大小写、数字和符号。</span></p></div>
          <label>当前密码<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          <label>新密码<input type="password" autoComplete="new-password" minLength={12} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label>
          <label>确认新密码<input type="password" autoComplete="new-password" minLength={12} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions">
            {!forceChange && <button type="button" onClick={() => setChanging(false)}>返回</button>}
            <button className="primary-button" type="submit" disabled={busy}>{busy ? '正在保存…' : '保存新密码'}</button>
          </div>
        </form>
      ) : (
        <div className="auth-dialog__body">
          <div className="account-card">
            <span><UserRound aria-hidden="true" /></span>
            <div><strong>{user.displayName}</strong><p>@{user.username}</p></div>
            <em><ShieldCheck aria-hidden="true" />{user.roles.join(' / ')}</em>
          </div>
          <p className="account-sync-copy">进度、批注、复习计划与阅读设置已由本机 SQLite 保存并支持跨设备恢复。</p>
          <div className="form-actions">
            <button type="button" onClick={() => setChanging(true)}><KeyRound aria-hidden="true" />修改密码</button>
            <button type="button" onClick={signOut} disabled={busy}><LogOut aria-hidden="true" />退出登录</button>
          </div>
        </div>
      )}
    </dialog>
  )
}
