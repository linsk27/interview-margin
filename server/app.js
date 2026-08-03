import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import compression from 'compression'
import cookieParser from 'cookie-parser'
import express from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

import aiChatHandler from '../api/ai-chat.js'
import {
  clearSessionCookie, COOKIE_NAME, createSession, requirePermission, requireUser,
  revokeSession, revokeUserSessions, sessionMiddleware, setSessionCookie, verifyPassword,
} from './auth.js'
import { backupDatabase, listBackups, resolveBackup } from './backup-service.js'
import { parseQuestionMarkdown, renderBankMarkdown } from './content/markdown.js'
import { inspectMarkdownDiagrams } from './content/diagram-policy.js'
import { createDatabase, passwordHash, randomPassword } from './database.js'
import {
  acceptInvitation, createInvitation, inspectInvitation, listInvitations, revokeInvitation,
} from './invitations.js'
import {
  audit, createQuestion, getStudyState, listCatalog, mergeStudyState,
  saveStudyState, updateQuestion,
} from './repository.js'
import {
  bankCreateSchema, bankPatchSchema, loginSchema, parseBody, passwordSchema,
  invitationAcceptSchema, invitationCreateSchema, invitationInspectSchema,
  questionCreateSchema, questionPatchSchema, studyStateSchema, userCreateSchema, userPatchSchema,
} from './validation.js'

// A missing username must still pay the same Argon2 verification cost as an existing account.
const DUMMY_LOGIN_HASH = passwordHash(crypto.randomBytes(32).toString('base64url'))

function publicUser(user) {
  if (!user) return null
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    mustChangePassword: user.mustChangePassword,
    roles: user.roles,
    permissions: user.permissions,
  }
}

function originGuard(allowedOrigins) {
  return (req, res, next) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next()
    const origin = req.get('origin')
    if (!origin) return next()
    const ownOrigin = `${req.protocol}://${req.get('host')}`
    if (origin === ownOrigin || allowedOrigins.has(origin)) return next()
    return res.status(403).json({ error: '请求来源未被允许。' })
  }
}

function noStore(_req, res, next) {
  res.setHeader('Cache-Control', 'no-store')
  return next()
}

function requireExpectedUser(req, res, next) {
  const expectedUserId = req.get('x-expected-user-id')
  if (!expectedUserId || expectedUserId !== req.user?.id) {
    return res.status(409).json({
      error: '当前登录账号已发生变化，请刷新后重试。',
      code: 'USER_SESSION_CHANGED',
    })
  }
  return next()
}

function createLoginGuard() {
  const attempts = new Map()
  const windowMs = 15 * 60_000
  return {
    check(req, res, next) {
      const keys = [`ip:${req.ip}`, `account:${req.validatedBody.username.toLowerCase()}`]
      const now = Date.now()
      for (const key of keys) {
        const record = attempts.get(key)
        if (record && now - record.startedAt < windowMs && record.count >= 5) {
          return res.status(429).json({ error: '登录失败次数过多，请 15 分钟后再试。' })
        }
      }
      req.loginAttemptKeys = keys
      return next()
    },
    fail(req) {
      const now = Date.now()
      for (const key of req.loginAttemptKeys ?? []) {
        const current = attempts.get(key)
        if (!current || now - current.startedAt >= windowMs) attempts.set(key, { count: 1, startedAt: now })
        else current.count += 1
      }
    },
    succeed(req) {
      for (const key of req.loginAttemptKeys ?? []) attempts.delete(key)
    },
  }
}

