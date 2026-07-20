// @vitest-environment node

import crypto from 'node:crypto'

import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createApp } from './app.js'

const INITIAL_PASSWORD = 'TestPassword!123'
const ADMIN_PASSWORD = 'ChangedPassword!456'
const ALLOWED_ORIGIN = 'http://localhost:5173'

async function authenticatedAdmin(app) {
  const agent = request.agent(app)
  await agent.post('/api/auth/login').send({ username: 'admin', password: INITIAL_PASSWORD }).expect(200)
  await agent.post('/api/auth/change-password')
    .send({ currentPassword: INITIAL_PASSWORD, newPassword: ADMIN_PASSWORD }).expect(200)
  return agent
}

async function createInvite(agent, expiresInHours = 72) {
  return agent.post('/api/admin/invitations').send({ expiresInHours }).expect(201)
}

function registration(token, username = 'invited.user') {
  return { token, username, displayName: 'Invited User', password: 'InvitedPassword!123' }
}

describe('invitation registration API', () => {
  let app
  let db

  beforeEach(() => {
    const created = createApp({
      serveStatic: false,
      secureCookies: false,
      databaseOptions: {
        filename: ':memory:',
        bootstrap: { username: 'admin', password: INITIAL_PASSWORD, skipCredentialFile: true },
      },
    })
    app = created.app
    db = created.database.db
  })

  afterEach(() => db.close())

  it('applies migration v3 and only reveals a hashed invitation token once', async () => {
    expect(db.prepare('SELECT version FROM schema_migrations WHERE version = 3').get()).toEqual({ version: 3 })
    expect(db.pragma('table_info(invitations)').map((column) => column.name)).toEqual([
      'id', 'token_hash', 'created_by_user_id', 'expires_at', 'created_at',
      'used_at', 'used_by_user_id', 'revoked_at',
    ])
    await request(app).get('/api/admin/invitations').expect(401)

    const admin = await authenticatedAdmin(app)
    await admin.post('/api/admin/invitations').send({ expiresInHours: 0 }).expect(400)
    await admin.post('/api/admin/invitations').send({ expiresInHours: 24, role: 'admin' }).expect(400)
    const forbiddenOrigin = await admin.post('/api/admin/invitations').set('Origin', 'https://evil.example')
      .send({ expiresInHours: 24 }).expect(403)
    expect(forbiddenOrigin.headers['cache-control']).toBe('no-store')

    const created = await createInvite(admin, 24)
    expect(created.headers['cache-control']).toBe('no-store')
    expect(created.body.invitation).toMatchObject({ status: 'pending' })
    expect(created.body.token).toMatch(/^[A-Za-z0-9_-]{43}$/)

    const stored = db.prepare('SELECT * FROM invitations WHERE id = ?').get(created.body.invitation.id)
    const expectedHash = crypto.createHash('sha256').update(created.body.token).digest('hex')
    expect(stored.token_hash).toBe(expectedHash)
    expect(JSON.stringify(stored)).not.toContain(created.body.token)

    const listed = await admin.get('/api/admin/invitations').expect(200)
    expect(listed.headers['cache-control']).toBe('no-store')
    expect(listed.body).toEqual({ invitations: [created.body.invitation] })
    expect(JSON.stringify(listed.body)).not.toContain(created.body.token)
    expect(JSON.stringify(listed.body)).not.toContain(expectedHash)

    const auditResponse = await admin.get('/api/audit').expect(200)
    expect(JSON.stringify(auditResponse.body)).not.toContain(created.body.token)
    expect(JSON.stringify(auditResponse.body)).not.toContain(expectedHash)

    const audits = db.prepare("SELECT metadata_json FROM audit_logs WHERE action LIKE 'invitation.%'").all()
    expect(JSON.stringify(audits)).not.toContain(created.body.token)
    expect(JSON.stringify(audits)).not.toContain(expectedHash)
  }, 20_000)

  it('accepts an invitation into a learner session and never requires a temporary password', async () => {
    const admin = await authenticatedAdmin(app)
    const created = await createInvite(admin)
    const payload = registration(created.body.token)

    await admin.post('/api/invitations/accept').send(payload).expect(409)
    expect(db.prepare('SELECT used_at FROM invitations WHERE id = ?').get(created.body.invitation.id).used_at).toBeNull()

    await request(app).post('/api/invitations/inspect').set('Origin', 'https://evil.example')
      .send({ token: created.body.token }).expect(403)
    await request(app).post('/api/invitations/accept').send({
      ...payload, role: 'admin', permissions: ['users.manage'], status: 'active', id: crypto.randomUUID(),
    }).expect(400)
    expect(db.prepare('SELECT used_at FROM invitations WHERE id = ?').get(created.body.invitation.id).used_at).toBeNull()
    await request(app).post('/api/invitations/accept').send({ ...payload, password: 'too-short' }).expect(400)
    await admin.post('/api/auth/logout').expect(200)

    const inspected = await request(app).post('/api/invitations/inspect')
      .send({ token: created.body.token }).expect(200)
    expect(inspected.headers['cache-control']).toBe('no-store')
    expect(inspected.body).toEqual({ valid: true, expiresAt: created.body.invitation.expiresAt })
    await request(app).get(`/api/invitations/${created.body.token}`).expect(404)

    const invited = request.agent(app)
    const accepted = await invited.post('/api/invitations/accept').set('Origin', ALLOWED_ORIGIN)
      .send(payload).expect(201)
    expect(accepted.headers['cache-control']).toBe('no-store')
    expect(accepted.headers['set-cookie'][0]).toContain('im_session=')
    expect(accepted.headers['set-cookie'][0]).toContain('HttpOnly')
    expect(accepted.body).toMatchObject({
      ok: true,
      user: {
        username: payload.username,
        displayName: payload.displayName,
        mustChangePassword: false,
        roles: ['learner'],
        permissions: ['banks.read', 'study.write'],
      },
    })
    const session = await invited.get('/api/auth/session').expect(200)
    expect(session.body.user).toEqual(accepted.body.user)
    expect(db.prepare('SELECT must_change_password FROM users WHERE username = ?').get(payload.username))
      .toEqual({ must_change_password: 0 })
    const invitedUser = db.prepare('SELECT id FROM users WHERE username = ?').get(payload.username)
    expect(db.prepare('SELECT role_id FROM user_roles WHERE user_id = ?').get(invitedUser.id)).toEqual({ role_id: 'learner' })
    expect(JSON.parse(db.prepare('SELECT data_json FROM settings WHERE user_id = ?').get(invitedUser.id).data_json))
      .toMatchObject({ theme: 'light', pageLayout: 'spread' })

    const unavailable = await request(app).post('/api/invitations/inspect')
      .send({ token: created.body.token }).expect(410)
    expect(unavailable.body).toEqual({ error: '邀请无效或已失效。' })
    await request(app).post('/api/invitations/accept').send(registration(created.body.token, 'other.user')).expect(410)

    const reloggedAdmin = request.agent(app)
    await reloggedAdmin.post('/api/auth/login').send({ username: 'admin', password: ADMIN_PASSWORD }).expect(200)
    const listed = await reloggedAdmin.get('/api/admin/invitations').expect(200)
    expect(listed.body.invitations[0]).toMatchObject({
      id: created.body.invitation.id,
      status: 'used',
      usedByUsername: payload.username,
    })
    await reloggedAdmin.post(`/api/admin/invitations/${created.body.invitation.id}/revoke`).expect(409)

    const invitationAudits = db.prepare("SELECT metadata_json FROM audit_logs WHERE action LIKE 'invitation.%'").all()
    const serializedAudits = JSON.stringify(invitationAudits)
    expect(serializedAudits).not.toContain(created.body.token)
    expect(serializedAudits).not.toContain(payload.password)
  }, 30_000)

  it('uses one generic response for revoked and expired invitations', async () => {
    const admin = await authenticatedAdmin(app)
    const revoked = await createInvite(admin)
    const expired = await createInvite(admin)
    await admin.post(`/api/admin/invitations/${revoked.body.invitation.id}/revoke`).expect(200)
    await admin.post(`/api/admin/invitations/${revoked.body.invitation.id}/revoke`).expect(200)
    db.prepare('UPDATE invitations SET expires_at = ? WHERE id = ?')
      .run('2000-01-01T00:00:00.000Z', expired.body.invitation.id)
    await admin.post('/api/auth/logout').expect(200)

    const expected = { error: '邀请无效或已失效。' }
    const unknown = crypto.randomBytes(32).toString('base64url')
    for (const token of [unknown, revoked.body.token, expired.body.token]) {
      const inspected = await request(app).post('/api/invitations/inspect').send({ token }).expect(410)
      expect(inspected.body).toEqual(expected)
      const accepted = await request(app).post('/api/invitations/accept')
        .send(registration(token, `user-${token.slice(0, 6)}`)).expect(410)
      expect(accepted.body).toEqual(expected)
    }

    const reloggedAdmin = request.agent(app)
    await reloggedAdmin.post('/api/auth/login').send({ username: 'admin', password: ADMIN_PASSWORD }).expect(200)
    const listed = await reloggedAdmin.get('/api/admin/invitations').expect(200)
    const statuses = Object.fromEntries(listed.body.invitations.map((item) => [item.id, item.status]))
    expect(statuses[revoked.body.invitation.id]).toBe('revoked')
    expect(statuses[expired.body.invitation.id]).toBe('expired')
  }, 20_000)

  it('does not consume on username conflict and atomically accepts a token only once', async () => {
    const admin = await authenticatedAdmin(app)
    await admin.post('/api/users').send({ username: 'taken.user', displayName: 'Taken', role: 'learner' }).expect(201)
    const retryable = await createInvite(admin)
    const raced = await createInvite(admin)
    await admin.post('/api/auth/logout').expect(200)

    await request(app).post('/api/invitations/accept')
      .send(registration(retryable.body.token, 'taken.user')).expect(409)
    expect(db.prepare('SELECT used_at FROM invitations WHERE id = ?').get(retryable.body.invitation.id).used_at).toBeNull()
    await request(app).post('/api/invitations/accept')
      .send(registration(retryable.body.token, 'available.user')).expect(201)

    const responses = await Promise.all([
      request(app).post('/api/invitations/accept').send(registration(raced.body.token, 'racer.one')),
      request(app).post('/api/invitations/accept').send(registration(raced.body.token, 'racer.two')),
    ])
    expect(responses.map((response) => response.status).sort()).toEqual([201, 410])
    expect(db.prepare("SELECT COUNT(*) AS count FROM users WHERE username IN ('racer.one', 'racer.two')").get().count).toBe(1)
    expect(db.prepare(`
      SELECT COUNT(*) AS count FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE u.username IN ('racer.one', 'racer.two')
    `).get().count).toBe(1)
    const consumed = db.prepare('SELECT used_at, used_by_user_id FROM invitations WHERE id = ?').get(raced.body.invitation.id)
    expect(consumed.used_at).toBeTruthy()
    expect(consumed.used_by_user_id).toBeTruthy()
  }, 30_000)

  it('rate limits public inspection and acceptance independently by IP', async () => {
    let last
    for (let index = 0; index < 21; index += 1) {
      last = await request(app).post('/api/invitations/inspect')
        .send({ token: crypto.randomBytes(32).toString('base64url') })
    }
    expect(last.status).toBe(429)
    expect(last.body).toEqual({ error: '邀请检查请求过于频繁，请稍后再试。' })

    for (let index = 0; index < 6; index += 1) {
      last = await request(app).post('/api/invitations/accept')
        .send(registration(crypto.randomBytes(32).toString('base64url'), `limited-${index}`))
    }
    expect(last.status).toBe(429)
    expect(last.body).toEqual({ error: '邀请注册尝试过于频繁，请稍后再试。' })
  }, 20_000)
})
