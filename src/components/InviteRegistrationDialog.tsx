import { BadgeCheck, CircleAlert, KeyRound, LoaderCircle, UserPlus, X } from 'lucide-react'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { acceptInvitation, ApiError, inspectInvitation } from '../lib/api'
import type { SessionUser } from '../types'

type InvitePhase = 'loading' | 'ready' | 'invalid' | 'signed-in' | 'accepted'

function invitationError(reason: unknown): string {
  if (!(reason instanceof Error)) return '邀请信息读取失败，请稍后重试。'
  const detail = reason instanceof ApiError
    ? `${reason.message} ${String(reason.payload?.code ?? '')} ${String(reason.payload?.reason ?? '')}`.toLowerCase()
    : reason.message.toLowerCase()
  if (detail.includes('expired') || detail.includes('过期')) return '这个邀请已过期，请联系管理员生成新的邀请。'
  if (detail.includes('revoked') || detail.includes('撤销')) return '这个邀请已被撤销，请联系管理员确认。'
  if (detail.includes('used') || detail.includes('使用')) return '这个邀请已被使用，每个邀请只能注册一个账号。'
  if (reason instanceof ApiError && reason.status === 410) return '这个邀请已失效，可能已过期、已使用或已撤销。'
  return reason.message
}

export function InviteRegistrationDialog({ token, user, onDismiss, onAccepted }: {
  token: string
  user: SessionUser | null
  onDismiss: () => void
  onAccepted: () => Promise<void>
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [phase, setPhase] = useState<InvitePhase>('loading')
  const [expiresAt, setExpiresAt] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  useEffect(() => {
    let active = true
    if (user) {
      setPhase('signed-in')
      setError('')
      return () => { active = false }
    }
    setPhase('loading')
    setError('')
    inspectInvitation(token)
      .then((result) => {
        if (!active) return
        setExpiresAt(result.expiresAt)
        setPhase('ready')
      })
      .catch((reason) => {
        if (!active) return
        setError(invitationError(reason))
        setPhase('invalid')
      })
    return () => { active = false }
  }, [token, user])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致。')
      return
    }
    setBusy(true)
    setError('')
    try {
      await acceptInvitation(token, username.trim(), displayName.trim(), password)
      setPassword('')
      setConfirmPassword('')
      let refreshError = ''
      try {
        await onAccepted()
      } catch {
        refreshError = '账号已创建，但登录状态刷新失败。关闭窗口并刷新页面即可继续。'
      }
      setError(refreshError)
      setPhase('accepted')
    } catch (reason) {
      setError(invitationError(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <dialog
      className="auth-dialog invite-dialog"
      ref={dialogRef}
      aria-labelledby="invite-dialog-title"
      onCancel={(event) => { event.preventDefault(); if (!busy) onDismiss() }}
    >
      <header className="dialog-header">
        <div>
          <p>PRIVATE INVITATION</p>
          <h2 id="invite-dialog-title">接受学习邀请</h2>
        </div>
        <button className="icon-button" type="button" onClick={onDismiss} disabled={busy} aria-label="关闭邀请窗口"><X aria-hidden="true" /></button>
      </header>

      {phase === 'loading' && (
        <div className="invite-dialog__state" aria-busy="true" role="status">
          <LoaderCircle className="invite-dialog__spinner" aria-hidden="true" />
          <strong>正在验证邀请</strong>
          <p>请稍候，我们正在确认链接是否仍然有效。</p>
        </div>
      )}

      {phase === 'invalid' && (
        <div className="invite-dialog__state" role="alert">
          <CircleAlert aria-hidden="true" />
          <strong>无法使用这个邀请</strong>
          <p>{error}</p>
          <button className="primary-button" type="button" onClick={onDismiss}>返回题库</button>
        </div>
      )}

      {phase === 'signed-in' && (
        <div className="invite-dialog__state" role="alert">
          <CircleAlert aria-hidden="true" />
          <strong>请先退出当前账号</strong>
          <p>你目前以 @{user?.username} 登录。请先在“账号与同步”中退出，再重新打开原邀请链接，避免切换到错误的账号。</p>
          <button className="primary-button" type="button" onClick={onDismiss}>我知道了</button>
        </div>
      )}

      {phase === 'ready' && (
        <form className="auth-dialog__body" onSubmit={submit} aria-describedby="invite-expiry">
          <div className="auth-dialog__intro">
            <UserPlus aria-hidden="true" />
            <p><strong>创建你的学习账号</strong><span>此邀请只可使用一次，账号角色为 learner。</span></p>
          </div>
          <p className="invite-dialog__expiry" id="invite-expiry">有效期至 {new Date(expiresAt).toLocaleString()}</p>
          <label>用户名<input autoFocus autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} minLength={2} maxLength={64} pattern="[A-Za-z0-9._-]+" title="2–64 位，只能使用字母、数字、点、下划线或短横线" required /></label>
          <label>显示名称<input autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={80} required /></label>
          <label>密码<input type="password" autoComplete="new-password" minLength={12} maxLength={256} value={password} onChange={(event) => setPassword(event.target.value)} aria-describedby="invite-password-help" required /></label>
          <p className="invite-dialog__help" id="invite-password-help"><KeyRound aria-hidden="true" />至少 12 位，建议混合大小写、数字和符号。</p>
          <label>确认密码<input type="password" autoComplete="new-password" minLength={12} maxLength={256} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={busy}>{busy ? '正在创建账号…' : '接受邀请并注册'}</button>
        </form>
      )}

      {phase === 'accepted' && (
        <div className="invite-dialog__state" role="status">
          <BadgeCheck aria-hidden="true" />
          <strong>账号创建成功</strong>
          <p>{error || '你已经登录，学习进度会自动保存到自己的账号。'}</p>
          <button className="primary-button" type="button" onClick={onDismiss}>开始学习</button>
        </div>
      )}
    </dialog>
  )
}
