import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { Algorithm, hashSync } from '@node-rs/argon2'
import Database from 'better-sqlite3'

import { BUILTIN_BANKS } from './content/banks.js'
import { markdownToPlainText, parseQuestionMarkdown } from './content/markdown.js'
import { groupBuiltinSections } from './content/section-groups.js'

const DEFAULT_SETTINGS = {
  theme: 'light',
  fontTheme: 'clean',
  readingSize: 'comfortable',
  readingFont: 'sans',
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

const BANK_TRACKS = {
  javascript: 'frontend',
  'git-engineering': 'frontend',
  'vue-core': 'frontend',
  'react-core': 'frontend',
  'frontend-engineering': 'frontend',
  'java-foundations': 'java',
  'java-backend-interviews': 'java',
  'backend-fullstack': 'java',
  'database-cache': 'java',
  'network-deployment': 'java',
  'frontend-ai-interviews': 'ai',
  'java-ai-applications': 'ai',
  '360-ai-frontend': 'ai',
  interview: 'project',
}

// The reader exposes four broad learning directions.  Keep the mapping in one
// place so a newly migrated database, a public snapshot and the API all agree
// on the same taxonomy instead of deriving it from the (more granular) legacy
// category labels.
export const QUESTION_TRACKS = Object.freeze({
  frontend: '前端开发',
  java: 'Java 后端',
  ai: 'AI 应用',
  project: '项目与面经',
})

function nonBlank(value) {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function jsonArray(value) {
  try {
    const parsed = JSON.parse(value ?? '[]')
    return Array.isArray(parsed) ? parsed.map((item) => String(item).trim()).filter(Boolean) : []
  } catch {
    return []
  }
}

function deriveAliases(title, tags = []) {
  const cleanTitle = String(title ?? '').replace(/^Q[\d.]+[：:]?\s*/i, '').trim()
  const latin = cleanTitle.match(/[A-Za-z][A-Za-z0-9.+#/-]*/g) ?? []
  const aliases = [...latin, ...tags]
  // A few common Chinese variants make the global search useful without
  // pretending that an alias is an additional source or a second question.
  const replacements = [
    ['响应式', 'reactivity'], ['并发', 'concurrency'], ['线程池', 'thread pool'],
    ['消息队列', 'message queue'], ['缓存', 'cache'], ['索引', 'index'],
    ['向量检索', 'vector retrieval'], ['上下文窗口', 'context window'],
  ]
  for (const [needle, alias] of replacements) if (cleanTitle.includes(needle)) aliases.push(alias)
  return [...new Set(aliases.map((item) => item.trim()).filter(Boolean))].slice(0, 12)
}

function deriveQualityScore(body, sourceCount) {
  const text = String(body ?? '')
  const checks = [
    /\*\*(?:短回答|先背答案|题解)[：:]\*\*/.test(text),
    /\*\*(?:原理|机制拆解)[^*]*[：:]\*\*/.test(text),
    /\*\*(?:代码\s*\/\s*场景|项目(?:\s*\/\s*场景)?|排查\s*\/\s*场景)[：:]\*\*/.test(text),
    /\*\*(?:递进追问|继续追问)[：:]?\*\*/.test(text),
    /\*\*易错点[：:]\*\*/.test(text),
    /(?:为什么|因为|因此|所以|触发|导致|取决于)/.test(text),
    /```|~~~|示例场景|真实场景/.test(text),
    Number(sourceCount) > 0,
  ]
  const base = checks.filter(Boolean).length * 12
  const lengthBonus = Math.min(4, Math.floor(text.length / 500))
  return Math.max(0, Math.min(100, base + lengthBonus))
}

/**
 * Backfill additive discovery metadata after every seed/migration.  It is
 * intentionally deterministic and idempotent; editorial fields can still be
 * changed by the admin editor without changing question IDs.
 */
function refreshQuestionMetadata(db) {
  const bankColumns = new Set(db.pragma('table_info(question_banks)').map((column) => column.name))
  const questionColumns = new Set(db.pragma('table_info(questions)').map((column) => column.name))
  if (!bankColumns.has('track') || !questionColumns.has('track')) return

  const updateBank = db.prepare('UPDATE question_banks SET track=? WHERE id=?')
  const updateQuestion = db.prepare(`UPDATE questions
    SET track=?, frequency=?, aliases_json=?, quality_score=?, quality_reviewed_at=COALESCE(quality_reviewed_at, ?)
    WHERE id=?`)
  const rows = db.prepare(`SELECT q.id, q.bank_id, q.title, q.body_md, q.tags_json,
      b.track, (SELECT COUNT(*) FROM source_refs s WHERE s.question_id=q.id) AS source_count
    FROM questions q JOIN question_banks b ON b.id=q.bank_id
    WHERE q.archived_at IS NULL`).all()
  const now = new Date().toISOString()
  db.transaction(() => {
    for (const [bankId, track] of Object.entries(BANK_TRACKS)) updateBank.run(track, bankId)
    for (const row of rows) {
      const sourceCount = Number(row.source_count) || 0
      const tags = jsonArray(row.tags_json)
      const frequency = Math.max(1, Math.min(5, 1 + Math.ceil(sourceCount / 2)))
      updateQuestion.run(
        row.track || BANK_TRACKS[row.bank_id] || 'project',
        frequency,
        JSON.stringify(deriveAliases(row.title, tags)),
        deriveQualityScore(row.body_md, sourceCount),
        now,
        row.id,
      )
    }
  })()
}

function migrate(db, { enableExtended = true } = {}) {
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

  const seedIdentityMigration = db.prepare('SELECT 1 FROM schema_migrations WHERE version = 4').get()
  if (!seedIdentityMigration) {
    db.transaction(() => {
      db.exec(`
        CREATE TRIGGER retire_seed_question_number_before_insert
        BEFORE INSERT ON questions
        WHEN NEW.provenance = 'seed' AND NEW.archived_at IS NULL
        BEGIN
          UPDATE questions
          SET display_number = 'archived:' || id,
              archived_at = COALESCE(archived_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
              version = version + 1,
              updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
          WHERE bank_id = NEW.bank_id
            AND display_number = NEW.display_number
            AND id <> NEW.id
            AND provenance = 'seed';
        END;

        CREATE TRIGGER retire_seed_question_number_before_update
        BEFORE UPDATE OF bank_id, display_number, archived_at, provenance ON questions
        WHEN NEW.provenance = 'seed' AND NEW.archived_at IS NULL
        BEGIN
          UPDATE questions
          SET display_number = 'archived:' || id,
              archived_at = COALESCE(archived_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
              version = version + 1,
              updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
          WHERE bank_id = NEW.bank_id
            AND display_number = NEW.display_number
            AND id <> NEW.id
            AND provenance = 'seed';
        END;
      `)
      db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(?, ?)').run(4, now)
    })()
  }

  const contactRequestMigration = db.prepare('SELECT 1 FROM schema_migrations WHERE version = 5').get()
  if (!contactRequestMigration) {
    db.transaction(() => {
      db.exec(`
        CREATE TABLE contact_requests (
          id TEXT PRIMARY KEY,
          kind TEXT NOT NULL CHECK(kind IN ('feedback', 'account')),
          name TEXT NOT NULL,
          contact TEXT NOT NULL,
          message TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'reviewing', 'resolved')),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX idx_contact_requests_status_created
          ON contact_requests(status, created_at DESC);
      `)
      db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(?, ?)').run(5, now)
    })()
  }

  // The original seed:false mode is used by lightweight migration tests and
  // by tooling that only needs the core schema.  Keep that mode's historical
  // five-migration contract; a normal application database (the default)
  // enables the additive usage/practice/search migrations below.
  if (!enableExtended) return

  // AI usage accounting (versioned, idempotent migration).
  const aiUsageMigration = db.prepare('SELECT 1 FROM schema_migrations WHERE version = 6').get()
  if (!aiUsageMigration) {
    db.transaction(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS daily (
          day TEXT NOT NULL,
          subject_type TEXT NOT NULL CHECK(subject_type IN ('user','visitor','global')),
          subject_id TEXT NOT NULL,
          chat_used INTEGER NOT NULL DEFAULT 0,
          score_used INTEGER NOT NULL DEFAULT 0,
          chat_reserved INTEGER NOT NULL DEFAULT 0,
          score_reserved INTEGER NOT NULL DEFAULT 0,
          cost_usd REAL NOT NULL DEFAULT 0,
          PRIMARY KEY(day, subject_type, subject_id)
        );
        CREATE INDEX IF NOT EXISTS idx_daily_day ON daily(day);
        CREATE TABLE IF NOT EXISTS usage_events (
          request_id TEXT PRIMARY KEY,
          day TEXT NOT NULL,
          operation TEXT NOT NULL CHECK(operation IN ('chat','score')),
          subject_type TEXT NOT NULL,
          subject_id TEXT NOT NULL,
          user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
          visitor_hash TEXT,
          status TEXT NOT NULL CHECK(status IN ('reserved','completed','failed','cancelled')),
          reserved_units INTEGER NOT NULL DEFAULT 1,
          estimated_tokens INTEGER NOT NULL DEFAULT 0,
          estimated_cost_usd REAL NOT NULL DEFAULT 0,
          actual_tokens INTEGER NOT NULL DEFAULT 0,
          cost_usd REAL NOT NULL DEFAULT 0,
          error_code TEXT,
          created_at TEXT NOT NULL,
          completed_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_usage_events_day ON usage_events(day, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_usage_events_subject ON usage_events(subject_type, subject_id, day);
      `)
      db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(?, ?)').run(6, now)
    })()
  }

  // Practice history and feedback workflow.  This migration is additive so
  // existing installations keep their question/progress data untouched.
  const practiceMigration = db.prepare('SELECT 1 FROM schema_migrations WHERE version = 7').get()
  if (!practiceMigration) {
    db.transaction(() => {
      const contactColumns = new Set(db.pragma('table_info(contact_requests)').map((column) => column.name))
      const contactAdds = [
        ['question_id', 'TEXT REFERENCES questions(id) ON DELETE SET NULL'],
        ['page_context', 'TEXT'],
        ['user_id', 'TEXT REFERENCES users(id) ON DELETE SET NULL'],
        ['invitation_id', 'TEXT REFERENCES invitations(id) ON DELETE SET NULL'],
        ['assigned_to', 'TEXT REFERENCES users(id) ON DELETE SET NULL'],
        ['admin_note', 'TEXT'],
        ['resolved_at', 'TEXT'],
        ['updated_by', 'TEXT REFERENCES users(id) ON DELETE SET NULL'],
      ]
      for (const [name, definition] of contactAdds) {
        if (!contactColumns.has(name)) db.exec(`ALTER TABLE contact_requests ADD COLUMN ${name} ${definition}`)
      }
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_contact_requests_question
          ON contact_requests(question_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_contact_requests_assigned
          ON contact_requests(assigned_to, status, created_at DESC);
        CREATE TABLE IF NOT EXISTS interview_attempts (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
          client_id TEXT,
          answer TEXT NOT NULL,
          score INTEGER NOT NULL CHECK(score >= 0 AND score <= 100),
          dimensions_json TEXT NOT NULL DEFAULT '[]',
          corrections_json TEXT NOT NULL DEFAULT '[]',
          strengths_json TEXT NOT NULL DEFAULT '[]',
          gaps_json TEXT NOT NULL DEFAULT '[]',
          next_step TEXT NOT NULL DEFAULT '',
          band TEXT NOT NULL DEFAULT '',
          summary TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_interview_attempts_client
          ON interview_attempts(user_id, client_id)
          WHERE client_id IS NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_interview_attempts_user_created
          ON interview_attempts(user_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_interview_attempts_question_created
          ON interview_attempts(user_id, question_id, created_at DESC);
      `)
      db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(?, ?)').run(7, now)
    })()
  }

  // Canonical names used by the public accounting contract.  Keep the short
  // names above during the rolling upgrade so an older worker can finish an
  // in-flight request; the application uses the canonical tables thereafter.
  const canonicalUsageMigration = db.prepare('SELECT 1 FROM schema_migrations WHERE version = 8').get()
  if (!canonicalUsageMigration) {
    db.transaction(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS ai_usage_daily (
          day TEXT NOT NULL,
          subject_type TEXT NOT NULL CHECK(subject_type IN ('user','visitor','global')),
          subject_id TEXT NOT NULL,
          chat_used INTEGER NOT NULL DEFAULT 0,
          score_used INTEGER NOT NULL DEFAULT 0,
          chat_reserved INTEGER NOT NULL DEFAULT 0,
          score_reserved INTEGER NOT NULL DEFAULT 0,
          cost_usd REAL NOT NULL DEFAULT 0,
          PRIMARY KEY(day, subject_type, subject_id)
        );
        CREATE INDEX IF NOT EXISTS idx_ai_usage_daily_day ON ai_usage_daily(day);
        CREATE TABLE IF NOT EXISTS ai_usage_events (
          request_id TEXT PRIMARY KEY,
          day TEXT NOT NULL,
          operation TEXT NOT NULL CHECK(operation IN ('chat','score')),
          subject_type TEXT NOT NULL,
          subject_id TEXT NOT NULL,
          user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
          visitor_hash TEXT,
          status TEXT NOT NULL CHECK(status IN ('reserved','completed','failed','cancelled')),
          reserved_units INTEGER NOT NULL DEFAULT 1,
          estimated_tokens INTEGER NOT NULL DEFAULT 0,
          estimated_cost_usd REAL NOT NULL DEFAULT 0,
          actual_tokens INTEGER NOT NULL DEFAULT 0,
          cost_usd REAL NOT NULL DEFAULT 0,
          error_code TEXT,
          created_at TEXT NOT NULL,
          completed_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_ai_usage_events_day ON ai_usage_events(day, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_ai_usage_events_subject ON ai_usage_events(subject_type, subject_id, day);
        INSERT OR IGNORE INTO ai_usage_daily SELECT * FROM daily;
        INSERT OR IGNORE INTO ai_usage_events SELECT * FROM usage_events;
      `)
      db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(?, ?)').run(8, now)
    })()
  }

  // Add the fields needed for cost attribution and content discovery without
  // rewriting any existing event or question rows.  Every ALTER is guarded so
  // this remains safe when an older ECS worker has already partially migrated.
  const addColumn = (table, name, definition) => {
    const columns = new Set(db.pragma(`table_info(${table})`).map((column) => column.name))
    if (!columns.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`)
  }
  const usageColumns = [
    ['model', "TEXT NOT NULL DEFAULT ''"],
    ['input_tokens', 'INTEGER NOT NULL DEFAULT 0'],
    ['output_tokens', 'INTEGER NOT NULL DEFAULT 0'],
    ['cost_source', "TEXT NOT NULL DEFAULT 'estimate'"],
  ]
  for (const [name, definition] of usageColumns) {
    addColumn('usage_events', name, definition)
    addColumn('ai_usage_events', name, definition)
  }
  const contentMigration = db.prepare('SELECT 1 FROM schema_migrations WHERE version = 9').get()
  if (!contentMigration) {
    db.transaction(() => {
      addColumn('question_banks', 'track', "TEXT NOT NULL DEFAULT 'project'")
      addColumn('questions', 'track', "TEXT NOT NULL DEFAULT 'project'")
      addColumn('questions', 'frequency', 'INTEGER NOT NULL DEFAULT 0')
      addColumn('questions', 'aliases_json', "TEXT NOT NULL DEFAULT '[]'")
      addColumn('questions', 'quality_score', 'INTEGER')
      addColumn('questions', 'quality_reviewed_at', 'TEXT')
      db.exec(`
        UPDATE question_banks SET track = CASE
          WHEN id IN ('javascript','git-engineering','vue-core','react-core','frontend-engineering') THEN 'frontend'
          WHEN id IN ('java-foundations','java-backend-interviews','backend-fullstack','database-cache','network-deployment') THEN 'java'
          WHEN id IN ('frontend-ai-interviews','java-ai-applications','360-ai-frontend') THEN 'ai'
          ELSE 'project'
        END;
        UPDATE questions SET track = (SELECT track FROM question_banks b WHERE b.id = questions.bank_id);
      `)
      db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(?, ?)').run(9, now)
    })()
  }

  // Cross-bank full-text index. Kept as a contentless FTS table so rebuilds are
  // deterministic and do not change the canonical question schema.
  db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS question_search USING fts5(
    question_id UNINDEXED, bank_id UNINDEXED, title, plain_text, tags,
    tokenize='unicode61'
  );`)
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

function loadPrecompiledBankSections(rootDir, bank) {
  const snapshotPath = path.join(rootDir, 'public', 'catalog-banks', `${bank.id}.json`)
  if (!fs.existsSync(snapshotPath)) {
    throw new Error(`Precompiled catalog snapshot is missing: ${snapshotPath}`)
  }

  let snapshot
  try {
    snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'))
  } catch (error) {
    throw new Error(`Precompiled catalog snapshot is invalid: ${snapshotPath}`, { cause: error })
  }
  if (snapshot?.version !== 1 || snapshot?.bank?.id !== bank.id || !Array.isArray(snapshot.sections)) {
    throw new Error(`Precompiled catalog snapshot does not match bank ${bank.id}: ${snapshotPath}`)
  }

  return snapshot.sections.map((section, sectionOrder) => {
    if (typeof section?.id !== 'string' || !section.id.startsWith(`${bank.id}:`)
      || typeof section.title !== 'string' || !Array.isArray(section.questions)) {
      throw new Error(`Precompiled catalog section is invalid for bank ${bank.id}: ${snapshotPath}`)
    }
    return {
      id: section.id,
      title: section.title,
      order: Number.isInteger(section.order) ? section.order : sectionOrder,
      questions: section.questions.map((question, questionOrder) => {
        if (question?.library !== bank.id || typeof question.id !== 'string'
          || typeof question.number !== 'string' || typeof question.title !== 'string'
          || typeof question.body !== 'string' || !Array.isArray(question.tags)
          || !Array.isArray(question.sources)) {
          throw new Error(`Precompiled catalog question is invalid for bank ${bank.id}: ${snapshotPath}`)
        }
        return {
          id: question.id,
          number: question.number,
          title: question.title,
          body: question.body,
          plainText: markdownToPlainText(question.body),
          tags: question.tags,
          sources: question.sources,
          readMinutes: Number.isInteger(question.readMinutes) ? question.readMinutes : 1,
          order: Number.isInteger(question.order) ? question.order : questionOrder,
        }
      }),
    }
  })
}

function seedBuiltins(db, rootDir, options = {}) {
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
    VALUES(?, ?, ?, ?, ?, ?)
  `)
  db.transaction(() => {
    for (const [bankOrder, bank] of BUILTIN_BANKS.entries()) {
      const sourcePath = path.join(rootDir, bank.source)
      if (!options.usePrecompiledSeed && !fs.existsSync(sourcePath)) continue
      insertBank.run(bank.id, bank.title, bank.shortTitle, bank.kicker, bank.category,
        bank.description, JSON.stringify(bank.baseTags), bank.tone, bankOrder, now, now)
      const sections = options.usePrecompiledSeed
        ? loadPrecompiledBankSections(rootDir, bank)
        : groupBuiltinSections(bank.id, parseQuestionMarkdown(fs.readFileSync(sourcePath, 'utf8'), {
          bankId: bank.id,
          idPrefix: bank.idPrefix,
          baseTags: bank.baseTags,
          preserveIds: bank.preserveIds,
          normalizeReadability: true,
        }))
      const currentQuestionIds = []
      for (const section of sections) {
        const proposedSectionId = section.id.startsWith(`${bank.id}:`)
          ? section.id
          : `${bank.id}:${section.id}`
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
              insertSource.run(sourceId, question.id, source.title, source.url, source.kind ?? 'official', now)
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
  // Keep the historical lightweight `seed:false` contract unless callers
  // explicitly opt into the additive schema.  Production/default databases
  // always receive the extended migrations; migration tooling can request
  // them with `enableExtended: true` even when it does not seed content.
  const enableExtended = options.enableExtended === true || options.seed !== false
  migrate(db, { enableExtended })
  seedRoles(db)
  if (options.seed !== false) seedBuiltins(db, rootDir, {
    usePrecompiledSeed: options.usePrecompiledSeed === true,
  })
  if (enableExtended) refreshQuestionMetadata(db)
  if (enableExtended && options.seed !== false
    && db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='question_search'").get()) {
    db.exec('DELETE FROM question_search')
    db.prepare(`INSERT INTO question_search(question_id, bank_id, title, plain_text, tags)
      SELECT q.id, q.bank_id, q.title, q.plain_text, q.tags_json
      FROM questions q JOIN question_banks b ON b.id=q.bank_id
      WHERE q.archived_at IS NULL AND b.archived_at IS NULL`).run()
  }
  const bootstrap = options.bootstrap === false ? undefined : bootstrapAdmin(db, dataDir, options.bootstrap)
  return { db, filename, dataDir, bootstrap }
}

export function defaultSettings() {
  return { ...DEFAULT_SETTINGS }
}
