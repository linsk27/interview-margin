import crypto from 'node:crypto'

import { createSession } from './auth.js'
import { defaultSettings, passwordHash } from './database.js'
import { audit } from './repository.js'

const invitationByHash = `
  SELECT id, expires_at, used_at, revoked_at
  FROM invitations
  WHERE token_hash = ?
`

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function statusOf(row, now = new Date()) {
  if (row.used_at) return 'used'
  if (row.revoked_at) return 'revoked'
  if (new Date(row.expires_at) <= now) return 'expired'
  return 'pending'
}

function publicInvitation(row, now = new Date()) {
  const invitation = {
    id: row.id,
    status: statusOf(row, now),
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }
  if (row.used_at) invitation.usedAt = row.used_at
  if (row.revoked_at) invitation.revokedAt = row.revoked_at
  if (row.used_by_username) invitation.usedByUsername = row.used_by_username
  return invitation
}

export function createInvitation(db, creatorUserId, expiresInHours) {
  const token = crypto.randomBytes(32).toString('base64url')
  const now = new Date()
  const row = {
    id: crypto.randomUUID(),
    expires_at: new Date(now.getTime() + expiresInHours * 3_600_000).toISOString(),
    created_at: now.toISOString(),
  }
  db.prepare(`
    INSERT INTO invitations(id, token_hash, created_by_user_id, expires_at, created_at)
    VALUES(?, ?, ?, ?, ?)
  `).run(row.id, hashToken(token), creatorUserId, row.expires_at, row.created_at)
  return { invitation: publicInvitation(row, now), token }
}

export function listInvitations(db) {
  const now = new Date()
  return db.prepare(`
    SELECT i.id, i.expires_at, i.created_at, i.used_at, i.revoked_at,
           u.username AS used_by_username
    FROM invitations i
    LEFT JOIN users u ON u.id = i.used_by_user_id
    ORDER BY i.created_at DESC
  `).all().map((row) => publicInvitation(row, now))
}

export function inspectInvitation(db, token) {
  const row = db.prepare(invitationByHash).get(hashToken(token))
  if (!row || statusOf(row) !== 'pending') return undefined
  return { valid: true, expiresAt: row.expires_at }
}

export function revokeInvitation(db, invitationId, req) {
  const now = new Date().toISOString()
  const revoke = db.transaction(() => {
    const current = db.prepare('SELECT id, used_at, revoked_at FROM invitations WHERE id = ?').get(invitationId)
    if (!current) return { status: 'missing' }
    if (current.used_at) return { status: 'used' }
    if (current.revoked_at) return { status: 'ok' }
    const result = db.prepare(`
      UPDATE invitations SET revoked_at = ?
      WHERE id = ? AND used_at IS NULL AND revoked_at IS NULL
    `).run(now, invitationId)
    if (!result.changes) return { status: 'unavailable' }
    audit(db, req, 'invitation.revoke', 'invitation', invitationId)
    return { status: 'ok' }
  })
  try {
    return revoke.immediate()
  } catch (error) {
    if (error.code === 'SQLITE_BUSY') return { status: 'unavailable' }
    throw error
  }
}

export function acceptInvitation(db, data, req) {
  const tokenHash = hashToken(data.token)
  const preflight = db.prepare(invitationByHash).get(tokenHash)
  if (!preflight || statusOf(preflight) !== 'pending') {
    audit(db, { ip: req.ip }, 'invitation.accept-rejected', 'invitation', preflight?.id, { reason: 'unavailable' })
    return { status: 'unavailable' }
  }

  // Argon2 is intentionally computed before opening the write transaction.
  const encodedPassword = passwordHash(data.password)
  const userId = crypto.randomUUID()

  try {
    const accept = db.transaction(() => {
      const now = new Date().toISOString()
      const invitation = db.prepare(`
        SELECT id FROM invitations
        WHERE token_hash = ? AND used_at IS NULL AND revoked_at IS NULL AND expires_at > ?
      `).get(tokenHash, now)
      if (!invitation) return { status: 'unavailable' }
      if (db.prepare('SELECT 1 FROM users WHERE username = ? COLLATE NOCASE').get(data.username)) {
        audit(db, { ip: req.ip }, 'invitation.accept-rejected', 'invitation', invitation.id, {
          reason: 'username-conflict', username: data.username,
        })
        return { status: 'username-conflict' }
      }

      db.prepare(`
        INSERT INTO users(id, username, display_name, password_hash, must_change_password, created_at, updated_at)
        VALUES(?, ?, ?, ?, 0, ?, ?)
      `).run(userId, data.username, data.displayName, encodedPassword, now, now)
      db.prepare('INSERT INTO user_roles(user_id, role_id) VALUES(?, ?)').run(userId, 'learner')
      db.prepare('INSERT INTO settings(user_id, data_json, updated_at) VALUES(?, ?, ?)')
        .run(userId, JSON.stringify(defaultSettings()), now)
      const consumed = db.prepare(`
        UPDATE invitations SET used_at = ?, used_by_user_id = ?
        WHERE id = ? AND used_at IS NULL AND revoked_at IS NULL AND expires_at > ?
      `).run(now, userId, invitation.id, now)
      if (!consumed.changes) {
        const error = new Error('Invitation became unavailable')
        error.code = 'INVITATION_UNAVAILABLE'
        throw error
      }
      const session = createSession(db, userId)
      audit(db, { user: { id: userId }, ip: req.ip }, 'invitation.accept', 'invitation', invitation.id, {
        username: data.username,
      })
      return {
        status: 'ok',
        session,
        user: {
          id: userId,
          username: data.username,
          displayName: data.displayName,
          mustChangePassword: false,
          roles: ['learner'],
          permissions: ['banks.read', 'study.write'],
        },
      }
    })
    // Claim the database write lock before re-checking the invitation so overlapping
    // Node processes serialize here instead of both trying to upgrade deferred reads.
    return accept.immediate()
  } catch (error) {
    if (error.code === 'INVITATION_UNAVAILABLE') return { status: 'unavailable' }
    if (error.code === 'SQLITE_BUSY') return { status: 'unavailable' }
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return { status: 'username-conflict' }
    throw error
  }
}
