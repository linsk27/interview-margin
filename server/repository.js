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

// Optional metadata columns were introduced in a later migration. Discovery
// and search also run while an older worker is still serving traffic, so keep
// column access defensive during rolling upgrades.
function hasColumn(db, table, column) {
  try {
    return db.pragma(`table_info(${table})`).some((item) => item.name === column)
  } catch {
    return false
  }
}

function hasSearchIndex(db) {
  try {
    return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='question_search'").get())
  } catch {
    return false
  }
}

function syncSearchIndexQuestion(db, questionId) {
  if (!hasSearchIndex(db)) return
  const row = db.prepare(`SELECT q.id, q.bank_id, q.title, q.plain_text, q.tags_json
    FROM questions q JOIN question_banks b ON b.id=q.bank_id
    WHERE q.id=? AND q.archived_at IS NULL AND b.archived_at IS NULL`).get(questionId)
  db.prepare('DELETE FROM question_search WHERE question_id=?').run(questionId)
  if (row) db.prepare('INSERT INTO question_search(question_id,bank_id,title,plain_text,tags) VALUES(?,?,?,?,?)')
    .run(row.id, row.bank_id, row.title, row.plain_text, row.tags_json)
}

function bankFromRow(row) {
  return {
    id: row.id,
    title: row.title,
    shortTitle: row.short_title,
    kicker: row.kicker,
    category: row.category,
    track: row.track ?? undefined,
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
    track: row.track ?? undefined,
    frequency: Number.isFinite(Number(row.frequency)) ? Number(row.frequency) : 0,
    aliases: parseJson(row.aliases_json, []),
    qualityScore: row.quality_score == null ? undefined : Number(row.quality_score),
    qualityReviewedAt: row.quality_reviewed_at ?? undefined,
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
    frequency: Number.isFinite(Number(row.frequency)) ? Number(row.frequency) : 0,
    aliases: parseJson(row.aliases_json, []),
    track: row.track ?? undefined,
    qualityScore: row.quality_score == null ? undefined : Number(row.quality_score),
    qualityReviewedAt: row.quality_reviewed_at ?? undefined,
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

function normalizeSearchValue(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase('zh-CN')
    .replace(/[\u0000-\u001f]/g, ' ')
    .replace(/[“”‘’`~!！@#$%^&*()（）[\]{}<>《》、，。；;：:？?！!「」『』"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function searchTerms(value) {
  const normalized = normalizeSearchValue(value)
  if (!normalized) return []
  const chunks = normalized.split(/\s+/).filter(Boolean)
  // Chinese queries are commonly entered without spaces. Keep the complete
  // phrase for phrase ranking and add meaningful character n-grams so a
  // query such as “线程池” still works with SQLite's unicode61 tokenizer.
  if (chunks.length === 1 && /[\u3400-\u9fff]/u.test(chunks[0]) && chunks[0].length > 2) {
    const grams = []
    for (let i = 0; i < chunks[0].length - 1; i += 1) grams.push(chunks[0].slice(i, i + 2))
    return [chunks[0], ...grams]
  }
  return chunks
}

function decodeSearchCursor(cursor) {
  if (cursor == null || cursor === '') return 0
  const raw = String(cursor)
  if (/^\d+$/.test(raw)) return Math.max(0, Number(raw))
  try {
    const decoded = Buffer.from(raw, 'base64url').toString('utf8')
    const parsed = JSON.parse(decoded)
    return Math.max(0, Number(parsed.offset) || 0)
  } catch {
    return 0
  }
}

function encodeSearchCursor(offset) {
  return Buffer.from(JSON.stringify({ offset }), 'utf8').toString('base64url')
}

function frequencyMatches(value, filter) {
  if (filter == null || filter === '') return true
  const numeric = Number(value) || 0
  const text = String(filter).trim().toLocaleLowerCase('zh-CN')
  if (!text) return true
  if (/^\d+$/.test(text)) return numeric >= Number(text)
  const range = text.match(/^(\d+)\s*[-~]\s*(\d+)$/)
  if (range) return numeric >= Number(range[1]) && numeric <= Number(range[2])
  if (['high', '高', '热门', 'hot'].includes(text)) return numeric >= 4
  if (['medium', '中', '一般'].includes(text)) return numeric >= 2 && numeric < 4
  if (['low', '低', '冷门'].includes(text)) return numeric < 2
  return true
}

function safeJsonArray(value) {
  const parsed = parseJson(value, [])
  return Array.isArray(parsed) ? parsed.map((item) => String(item)) : []
}

function makeMatchSnippet(text, terms, maxLength = 180) {
  const source = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (!source) return ''
  const normalizedSource = normalizeSearchValue(source)
  const normalizedTerms = terms.map(normalizeSearchValue).filter(Boolean)
  let hit = -1
  let hitLength = 0
  for (const term of normalizedTerms) {
    const index = normalizedSource.indexOf(term)
    if (index >= 0 && (hit < 0 || index < hit)) {
      hit = index
      hitLength = term.length
    }
  }
  if (hit < 0) return source.slice(0, maxLength)
  const start = Math.max(0, hit - Math.floor((maxLength - hitLength) / 2))
  const end = Math.min(source.length, start + maxLength)
  return `${start > 0 ? '…' : ''}${source.slice(start, end)}${end < source.length ? '…' : ''}`
}

function scoreSearchRow(row, terms, phrase) {
  const title = normalizeSearchValue(row.title)
  const aliases = row.aliases.map(normalizeSearchValue).join(' ')
  const tags = row.tags.map(normalizeSearchValue).join(' ')
  const section = normalizeSearchValue(row.sectionTitle)
  const bank = normalizeSearchValue(row.bankTitle)
  const body = normalizeSearchValue(row.plainText)
  const exact = title === phrase
  let score = exact ? 10000 : 0
  if (title.startsWith(phrase)) score += 8000
  else if (title.includes(phrase)) score += 6000
  if (aliases.includes(phrase)) score += 5000
  if (tags.includes(phrase)) score += 4500
  if (section.includes(phrase)) score += 3000
  if (bank.includes(phrase)) score += 1800
  if (body.includes(phrase)) score += 800
  for (const term of terms) {
    if (title.includes(term)) score += 900
    else if (aliases.includes(term)) score += 700
    else if (tags.includes(term)) score += 600
    else if (section.includes(term)) score += 400
    else if (body.includes(term)) score += 100
  }
  // Frequency is only a tie-breaker; relevance always wins.
  score += Math.min(500, (Number(row.frequency) || 0) * 25)
  return score
}

function searchRows(db, { includePrivate = false } = {}) {
  const visibility = includePrivate ? '' : "AND b.visibility = 'public'"
  const questionColumns = new Set(db.pragma('table_info(questions)').map((item) => item.name))
  const optional = (name, fallback = 'NULL') => questionColumns.has(name) ? `q.${name}` : fallback
  return db.prepare(`
    SELECT q.id, q.bank_id AS library, q.display_number AS number, q.title,
      q.plain_text AS plainText, q.body_md AS body, q.section_id AS sectionId,
      s.title AS sectionTitle, b.title AS bankTitle, q.tags_json AS tagsJson,
      q.difficulty, q.read_minutes AS readMinutes, q.sort_order AS sortOrder,
      ${optional('track', "'project'")} AS track,
      ${optional('frequency', '0')} AS frequency,
      ${optional('aliases_json', "'[]'")} AS aliasesJson,
      ${optional('quality_score', 'NULL')} AS qualityScore,
      ${optional('quality_reviewed_at', 'NULL')} AS qualityReviewedAt
    FROM questions q
    JOIN question_banks b ON b.id = q.bank_id
    JOIN sections s ON s.id = q.section_id
    WHERE q.archived_at IS NULL AND b.archived_at IS NULL ${visibility}
  `).all().map((row) => ({
    ...row,
    tags: safeJsonArray(row.tagsJson),
    aliases: safeJsonArray(row.aliasesJson),
    plainText: row.plainText || plainText(row.body),
  }))
}

function ftsCandidates(db, query) {
  if (!hasSearchIndex(db) || /[\u3400-\u9fff]/u.test(String(query ?? ''))) return undefined
  const value = normalizeSearchValue(query)
  if (!value) return undefined
  try {
    const match = value.split(/\s+/).filter(Boolean).map((term) => `"${term.replaceAll('"', '""')}"*`).join(' AND ')
    const rows = db.prepare('SELECT question_id FROM question_search WHERE question_search MATCH ? LIMIT 5000').all(match)
    return new Set(rows.map((row) => row.question_id))
  } catch {
    return undefined
  }
}

/**
 * Search all visible banks. SQLite FTS5 is used as a candidate accelerator
 * when available, while the LIKE/normalised pass below guarantees Chinese
 * substring and alias matches (unicode61 treats a Han phrase as one token).
 */
export function searchCatalogPage(db, query, {
  includePrivate = false,
  limit = 30,
  cursor,
  track,
  tag,
  difficulty,
  frequency,
} = {}) {
  const phrase = normalizeSearchValue(query)
  if (!phrase) return { query: String(query ?? ''), results: [], nextCursor: null, hasMore: false }
  const terms = searchTerms(query)
  const candidates = ftsCandidates(db, query)
  const rows = searchRows(db, { includePrivate }).filter((row) => !candidates || candidates.size === 0 || candidates.has(row.id))
  const normalizedTag = normalizeSearchValue(tag)
  const filtered = rows.filter((row) => {
    if (track && String(row.track) !== String(track)) return false
    if (difficulty && String(row.difficulty) !== String(difficulty)) return false
    if (normalizedTag && !row.tags.some((item) => normalizeSearchValue(item).includes(normalizedTag))) return false
    if (!frequencyMatches(row.frequency, frequency)) return false
    const fields = [row.title, ...row.aliases, ...row.tags, row.sectionTitle, row.bankTitle, row.plainText]
      .map(normalizeSearchValue)
    // Every explicit whitespace term must be represented somewhere. For
    // Chinese n-grams this naturally becomes an OR-like phrase fallback.
    const explicitTerms = normalizeSearchValue(query).split(/\s+/).filter(Boolean)
    return explicitTerms.every((term) => fields.some((field) => field.includes(term)))
  }).map((row) => ({
    ...row,
    rank: scoreSearchRow(row, terms, phrase),
  })).sort((left, right) => right.rank - left.rank || left.sortOrder - right.sortOrder || left.id.localeCompare(right.id))

  const offset = decodeSearchCursor(cursor)
  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100)
  const page = filtered.slice(offset, offset + safeLimit)
  const nextOffset = offset + page.length
  const nextCursor = nextOffset < filtered.length ? encodeSearchCursor(nextOffset) : null
  const results = page.map((row) => ({
    id: row.id,
    library: row.library,
    bankTitle: row.bankTitle,
    number: row.number,
    title: row.title,
    plainText: row.plainText,
    sectionId: row.sectionId,
    sectionTitle: row.sectionTitle,
    tags: row.tags,
    difficulty: row.difficulty,
    frequency: Number(row.frequency) || 0,
    track: row.track,
    aliases: row.aliases,
    readMinutes: row.readMinutes,
    qualityScore: row.qualityScore == null ? undefined : Number(row.qualityScore),
    qualityReviewedAt: row.qualityReviewedAt ?? undefined,
    rank: row.rank,
    matchSnippet: makeMatchSnippet(row.plainText, terms),
    snippet: makeMatchSnippet(row.plainText, terms),
  }))
  return { query: String(query ?? ''), results, nextCursor, hasMore: Boolean(nextCursor), total: filtered.length }
}

/** Backwards-compatible array API used by the current reader client. */
export function searchCatalog(db, query, options = {}) {
  const page = searchCatalogPage(db, query, options)
  const results = page.results
  // Non-enumerable metadata lets newer callers opt into pagination without
  // changing the shape expected by existing clients and tests.
  Object.defineProperties(results, {
    nextCursor: { value: page.nextCursor, enumerable: false },
    hasMore: { value: page.hasMore, enumerable: false },
    total: { value: page.total, enumerable: false },
    query: { value: page.query, enumerable: false },
  })
  return results
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
  syncSearchIndexQuestion(db, id)
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
  syncSearchIndexQuestion(db, questionId)
  return { status: 'ok', version: current.version + 1 }
}

export function audit(db, req, action, entityType, entityId, metadata = {}) {
  db.prepare(`INSERT INTO audit_logs(id, actor_user_id, action, entity_type, entity_id, metadata_json, ip, created_at)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(crypto.randomUUID(), req.user?.id ?? null, action, entityType, entityId ?? null,
      JSON.stringify(metadata), req.ip ?? null, new Date().toISOString())
}
