import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { Algorithm, hashSync } from '@node-rs/argon2'
import Database from 'better-sqlite3'

import { BUILTIN_BANKS } from './content/banks.js'
import { parseQuestionMarkdown } from './content/markdown.js'

const DEFAULT_SETTINGS = {
  theme: 'light',
  readingSize: 'comfortable',
  pageLayout: 'spread',
  focusMode: false,
  notesOpen: true,
}

const PERMISSIONS = [
  'banks.read', 'banks.write', 'banks.delete', 'users.manage',
  'audit.read', 'backup.manage', 'study.write',
]

const ROLE_PERMISSIONS = {
  admin: PERMISSIONS,
  editor: ['banks.read', 'banks.write', 'banks.delete', 'study.write'],
  learner: ['banks.read', 'study.write'],
}

export function passwordHash(password) {
  return hashSync(password, {
    algorithm: Algorithm.Argon2id,
    memoryCost: 65_536,
    timeCost: 3,
    parallelism: 1,
    outputLen: 32,
  })
}

export function randomPassword() {
  return `${crypto.randomBytes(9).toString('base64url')}!aA7`
}

function nonBlank(value) {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      must_change_password INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'disabled')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS roles (id TEXT PRIMARY KEY, label TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS permissions (id TEXT PRIMARY KEY, label TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, role_id)
    );
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      PRIMARY KEY (role_id, permission_id)
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

    CREATE TABLE IF NOT EXISTS question_banks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      short_title TEXT NOT NULL,
      kicker TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      base_tags_json TEXT NOT NULL DEFAULT '[]',
      tone TEXT NOT NULL DEFAULT 'blue',
      visibility TEXT NOT NULL DEFAULT 'public',
      sort_order INTEGER NOT NULL DEFAULT 0,
      version INTEGER NOT NULL DEFAULT 1,
      archived_at TEXT,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sections (
      id TEXT PRIMARY KEY,
      bank_id TEXT NOT NULL REFERENCES question_banks(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      UNIQUE(bank_id, sort_order)
    );
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      bank_id TEXT NOT NULL REFERENCES question_banks(id) ON DELETE CASCADE,
      section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
      display_number TEXT NOT NULL,
      title TEXT NOT NULL,
      body_md TEXT NOT NULL,
      plain_text TEXT NOT NULL,
      tags_json TEXT NOT NULL DEFAULT '[]',
      difficulty TEXT NOT NULL DEFAULT 'intermediate',
      read_minutes INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      provenance TEXT NOT NULL DEFAULT 'seed',
      verified_at TEXT,
      archived_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(bank_id, display_number)
    );
    CREATE INDEX IF NOT EXISTS idx_questions_bank_order ON questions(bank_id, sort_order);
    CREATE INDEX IF NOT EXISTS idx_questions_section ON questions(section_id);
    CREATE TABLE IF NOT EXISTS source_refs (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      source_kind TEXT NOT NULL DEFAULT 'official',
      verified_at TEXT
    );

    CREATE TABLE IF NOT EXISTS progress (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'unread',
      favorite INTEGER NOT NULL DEFAULT 0,
      note TEXT NOT NULL DEFAULT '',
      read_count INTEGER NOT NULL DEFAULT 0,
      seconds INTEGER NOT NULL DEFAULT 0,
      last_opened_at TEXT,
      due_at TEXT,
      scroll_top REAL NOT NULL DEFAULT 0,
      spread_index INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      PRIMARY KEY(user_id, question_id)
    );
    CREATE TABLE IF NOT EXISTS annotations (
      id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      quote TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      PRIMARY KEY(user_id, id)
    );
    CREATE INDEX IF NOT EXISTS idx_annotations_user_question ON annotations(user_id, question_id);
    CREATE TABLE IF NOT EXISTS activity (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day TEXT NOT NULL,
      amount INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY(user_id, day)
    );
    CREATE TABLE IF NOT EXISTS settings (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      data_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS import_receipts (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content_hash TEXT NOT NULL,
      imported_at TEXT NOT NULL,
      summary_json TEXT NOT NULL,
      PRIMARY KEY(user_id, content_hash)
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      ip TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
  `)
  const now = new Date().toISOString()
  db.prepare('INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES(?, ?)').run(1, now)
  const bankColumns = db.pragma('table_info(question_banks)')
  if (!bankColumns.some((column) => column.name === 'sort_order')) {
    db.exec('ALTER TABLE question_banks ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0')
  }
  db.prepare('INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES(?, ?)').run(2, now)

  const invitationMigration = db.prepare('SELECT 1 FROM schema_migrations WHERE version = 3').get()
  if (!invitationMigration) {
    db.transaction(() => {
      db.exec(`
        CREATE TABLE invitations (
          id TEXT PRIMARY KEY,
          token_hash TEXT NOT NULL UNIQUE,
          created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
          expires_at TEXT NOT NULL,
          created_at TEXT NOT NULL,
          used_at TEXT,
          used_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
          revoked_at TEXT
        );
        CREATE INDEX idx_invitations_created_at ON invitations(created_at DESC);
        CREATE INDEX idx_invitations_expires_at ON invitations(expires_at);
      `)
      db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(?, ?)').run(3, now)
    })()
  }
}

function seedRoles(db) {
  const roleLabels = { admin: '管理员', editor: '内容编辑', learner: '学习用户' }
  const insertRole = db.prepare('INSERT OR IGNORE INTO roles(id, label) VALUES(?, ?)')
  const insertPermission = db.prepare('INSERT OR IGNORE INTO permissions(id, label) VALUES(?, ?)')
  const insertRolePermission = db.prepare('INSERT OR IGNORE INTO role_permissions(role_id, permission_id) VALUES(?, ?)')
  db.transaction(() => {
    Object.entries(roleLabels).forEach(([id, label]) => insertRole.run(id, label))
    PERMISSIONS.forEach((id) => insertPermission.run(id, id))
    Object.entries(ROLE_PERMISSIONS).forEach(([role, permissions]) => {
      permissions.forEach((permission) => insertRolePermission.run(role, permission))
    })
  })()
}

function seedBuiltins(db, rootDir) {
  const now = new Date().toISOString()
  const insertBank = db.prepare(`
    INSERT INTO question_banks(
      id, title, short_title, kicker, category, description, base_tags_json, tone,
      visibility, sort_order, created_at, updated_at
    ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, 'public', ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title, short_title=excluded.short_title, kicker=excluded.kicker,
      category=excluded.category, description=excluded.description,
      base_tags_json=excluded.base_tags_json, tone=excluded.tone,
      sort_order=excluded.sort_order, updated_at=excluded.updated_at
  `)
  const insertSection = db.prepare(`
    INSERT INTO sections(id, bank_id, title, sort_order) VALUES(?, ?, ?, ?)
    ON CONFLICT DO UPDATE SET title=excluded.title, sort_order=excluded.sort_order
    RETURNING id
  `)
  const insertQuestion = db.prepare(`
    INSERT INTO questions(
      id, bank_id, section_id, display_number, title, body_md, plain_text, tags_json,
      difficulty, read_minutes, sort_order, provenance, verified_at, created_at, updated_at
    ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, 'intermediate', ?, ?, 'seed', ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      bank_id=excluded.bank_id, section_id=excluded.section_id,
      display_number=excluded.display_number, title=excluded.title,
      body_md=excluded.body_md, plain_text=excluded.plain_text,
      tags_json=excluded.tags_json, read_minutes=excluded.read_minutes,
      sort_order=excluded.sort_order, verified_at=excluded.verified_at,
      archived_at=NULL, version=questions.version+1, updated_at=excluded.updated_at
    WHERE questions.provenance='seed' AND (
      questions.archived_at IS NOT NULL OR
      questions.section_id<>excluded.section_id OR questions.display_number<>excluded.display_number OR
      questions.title<>excluded.title OR questions.body_md<>excluded.body_md OR
      questions.tags_json<>excluded.tags_json OR questions.sort_order<>excluded.sort_order
    )
  `)
  const insertSource = db.prepare(`
    INSERT OR IGNORE INTO source_refs(id, question_id, title, url, source_kind, verified_at)
    VALUES(?, ?, ?, ?, 'official', ?)
  `)
  db.transaction(() => {
    for (const [bankOrder, bank] of BUILTIN_BANKS.entries()) {
      const sourcePath = path.join(rootDir, bank.source)
      if (!fs.existsSync(sourcePath)) continue
      insertBank.run(bank.id, bank.title, bank.shortTitle, bank.kicker, bank.category,
        bank.description, JSON.stringify(bank.baseTags), bank.tone, bankOrder, now, now)
      const source = fs.readFileSync(sourcePath, 'utf8')
      const sections = parseQuestionMarkdown(source, {
        idPrefix: bank.idPrefix,
        baseTags: bank.baseTags,
        preserveIds: bank.preserveIds,
        normalizeReadability: true,
      })
      const currentQuestionIds = []
      for (const section of sections) {
        const proposedSectionId = `${bank.id}:${section.id}`
        const sectionId = insertSection
          .get(proposedSectionId, bank.id, section.title, section.order)
          .id
        for (const question of section.questions) {
          currentQuestionIds.push(question.id)
          const inserted = insertQuestion.run(question.id, bank.id, sectionId, question.number, question.title,
            question.body, question.plainText, JSON.stringify(question.tags),
            question.readMinutes, question.order, now, now, now)
          if (inserted.changes) {
            db.prepare('DELETE FROM source_refs WHERE question_id = ?').run(question.id)
            for (const source of question.sources) {
              const sourceId = crypto.createHash('sha256').update(`${question.id}:${source.url}`).digest('hex').slice(0, 32)
              insertSource.run(sourceId, question.id, source.title, source.url, now)
            }
          }
        }
      }
      const placeholders = currentQuestionIds.map(() => '?').join(', ')
      const currentQuestionFilter = currentQuestionIds.length > 0
        ? `AND id NOT IN (${placeholders})`
        : ''
      db.prepare(`
        UPDATE questions
        SET archived_at = ?, version = version + 1, updated_at = ?
        WHERE bank_id = ? AND provenance = 'seed' AND archived_at IS NULL
          ${currentQuestionFilter}
      `).run(now, now, bank.id, ...currentQuestionIds)
    }
  })()
}

function bootstrapAdmin(db, dataDir, config = {}) {
  if (db.prepare('SELECT COUNT(*) AS count FROM users').get().count > 0) return undefined
  const now = new Date().toISOString()
  const username = nonBlank(config.username) ?? nonBlank(process.env.BOOTSTRAP_ADMIN_USERNAME) ?? 'admin'
  const password = nonBlank(config.password) ?? nonBlank(process.env.BOOTSTRAP_ADMIN_PASSWORD) ?? randomPassword()
  const userId = crypto.randomUUID()
  db.transaction(() => {
    db.prepare(`
      INSERT INTO users(id, username, display_name, password_hash, must_change_password, created_at, updated_at)
      VALUES(?, ?, ?, ?, 1, ?, ?)
    `).run(userId, username, '系统管理员', passwordHash(password), now, now)
    db.prepare('INSERT INTO user_roles(user_id, role_id) VALUES(?, ?)').run(userId, 'admin')
    db.prepare('INSERT INTO settings(user_id, data_json, updated_at) VALUES(?, ?, ?)')
      .run(userId, JSON.stringify(DEFAULT_SETTINGS), now)
  })()
  if (!config.skipCredentialFile) {
    fs.mkdirSync(dataDir, { recursive: true })
    fs.writeFileSync(path.join(dataDir, 'bootstrap-admin.txt'),
      `首次管理员（登录后必须改密）\n用户名: ${username}\n一次性密码: ${password}\n生成时间: ${now}\n`,
      { encoding: 'utf8', flag: 'wx' })
  }
  return { username, password }
}

export function createDatabase(options = {}) {
  const rootDir = options.rootDir ?? path.resolve(process.cwd())
  const dataDir = options.dataDir ?? path.join(rootDir, 'data')
  const filename = options.filename ?? path.join(dataDir, 'interview.db')
  if (filename !== ':memory:') fs.mkdirSync(path.dirname(filename), { recursive: true })
  const db = new Database(filename)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('busy_timeout = 5000')
  db.pragma('synchronous = NORMAL')
  migrate(db)
  seedRoles(db)
  if (options.seed !== false) seedBuiltins(db, rootDir)
  const bootstrap = options.bootstrap === false ? undefined : bootstrapAdmin(db, dataDir, options.bootstrap)
  return { db, filename, dataDir, bootstrap }
}

export function defaultSettings() {
  return { ...DEFAULT_SETTINGS }
}
