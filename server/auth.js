import crypto from 'node:crypto'

import { verifySync } from '@node-rs/argon2'

export const COOKIE_NAME = 'im_session'
const SESSION_DAYS = 30

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function createSession(db, userId) {
  const token = crypto.randomBytes(32).toString('base64url')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 86_400_000)
  db.prepare(`
    INSERT INTO sessions(token_hash, user_id, expires_at, created_at, last_seen_at)
    VALUES(?, ?, ?, ?, ?)
  `).run(hashToken(token), userId, expiresAt.toISOString(), now.toISOString(), now.toISOString())
  return { token, expiresAt }
}

export function revokeSession(db, token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token))
}

export function revokeUserSessions(db, userId) {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId)
}

export function verifyPassword(hash, password) {
  try {
    return verifySync(hash, password)
  } catch {
    return false
  }
}

export function sessionMiddleware(db) {
  const query = db.prepare(`
    SELECT u.id, u.username, u.display_name, u.must_change_password, u.status,
           s.expires_at, GROUP_CONCAT(DISTINCT ur.role_id) AS roles,
           GROUP_CONCAT(DISTINCT rp.permission_id) AS permissions
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN role_permissions rp ON rp.role_id = ur.role_id
    WHERE s.token_hash = ?
    GROUP BY u.id, s.token_hash
  `)
  const touch = db.prepare('UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?')
  const remove = db.prepare('DELETE FROM sessions WHERE token_hash = ?')
  return (req, _res, next) => {
    const token = req.cookies?.[COOKIE_NAME]
    if (!token) return next()
    const tokenHash = hashToken(token)
    const row = query.get(tokenHash)
    if (!row || row.status !== 'active' || new Date(row.expires_at) <= new Date()) {
      remove.run(tokenHash)
      return next()
    }
    req.user = {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      mustChangePassword: Boolean(row.must_change_password),
      roles: row.roles?.split(',').filter(Boolean) ?? [],
      permissions: row.permissions?.split(',').filter(Boolean) ?? [],
    }
    touch.run(new Date().toISOString(), tokenHash)
    return next()
  }
}

export function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: '请先登录。' })
  return next()
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: '请先登录。' })
    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({ error: '当前账号没有执行此操作的权限。' })
    }
    return next()
  }
}

export function setSessionCookie(res, token, expiresAt, secure = true) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  })
}

export function clearSessionCookie(res, secure = true) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, secure, sameSite: 'lax', path: '/' })
}