function listUsers(db) {
  return db.prepare(`
    SELECT u.id, u.username, u.display_name, u.must_change_password, u.status,
      u.created_at, u.updated_at, GROUP_CONCAT(ur.role_id) AS roles
    FROM users u LEFT JOIN user_roles ur ON ur.user_id = u.id
    GROUP BY u.id ORDER BY u.created_at
  `).all().map((row) => ({
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    mustChangePassword: Boolean(row.must_change_password),
    status: row.status,
    roles: row.roles?.split(',').filter(Boolean) ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

function currentQuestion(db, questionId) {
  return db.prepare('SELECT id, version, bank_id, archived_at FROM questions WHERE id = ?').get(questionId)
}

export function createApp(options = {}) {
  const rootDir = options.rootDir ?? path.resolve(process.cwd())
  const distDir = options.distDir ?? path.join(rootDir, 'dist')
  const backupDir = options.backupDir ?? path.join(rootDir, 'backups')
  const database = options.database ?? createDatabase({ rootDir, ...options.databaseOptions })
  const { db } = database
  const app = express()
  const loginGuard = createLoginGuard()
  const invitationInspectLimit = rateLimit({
    windowMs: 15 * 60_000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: '邀请检查请求过于频繁，请稍后再试。' },
  })
  const invitationAcceptLimit = rateLimit({
    windowMs: 60 * 60_000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: '邀请注册尝试过于频繁，请稍后再试。' },
  })
  const allowedOrigins = new Set((process.env.APP_ORIGINS ?? 'https://interview.linsk27.dpdns.org,http://127.0.0.1:4173,http://localhost:5173')
    .split(',').map((item) => item.trim()).filter(Boolean))

  app.locals.db = db
  app.locals.database = database
  app.set('trust proxy', 1)
  app.disable('x-powered-by')
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }))
  app.use(compression())
  app.use((req, res, next) => req.path.startsWith('/api/') ? noStore(req, res, next) : next())
  app.use(express.json({ limit: '2mb' }))
  app.use(express.text({ type: ['text/markdown'], limit: '4mb' }))
  app.use(cookieParser())
  app.use(sessionMiddleware(db))
  app.use(originGuard(allowedOrigins))
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api/')) return next()
    if (!req.user?.mustChangePassword) return next()
    const allowed = new Set([
      '/api/auth/session', '/api/auth/change-password', '/api/auth/logout', '/api/health', '/api/catalog',
      '/api/invitations/inspect', '/api/invitations/accept',
    ])
    if (allowed.has(req.path)) return next()
    return res.status(428).json({ error: '首次登录必须先修改一次性密码。', code: 'PASSWORD_CHANGE_REQUIRED' })
  })

  app.get('/api/health', (_req, res) => {
    const counts = db.prepare(`SELECT
      (SELECT COUNT(*) FROM question_banks WHERE archived_at IS NULL) AS banks,
      (SELECT COUNT(*) FROM questions WHERE archived_at IS NULL) AS questions`).get()
    res.json({ ok: true, service: 'interview-margin', storage: 'sqlite', ...counts, time: new Date().toISOString() })
  })

  app.get('/api/catalog', (req, res) => {
    const canEdit = req.user?.permissions.includes('banks.write') ?? false
    res.json(listCatalog(db, { includeArchived: false, includePrivate: canEdit }))
  })

  app.post('/api/invitations/inspect', invitationInspectLimit, parseBody(invitationInspectSchema), (req, res) => {
    const invitation = inspectInvitation(db, req.validatedBody.token)
    if (!invitation) return res.status(410).json({ error: '邀请无效或已失效。' })
    return res.json(invitation)
  })
  app.post('/api/invitations/accept', invitationAcceptLimit, (req, res, next) => {
    if (req.user) return res.status(409).json({ error: '请先退出当前账号，再接受邀请。' })
    return next()
  }, parseBody(invitationAcceptSchema), (req, res) => {
    const result = acceptInvitation(db, req.validatedBody, req)
    if (result.status === 'unavailable') return res.status(410).json({ error: '邀请无效或已失效。' })
    if (result.status === 'username-conflict') return res.status(409).json({ error: '用户名已存在。' })
    setSessionCookie(res, result.session.token, result.session.expiresAt, options.secureCookies ?? req.secure)
    return res.status(201).json({ ok: true, user: publicUser(result.user) })
  })

  app.get('/api/auth/session', (req, res) => res.json({ user: publicUser(req.user) }))
  app.post('/api/auth/login', parseBody(loginSchema), loginGuard.check, (req, res) => {
    const row = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(req.validatedBody.username)
    const passwordMatches = verifyPassword(row?.password_hash ?? DUMMY_LOGIN_HASH, req.validatedBody.password)
    if (!row || row.status !== 'active' || !passwordMatches) {
      loginGuard.fail(req)
      return res.status(401).json({ error: '用户名或密码不正确。' })
    }
    loginGuard.succeed(req)
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(new Date().toISOString())
    const session = createSession(db, row.id)
    setSessionCookie(res, session.token, session.expiresAt, options.secureCookies ?? req.secure)
    audit(db, { ...req, user: { id: row.id } }, 'auth.login', 'user', row.id)
    return res.json({ ok: true, mustChangePassword: Boolean(row.must_change_password) })
  })
  app.post('/api/auth/logout', (req, res) => {
    revokeSession(db, req.cookies?.[COOKIE_NAME])
    clearSessionCookie(res, options.secureCookies ?? req.secure)
    res.json({ ok: true })
  })
  app.post('/api/auth/change-password', requireUser, parseBody(passwordSchema), (req, res) => {
    const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id)
    if (!verifyPassword(row.password_hash, req.validatedBody.currentPassword)) {
      return res.status(400).json({ error: '当前密码不正确。' })
    }
    const now = new Date().toISOString()
    db.prepare('UPDATE users SET password_hash=?, must_change_password=0, updated_at=? WHERE id=?')
      .run(passwordHash(req.validatedBody.newPassword), now, req.user.id)
    revokeUserSessions(db, req.user.id)
    const session = createSession(db, req.user.id)
    setSessionCookie(res, session.token, session.expiresAt, options.secureCookies ?? req.secure)
    audit(db, req, 'auth.change-password', 'user', req.user.id)
    return res.json({ ok: true })
  })

  app.get('/api/me/state', requireUser, requireExpectedUser, (req, res) => res.json(getStudyState(db, req.user.id)))
  app.put('/api/me/state', requirePermission('study.write'), requireExpectedUser, parseBody(studyStateSchema), (req, res) => {
    res.json(saveStudyState(db, req.user.id, req.validatedBody))
  })
  app.post('/api/me/import-local', requirePermission('study.write'), requireExpectedUser, (req, res) => {
    const parsed = studyStateSchema.safeParse(req.body?.state)
    const contentHash = req.body?.contentHash
    if (!parsed.success || !/^[a-f0-9]{64}$/.test(contentHash ?? '')) {
      return res.status(400).json({ error: '迁移数据或内容哈希无效。' })
    }
    const calculated = crypto.createHash('sha256').update(JSON.stringify(parsed.data)).digest('hex')
    if (calculated !== contentHash) return res.status(400).json({ error: '迁移数据校验失败。' })
    const receipt = db.prepare('SELECT summary_json FROM import_receipts WHERE user_id=? AND content_hash=?')
      .get(req.user.id, contentHash)
    if (receipt) return res.json({ repeated: true, summary: JSON.parse(receipt.summary_json), state: getStudyState(db, req.user.id) })
    const merged = mergeStudyState(getStudyState(db, req.user.id), parsed.data)
    const state = saveStudyState(db, req.user.id, merged)
    const summary = {
      progress: Object.keys(parsed.data.progress).length,
      annotations: parsed.data.annotations.length,
      activityDays: Object.keys(parsed.data.activity).length,
    }
    db.prepare('INSERT INTO import_receipts(user_id, content_hash, imported_at, summary_json) VALUES(?, ?, ?, ?)')
      .run(req.user.id, contentHash, new Date().toISOString(), JSON.stringify(summary))
    audit(db, req, 'study.import-local', 'user', req.user.id, summary)
    return res.json({ repeated: false, summary, state })
  })

  app.get('/api/users', requirePermission('users.manage'), (_req, res) => res.json({ users: listUsers(db) }))
  app.post('/api/users', requirePermission('users.manage'), parseBody(userCreateSchema), (req, res) => {
    const data = req.validatedBody
    if (db.prepare('SELECT 1 FROM users WHERE username = ? COLLATE NOCASE').get(data.username)) {
      return res.status(409).json({ error: '用户名已存在。' })
    }
    const id = crypto.randomUUID()
    const password = data.password ?? randomPassword()
    const now = new Date().toISOString()
    db.transaction(() => {
      db.prepare(`INSERT INTO users(id, username, display_name, password_hash, must_change_password, created_at, updated_at)
        VALUES(?, ?, ?, ?, 1, ?, ?)`).run(id, data.username, data.displayName, passwordHash(password), now, now)
      db.prepare('INSERT INTO user_roles(user_id, role_id) VALUES(?, ?)').run(id, data.role)
      db.prepare('INSERT INTO settings(user_id, data_json, updated_at) VALUES(?, ?, ?)')
        .run(id, JSON.stringify({ theme: 'light', readingSize: 'comfortable', readingFont: 'serif', pageLayout: 'spread', focusMode: false, notesOpen: true }), now)
    })()
    audit(db, req, 'user.create', 'user', id, { username: data.username, role: data.role })
    return res.status(201).json({ user: listUsers(db).find((user) => user.id === id), temporaryPassword: password })
  })
  app.patch('/api/users/:id', requirePermission('users.manage'), parseBody(userPatchSchema), (req, res) => {
    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
    if (!target) return res.status(404).json({ error: '用户不存在。' })
    if (req.params.id === req.user.id && req.validatedBody.status === 'disabled') {
      return res.status(400).json({ error: '不能停用当前登录账号。' })
    }
    const data = req.validatedBody
    if (req.params.id === req.user.id && data.role && data.role !== 'admin') {
      return res.status(400).json({ error: '不能移除当前登录账号的管理员角色。' })
    }
    db.transaction(() => {
      if (data.displayName || data.status) {
        db.prepare('UPDATE users SET display_name=?, status=?, updated_at=? WHERE id=?')
          .run(data.displayName ?? target.display_name, data.status ?? target.status, new Date().toISOString(), target.id)
      }
      if (data.role) {
        db.prepare('DELETE FROM user_roles WHERE user_id = ?').run(target.id)
        db.prepare('INSERT INTO user_roles(user_id, role_id) VALUES(?, ?)').run(target.id, data.role)
      }
      if (data.status === 'disabled' || data.role) revokeUserSessions(db, target.id)
    })()
    audit(db, req, 'user.update', 'user', target.id, data)
    return res.json({ user: listUsers(db).find((user) => user.id === target.id) })
  })
  app.post('/api/users/:id/reset-password', requirePermission('users.manage'), (req, res) => {
    const target = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id)
    if (!target) return res.status(404).json({ error: '用户不存在。' })
    const password = randomPassword()
    db.prepare('UPDATE users SET password_hash=?, must_change_password=1, updated_at=? WHERE id=?')
      .run(passwordHash(password), new Date().toISOString(), target.id)
    revokeUserSessions(db, target.id)
    audit(db, req, 'user.reset-password', 'user', target.id)
    return res.json({ temporaryPassword: password })
  })

  app.get('/api/admin/invitations', requirePermission('users.manage'), (_req, res) => {
    return res.json({ invitations: listInvitations(db) })
  })
  app.post('/api/admin/invitations', requirePermission('users.manage'), parseBody(invitationCreateSchema), (req, res) => {
    let created
    db.transaction(() => {
      created = createInvitation(db, req.user.id, req.validatedBody.expiresInHours)
      audit(db, req, 'invitation.create', 'invitation', created.invitation.id, {
        expiresAt: created.invitation.expiresAt,
      })
    })()
    return res.status(201).json(created)
  })
  app.post('/api/admin/invitations/:id/revoke', requirePermission('users.manage'), (req, res) => {
    const result = revokeInvitation(db, req.params.id, req)
    if (result.status === 'missing') return res.status(404).json({ error: '邀请不存在。' })
    if (result.status === 'used') return res.status(409).json({ error: '已使用的邀请不能撤销。' })
    if (result.status === 'unavailable') return res.status(409).json({ error: '邀请状态已经改变，请刷新后重试。' })
    return res.json({ ok: true })
  })

  app.get('/api/admin/catalog', requirePermission('banks.write'), (_req, res) => {
    res.json(listCatalog(db, { includeArchived: true, includePrivate: true }))
  })
  app.post('/api/banks', requirePermission('banks.write'), parseBody(bankCreateSchema), (req, res) => {
    const data = req.validatedBody
    if (db.prepare('SELECT 1 FROM question_banks WHERE id=?').get(data.id)) return res.status(409).json({ error: '题库 ID 已存在。' })
    const now = new Date().toISOString()
    const sortOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM question_banks').get().next
    db.prepare(`INSERT INTO question_banks(id,title,short_title,kicker,category,description,base_tags_json,tone,
      visibility,sort_order,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(data.id, data.title, data.shortTitle, data.kicker, data.category, data.description,
        JSON.stringify(data.baseTags), data.tone, data.visibility, sortOrder, req.user.id, now, now)
    audit(db, req, 'bank.create', 'question_bank', data.id)
    return res.status(201).json({ ok: true, id: data.id })
  })
  app.patch('/api/banks/:id', requirePermission('banks.write'), parseBody(bankPatchSchema), (req, res) => {
    const current = db.prepare('SELECT * FROM question_banks WHERE id=?').get(req.params.id)
    if (!current) return res.status(404).json({ error: '题库不存在。' })
    if (current.version !== req.validatedBody.version) return res.status(409).json({ error: '题库已被其他编辑修改。', currentVersion: current.version })
    const data = req.validatedBody
    db.prepare(`UPDATE question_banks SET title=?, short_title=?, kicker=?, category=?, description=?, base_tags_json=?,
      tone=?, visibility=?, version=version+1, updated_at=? WHERE id=?`).run(
      data.title ?? current.title, data.shortTitle ?? current.short_title, data.kicker ?? current.kicker,
      data.category ?? current.category, data.description ?? current.description,
      JSON.stringify(data.baseTags ?? JSON.parse(current.base_tags_json)), data.tone ?? current.tone,
      data.visibility ?? current.visibility, new Date().toISOString(), current.id)
    audit(db, req, 'bank.update', 'question_bank', current.id)
    return res.json({ ok: true, version: current.version + 1 })
  })
  app.delete('/api/banks/:id', requirePermission('banks.delete'), (req, res) => {
    const bank = db.prepare('SELECT * FROM question_banks WHERE id=?').get(req.params.id)
    if (!bank) return res.status(404).json({ error: '题库不存在。' })
    if (req.query.permanent === 'true') {
      if (!bank.archived_at || req.query.confirm !== bank.id) return res.status(400).json({ error: '永久删除前必须先归档并确认题库 ID。' })
      db.prepare('DELETE FROM question_banks WHERE id=?').run(bank.id)
      audit(db, req, 'bank.delete-permanent', 'question_bank', bank.id)
      return res.json({ ok: true, permanent: true })
    }
    db.prepare('UPDATE question_banks SET archived_at=?, version=version+1, updated_at=? WHERE id=?')
      .run(new Date().toISOString(), new Date().toISOString(), bank.id)
    audit(db, req, 'bank.archive', 'question_bank', bank.id)
    return res.json({ ok: true, permanent: false })
  })
  app.post('/api/banks/:id/restore', requirePermission('banks.delete'), (req, res) => {
    const result = db.prepare('UPDATE question_banks SET archived_at=NULL, version=version+1, updated_at=? WHERE id=? AND archived_at IS NOT NULL')
      .run(new Date().toISOString(), req.params.id)
    if (!result.changes) return res.status(404).json({ error: '归档题库不存在。' })
    audit(db, req, 'bank.restore', 'question_bank', req.params.id)
    return res.json({ ok: true })
  })

  app.post('/api/banks/:bankId/questions', requirePermission('banks.write'), parseBody(questionCreateSchema), (req, res) => {
    const id = createQuestion(db, req.params.bankId, req.validatedBody, req.user.id)
    if (!id) return res.status(404).json({ error: '题库不存在或已归档。' })
    audit(db, req, 'question.create', 'question', id, { bankId: req.params.bankId })
    return res.status(201).json({ id })
  })
  app.patch('/api/questions/:id', requirePermission('banks.write'), parseBody(questionPatchSchema), (req, res) => {
    const result = updateQuestion(db, req.params.id, req.validatedBody)
    if (result.status === 'missing') return res.status(404).json({ error: '题目不存在。' })
    if (result.status === 'conflict') return res.status(409).json({ error: '题目已被其他编辑修改。', currentVersion: result.currentVersion })
    audit(db, req, 'question.update', 'question', req.params.id)
    return res.json(result)
  })
  app.delete('/api/questions/:id', requirePermission('banks.delete'), (req, res) => {
    const question = currentQuestion(db, req.params.id)
    if (!question) return res.status(404).json({ error: '题目不存在。' })
    if (req.query.permanent === 'true') {
      if (!question.archived_at || req.query.confirm !== question.id) return res.status(400).json({ error: '永久删除前必须先归档并确认题目 ID。' })
      db.prepare('DELETE FROM questions WHERE id=?').run(question.id)
      audit(db, req, 'question.delete-permanent', 'question', question.id)
      return res.json({ ok: true, permanent: true })
    }
    db.prepare('UPDATE questions SET archived_at=?, version=version+1, updated_at=? WHERE id=?')
      .run(new Date().toISOString(), new Date().toISOString(), question.id)
    audit(db, req, 'question.archive', 'question', question.id)
    return res.json({ ok: true, permanent: false })
  })
  app.post('/api/questions/:id/restore', requirePermission('banks.delete'), (req, res) => {
    const result = db.prepare('UPDATE questions SET archived_at=NULL, version=version+1, updated_at=? WHERE id=? AND archived_at IS NOT NULL')
      .run(new Date().toISOString(), req.params.id)
    if (!result.changes) return res.status(404).json({ error: '归档题目不存在。' })
    audit(db, req, 'question.restore', 'question', req.params.id)
    return res.json({ ok: true })
  })

  app.post('/api/import/markdown/preview', requirePermission('banks.write'), (req, res) => {
    const source = typeof req.body?.markdown === 'string' ? req.body.markdown : ''
    const diagramInspection = inspectMarkdownDiagrams(source)
    if (diagramInspection.errors.length) {
      return res.status(400).json({ error: 'Markdown 图解不符合安全要求。', issues: diagramInspection.errors })
    }
    const parsed = parseQuestionMarkdown(source, { preserveIds: false, baseTags: [] })
    return res.json({ sections: parsed.length, questions: parsed.reduce((sum, section) => sum + section.questions.length, 0), sample: parsed.slice(0, 2) })
  })
  app.post('/api/banks/:bankId/import-markdown', requirePermission('banks.write'), (req, res) => {
    const source = typeof req.body?.markdown === 'string' ? req.body.markdown : ''
    const diagramInspection = inspectMarkdownDiagrams(source)
    if (diagramInspection.errors.length) {
      return res.status(400).json({ error: 'Markdown 图解不符合安全要求。', issues: diagramInspection.errors })
    }
    const parsed = parseQuestionMarkdown(source, { preserveIds: false, baseTags: [] })
    if (!parsed.length) return res.status(400).json({ error: '没有识别到以 Q 开头的二级标题。' })
    let count = 0
    for (const section of parsed) {
      for (const item of section.questions) {
        const title = item.title.replace(/^Q[\d.]+\s*[：:]?\s*/i, '')
        const id = createQuestion(db, req.params.bankId, {
          sectionTitle: section.title, title, body: item.body, tags: item.tags,
          difficulty: 'intermediate', sources: [],
        }, req.user.id)
        if (!id) return res.status(404).json({ error: '题库不存在或已归档。' })
        count += 1
      }
    }
    audit(db, req, 'question.import-markdown', 'question_bank', req.params.bankId, { count })
    return res.status(201).json({ ok: true, count })
  })

  app.get('/api/export/catalog.json', requirePermission('banks.write'), (_req, res) => {
    res.attachment(`interview-margin-catalog-${new Date().toISOString().slice(0, 10)}.json`)
    res.json(listCatalog(db, { includeArchived: true, includePrivate: true }))
  })
  app.get('/api/banks/:id/export.md', requirePermission('banks.write'), (req, res) => {
    const catalog = listCatalog(db, { includeArchived: true, includePrivate: true })
    const bank = catalog.banks.find((item) => item.id === req.params.id)
    if (!bank) return res.status(404).json({ error: '题库不存在。' })
    const sections = catalog.sections.filter((section) => section.questions.some((question) => question.library === bank.id))
    const questions = sections.flatMap((section) => section.questions)
    res.attachment(`${bank.id}.md`).type('text/markdown; charset=utf-8')
    return res.send(renderBankMarkdown(bank, sections, questions))
  })
  app.get('/api/audit', requirePermission('audit.read'), (req, res) => {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50))
    const logs = db.prepare(`SELECT a.*, u.username FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_user_id
      ORDER BY a.created_at DESC LIMIT ?`).all(limit).map((row) => ({
      id: row.id, actor: row.username ?? 'system', action: row.action, entityType: row.entity_type,
      entityId: row.entity_id, metadata: JSON.parse(row.metadata_json), ip: row.ip, createdAt: row.created_at,
    }))
    res.json({ logs })
  })
  app.get('/api/backups', requirePermission('backup.manage'), (_req, res) => res.json({ backups: listBackups(backupDir) }))
  app.post('/api/backups', requirePermission('backup.manage'), async (req, res, next) => {
    try {
      const result = await backupDatabase(db, backupDir)
      audit(db, req, 'backup.create', 'database', result.filename)
      res.status(201).json({ filename: result.filename, size: result.size })
    } catch (error) { next(error) }
  })
  app.get('/api/backups/:filename', requirePermission('backup.manage'), (req, res) => {
    const target = resolveBackup(backupDir, req.params.filename)
    if (!target) return res.status(404).json({ error: '备份不存在。' })
    return res.download(target)
  })

  app.use('/api/ai-chat', rateLimit({
    windowMs: 10 * 60_000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'AI 请求过于频繁，请稍后再试。' },
  }))
  app.all('/api/ai-chat', async (req, res) => {
    const fallback = process.env.AI_FALLBACK_URL?.trim()
    if (process.env.OPENAI_API_KEY || !fallback) return aiChatHandler(req, res)
    try {
      const upstream = await fetch(fallback, {
        method: req.method,
        headers: { 'Content-Type': 'application/json' },
        body: req.method === 'GET' || req.method === 'HEAD' ? undefined : JSON.stringify(req.body ?? {}),
        signal: AbortSignal.timeout(60_000),
      })
      const payload = await upstream.text()
      res.status(upstream.status).type(upstream.headers.get('content-type') ?? 'application/json').send(payload)
    } catch {
      res.status(502).json({ error: 'AI 后备服务暂时无法连接，请稍后再试。' })
    }
  })

  if (options.serveStatic !== false) {
    app.use(express.static(distDir, {
      etag: true,
      index: false,
      maxAge: '1h',
      setHeaders(res, filePath) {
        if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache')
      },
    }))
    app.get('*path', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache')
      res.sendFile(path.join(distDir, 'index.html'))
    })
  }

  app.use((error, _req, res, _next) => {
    console.error(error)
    res.status(500).json({ error: '服务器处理请求时发生错误。' })
  })
  return { app, database, backupDir }
}
