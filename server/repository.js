import crypto from 'node:crypto'

import { toString } from 'mdast-util-to-string'
import remarkParse from 'remark-parse'
import { unified } from 'unified'

import { defaultSettings } from './database.js'

function parseJson(value, fallback) {
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function plainText(markdown) {
  return toString(unified().use(remarkParse).parse(markdown)).replace(/\s+/g, ' ').trim()
}

function bankFromRow(row) {
  return {
    id: row.id,
    title: row.title,
    shortTitle: row.short_title,
    kicker: row.kicker,
    category: row.category,
    description: row.description,
    baseTags: parseJson(row.base_tags_json, []),
    tone: row.tone,
    visibility: row.visibility,
    sortOrder: row.sort_order,
    version: row.version,
    archivedAt: row.archived_at ?? undefined,
  }
}

function questionFromRow(row, sources = [], { includePlainText = true } = {}) {
  return {
    id: row.id,
    library: row.bank_id,
    number: row.display_number,
    title: row.title,
    body: row.body_md,
    ...(includePlainText ? { plainText: row.plain_text } : {}),
    sectionId: row.section_id,
    sectionTitle: row.section_title,
    tags: parseJson(row.tags_json, []),
    difficulty: row.difficulty,
    readMinutes: row.read_minutes,
    order: row.sort_order,
    version: row.version,
    provenance: row.provenance,
    verifiedAt: row.verified_at ?? undefined,
    archivedAt: row.archived_at ?? undefined,
    sources,
  }
}

export function listCatalog(db, {
  includeArchived = false,
  includePrivate = false,
  includePlainText = true,
  bankId,
} = {}) {
  const bankWhere = [includeArchived ? '1 = 1' : 'archived_at IS NULL']
  const bankParams = []
  if (!includePrivate) bankWhere.push("visibility = 'public'")
  if (bankId) {
    bankWhere.push('id = ?')
    bankParams.push(bankId)
  }
  const banks = db.prepare(`SELECT * FROM question_banks WHERE ${bankWhere.join(' AND ')} ORDER BY sort_order, created_at, id`)
    .all(...bankParams)
    .map(bankFromRow)
  if (!banks.length) return { banks: [], sections: [] }
  const placeholders = banks.map(() => '?').join(',')
  const sectionRows = db.prepare(`
    SELECT s.* FROM sections s
    JOIN question_banks b ON b.id = s.bank_id
    WHERE s.bank_id IN (${placeholders})
    ORDER BY b.sort_order, s.sort_order
  `).all(...banks.map((bank) => bank.id))
  const questionRows = db.prepare(`
    SELECT q.*, s.title AS section_title
    FROM questions q
    JOIN sections s ON s.id = q.section_id
    JOIN question_banks b ON b.id = q.bank_id
    WHERE q.bank_id IN (${placeholders}) ${includeArchived ? '' : 'AND q.archived_at IS NULL'}
    ORDER BY b.sort_order, q.sort_order
  `).all(...banks.map((bank) => bank.id))
  const sourceRows = questionRows.length
    ? db.prepare(`SELECT * FROM source_refs WHERE question_id IN (${questionRows.map(() => '?').join(',')}) ORDER BY rowid`)
      .all(...questionRows.map((question) => question.id))
    : []
  const sourcesByQuestion = new Map()
  for (const source of sourceRows) {
    const list = sourcesByQuestion.get(source.question_id) ?? []
    list.push({ id: source.id, title: source.title, url: source.url, kind: source.source_kind, verifiedAt: source.verified_at })
    sourcesByQuestion.set(source.question_id, list)
  }
  const questionsBySection = new Map()
  for (const row of questionRows) {
    const list = questionsBySection.get(row.section_id) ?? []
    list.push(questionFromRow(row, sourcesByQuestion.get(row.id) ?? [], { includePlainText }))
    questionsBySection.set(row.section_id, list)
  }
  return {
    banks,
    sections: sectionRows.map((section) => ({
      id: section.id,
      title: section.title,
      order: section.sort_order,
      questions: questionsBySection.get(section.id) ?? [],
    })).filter((section) => includeArchived || section.questions.length > 0),
  }
}

function questionIndexFromRow(row, sources = []) {
  return {
    id: row.id,
    library: row.bank_id,
    number: row.display_number,
    title: row.title,
    sectionId: row.section_id,
    sectionTitle: row.section_title,
    tags: parseJson(row.tags_json, []),
    difficulty: row.difficulty,
    readMinutes: row.read_minutes,
    order: row.sort_order,
    version: row.version,
    provenance: row.provenance,
    sources,
  }
}

export function listCatalogIndex(db, { includeArchived = false, includePrivate = false } = {}) {
  const bankWhere = [includeArchived ? '1 = 1' : 'b.archived_at IS NULL']
  if (!includePrivate) bankWhere.push("b.visibility = 'public'")
  const banks = db.prepare(`
    SELECT b.* FROM question_banks b
    WHERE ${bankWhere.join(' AND ')}
    ORDER BY b.sort_order, b.created_at, b.id
  `).all().map(bankFromRow)
  if (!banks.length) return { version: 1, banks: [] }

  const placeholders = banks.map(() => '?').join(',')
  const sectionRows = db.prepare(`
    SELECT s.id, s.bank_id, s.title, s.sort_order
    FROM sections s
    JOIN question_banks b ON b.id = s.bank_id
    WHERE s.bank_id IN (${placeholders})
    ORDER BY b.sort_order, s.sort_order, s.id
  `).all(...banks.map((bank) => bank.id))

  const questionRows = db.prepare(`
    SELECT q.id, q.bank_id, q.section_id, q.display_number, q.title, q.tags_json,
      q.difficulty, q.read_minutes, q.sort_order, q.version, q.provenance,
      s.title AS section_title
    FROM questions q
    JOIN sections s ON s.id = q.section_id
    JOIN question_banks b ON b.id = q.bank_id
    WHERE q.bank_id IN (${placeholders}) ${includeArchived ? '' : 'AND q.archived_at IS NULL'}
    ORDER BY b.sort_order, q.sort_order
  `).all(...banks.map((bank) => bank.id))

  const sourceRows = questionRows.length
    ? db.prepare(`SELECT * FROM source_refs WHERE question_id IN (${questionRows.map(() => '?').join(',')}) ORDER BY rowid`)
      .all(...questionRows.map((question) => question.id))
    : []
  const sourcesByQuestion = new Map()
  for (const source of sourceRows) {
    const list = sourcesByQuestion.get(source.question_id) ?? []
    list.push({ id: source.id, title: source.title, url: source.url, kind: source.source_kind })
    sourcesByQuestion.set(source.question_id, list)
  }
  const questionsBySection = new Map()
  for (const row of questionRows) {
    const list = questionsBySection.get(row.section_id) ?? []
    list.push(questionIndexFromRow(row, sourcesByQuestion.get(row.id) ?? []))
    questionsBySection.set(row.section_id, list)
  }

  const sectionsByBank = new Map()
  for (const row of sectionRows) {
    const questions = questionsBySection.get(row.id) ?? []
    if (!includeArchived && questions.length === 0) continue
    const list = sectionsByBank.get(row.bank_id) ?? []
    list.push({
      id: row.id,
      title: row.title,
      order: row.sort_order,
      questionCount: questions.length,
      questions,
    })
    sectionsByBank.set(row.bank_id, list)
  }

  return {
    version: 1,
    banks: banks.map((bank) => {
      const sections = sectionsByBank.get(bank.id) ?? []
      return {
        ...bank,
        questionCount: sections.reduce((total, section) => total + section.questions.length, 0),
        sections,
      }
    }),
  }
}

export function getBankCatalog(db, bankId, options = {}) {
  const catalog = listCatalog(db, { ...options, bankId })
  if (!catalog.banks.length) return undefined
  return {
    version: 1,
    bank: catalog.banks[0],
    sections: catalog.sections,
  }
}

export function getStudyState(db, userId) {
  const progress = {}
  for (const row of db.prepare(`
    SELECT p.* FROM progress p
    JOIN questions q ON q.id = p.question_id
    WHERE p.user_id = ? AND q.archived_at IS NULL
  `).all(userId)) {
    progress[row.question_id] = {
      status: row.status,
      favorite: Boolean(row.favorite),
      note: row.note,
      readCount: row.read_count,
      seconds: row.seconds,
      lastOpenedAt: row.last_opened_at ?? undefined,
      dueAt: row.due_at ?? undefined,
      scrollTop: row.scroll_top,
      spreadIndex: row.spread_index,
    }
  }
  const annotations = db.prepare(`
    SELECT a.* FROM annotations a
    JOIN questions q ON q.id = a.question_id
    WHERE a.user_id = ? AND a.deleted_at IS NULL AND q.archived_at IS NULL
    ORDER BY a.created_at
  `)
    .all(userId).map((row) => ({
      id: row.id,
      questionId: row.question_id,
      quote: row.quote,
      note: row.note,
      color: row.color,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  const activity = Object.fromEntries(db.prepare('SELECT day, amount FROM activity WHERE user_id = ?').all(userId)
    .map((row) => [row.day, row.amount]))
  const settingsRow = db.prepare('SELECT data_json FROM settings WHERE user_id = ?').get(userId)
  return {
    version: 1,
    progress,
    annotations,
    activity,
    settings: { ...defaultSettings(), ...parseJson(settingsRow?.data_json, {}) },
  }
}

export function saveStudyState(db, userId, state) {
  const validIds = new Set(db.prepare('SELECT id FROM questions WHERE archived_at IS NULL').all().map((row) => row.id))
  const now = new Date().toISOString()
  const upsertProgress = db.prepare(`
    INSERT INTO progress(user_id, question_id, status, favorite, note, read_count, seconds,
      last_opened_at, due_at, scroll_top, spread_index, updated_at)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, question_id) DO UPDATE SET status=excluded.status, favorite=excluded.favorite,
      note=excluded.note, read_count=excluded.read_count, seconds=excluded.seconds,
      last_opened_at=excluded.last_opened_at, due_at=excluded.due_at,
      scroll_top=excluded.scroll_top, spread_index=excluded.spread_index, updated_at=excluded.updated_at
  `)
  const upsertAnnotation = db.prepare(`
    INSERT INTO annotations(id, user_id, question_id, quote, note, color, created_at, updated_at, deleted_at)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, NULL)
    ON CONFLICT(user_id, id) DO UPDATE SET question_id=excluded.question_id, quote=excluded.quote,
      note=excluded.note, color=excluded.color, updated_at=excluded.updated_at, deleted_at=NULL
  `)
  const upsertActivity = db.prepare(`
    INSERT INTO activity(user_id, day, amount) VALUES(?, ?, ?)
    ON CONFLICT(user_id, day) DO UPDATE SET amount=excluded.amount
  `)
  db.transaction(() => {
    db.prepare(`
      DELETE FROM progress
      WHERE user_id = ? AND question_id IN (
        SELECT id FROM questions WHERE archived_at IS NULL
      )
    `).run(userId)
    for (const [questionId, item] of Object.entries(state.progress)) {
      if (!validIds.has(questionId)) continue
      upsertProgress.run(userId, questionId, item.status, Number(item.favorite), item.note, item.readCount,
        item.seconds, item.lastOpenedAt ?? null, item.dueAt ?? null, item.scrollTop ?? 0, item.spreadIndex ?? 0, now)
    }
    db.prepare(`
      UPDATE annotations SET deleted_at = ?
      WHERE user_id = ? AND deleted_at IS NULL AND question_id IN (
        SELECT id FROM questions WHERE archived_at IS NULL
      )
    `).run(now, userId)
    for (const item of state.annotations) {
      if (!validIds.has(item.questionId)) continue
      upsertAnnotation.run(item.id, userId, item.questionId, item.quote, item.note, item.color, item.createdAt, item.updatedAt)
    }
    db.prepare('DELETE FROM activity WHERE user_id = ?').run(userId)
    for (const [day, amount] of Object.entries(state.activity)) upsertActivity.run(userId, day, amount)
    db.prepare(`
      INSERT INTO settings(user_id, data_json, updated_at) VALUES(?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET data_json=excluded.data_json, updated_at=excluded.updated_at
    `).run(userId, JSON.stringify(state.settings), now)
  })()
  return getStudyState(db, userId)
}

export function mergeStudyState(server, local) {
  const progress = { ...server.progress }
  for (const [questionId, incoming] of Object.entries(local.progress)) {
    const current = progress[questionId]
    const currentTime = current?.lastOpenedAt ? Date.parse(current.lastOpenedAt) : 0
    const incomingTime = incoming.lastOpenedAt ? Date.parse(incoming.lastOpenedAt) : 0
    if (!current || incomingTime >= currentTime) progress[questionId] = incoming
  }
  const annotations = new Map(server.annotations.map((item) => [item.id, item]))
  for (const incoming of local.annotations) {
    const current = annotations.get(incoming.id)
    if (!current || Date.parse(incoming.updatedAt) >= Date.parse(current.updatedAt)) annotations.set(incoming.id, incoming)
  }
  const activity = { ...server.activity }
  for (const [day, amount] of Object.entries(local.activity)) activity[day] = Math.max(activity[day] ?? 0, amount)
  return { version: 1, progress, annotations: [...annotations.values()], activity, settings: local.settings }
}

export function createQuestion(db, bankId, data, actorId) {
  const bank = db.prepare('SELECT id FROM question_banks WHERE id = ? AND archived_at IS NULL').get(bankId)
  if (!bank) return undefined
  const now = new Date().toISOString()
  let section = db.prepare('SELECT * FROM sections WHERE bank_id = ? AND title = ?').get(bankId, data.sectionTitle)
  if (!section) {
    const sectionId = crypto.randomUUID()
    const order = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM sections WHERE bank_id = ?').get(bankId).next
    db.prepare('INSERT INTO sections(id, bank_id, title, sort_order) VALUES(?, ?, ?, ?)').run(sectionId, bankId, data.sectionTitle, order)
    section = { id: sectionId, title: data.sectionTitle }
  }
  const next = db.prepare(`
    SELECT COALESCE(MAX(CAST(display_number AS INTEGER)), 0) + 1 AS display_number,
           COALESCE(MAX(sort_order), -1) + 1 AS sort_order FROM questions WHERE bank_id = ?
  `).get(bankId)
  const id = crypto.randomUUID()
  const title = /^Q[\d.]+/i.test(data.title) ? data.title : `Q${next.display_number}：${data.title}`
  db.transaction(() => {
    db.prepare(`
      INSERT INTO questions(id, bank_id, section_id, display_number, title, body_md, plain_text,
        tags_json, difficulty, read_minutes, sort_order, provenance, verified_at, created_at, updated_at)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'editor', ?, ?, ?)
    `).run(id, bankId, section.id, String(next.display_number), title, data.body, plainText(data.body),
      JSON.stringify(data.tags), data.difficulty, Math.max(1, Math.ceil(plainText(data.body).length / 520)),
      next.sort_order, now, now, now)
    const insertSource = db.prepare(`
      INSERT INTO source_refs(id, question_id, title, url, source_kind, verified_at) VALUES(?, ?, ?, ?, 'official', ?)
    `)
    data.sources.forEach((source) => insertSource.run(crypto.randomUUID(), id, source.title, source.url, now))
  })()
  return id
}

export function updateQuestion(db, questionId, data) {
  const current = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId)
  if (!current) return { status: 'missing' }
  if (current.version !== data.version) return { status: 'conflict', currentVersion: current.version }
  const now = new Date().toISOString()
  let sectionId = current.section_id
  if (data.sectionTitle) {
    let section = db.prepare('SELECT id FROM sections WHERE bank_id = ? AND title = ?').get(current.bank_id, data.sectionTitle)
    if (!section) {
      const order = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM sections WHERE bank_id = ?').get(current.bank_id).next
      section = { id: crypto.randomUUID() }
      db.prepare('INSERT INTO sections(id, bank_id, title, sort_order) VALUES(?, ?, ?, ?)').run(section.id, current.bank_id, data.sectionTitle, order)
    }
    sectionId = section.id
  }
  const next = {
    title: data.title ?? current.title,
    body: data.body ?? current.body_md,
    tags: data.tags ?? parseJson(current.tags_json, []),
    difficulty: data.difficulty ?? current.difficulty,
  }
  db.transaction(() => {
    db.prepare(`
      UPDATE questions SET section_id=?, title=?, body_md=?, plain_text=?, tags_json=?, difficulty=?,
        read_minutes=?, provenance='editor', version=version+1, updated_at=? WHERE id=?
    `).run(sectionId, next.title, next.body, plainText(next.body), JSON.stringify(next.tags), next.difficulty,
      Math.max(1, Math.ceil(plainText(next.body).length / 520)), now, questionId)
    if (data.sources) {
      db.prepare('DELETE FROM source_refs WHERE question_id = ?').run(questionId)
      const insert = db.prepare(`INSERT INTO source_refs(id, question_id, title, url, source_kind, verified_at)
        VALUES(?, ?, ?, ?, 'official', ?)`)
      data.sources.forEach((source) => insert.run(crypto.randomUUID(), questionId, source.title, source.url, now))
    }
  })()
  return { status: 'ok', version: current.version + 1 }
}

export function audit(db, req, action, entityType, entityId, metadata = {}) {
  db.prepare(`INSERT INTO audit_logs(id, actor_user_id, action, entity_type, entity_id, metadata_json, ip, created_at)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(crypto.randomUUID(), req.user?.id ?? null, action, entityType, entityId ?? null,
      JSON.stringify(metadata), req.ip ?? null, new Date().toISOString())
}
