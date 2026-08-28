import crypto from 'node:crypto'

function publicRequest(row) {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    contact: row.contact,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function createContactRequest(db, input) {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO contact_requests(id, kind, name, contact, message, created_at, updated_at)
    VALUES(?, ?, ?, ?, ?, ?, ?)
  `).run(id, input.kind, input.name, input.contact ?? '', input.message, now, now)
  return { id, createdAt: now }
}

export function listContactRequests(db, limit = 200) {
  // Resolved messages contain personal contact details; keep them only long
  // enough for a short follow-up window, then remove them automatically.
  db.prepare(`
    DELETE FROM contact_requests
    WHERE status = 'resolved'
      AND julianday(updated_at) < julianday('now', '-30 days')
  `).run()
  return db.prepare(`
    SELECT id, kind, name, contact, message, status, created_at, updated_at
    FROM contact_requests
    ORDER BY CASE status WHEN 'new' THEN 0 WHEN 'reviewing' THEN 1 ELSE 2 END,
      created_at DESC
    LIMIT ?
  `).all(limit).map(publicRequest)
}

export function updateContactRequest(db, id, status) {
  const now = new Date().toISOString()
  const result = db.prepare(`
    UPDATE contact_requests SET status = ?, updated_at = ? WHERE id = ?
  `).run(status, now, id)
  if (!result.changes) return undefined
  return publicRequest(db.prepare(`
    SELECT id, kind, name, contact, message, status, created_at, updated_at
    FROM contact_requests WHERE id = ?
  `).get(id))
}

export function deleteContactRequest(db, id) {
  return db.prepare('DELETE FROM contact_requests WHERE id = ?').run(id).changes > 0
}
