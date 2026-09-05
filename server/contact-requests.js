import crypto from 'node:crypto'

function publicRequest(row) {
  if (!row) return undefined
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    contact: row.contact,
    message: row.message,
    status: row.status,
    questionId: row.question_id ?? undefined,
    pageContext: row.page_context ?? undefined,
    userId: row.user_id ?? undefined,
    invitationId: row.invitation_id ?? undefined,
    assignedTo: row.assigned_to ?? undefined,
    adminNote: row.admin_note ?? '',
    resolvedAt: row.resolved_at ?? undefined,
    updatedBy: row.updated_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function createContactRequest(db, input) {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO contact_requests(
      id, kind, name, contact, message, question_id, page_context, user_id,
      created_at, updated_at
    ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.kind,
    input.name,
    input.contact ?? '',
    input.message,
    input.questionId ?? null,
    input.pageContext ?? null,
    input.userId ?? null,
    now,
    now,
  )
  // Notification delivery is intentionally a no-op for this release.  Keeping
  // the adapter here lets a later email/QQ integration subscribe without
  // storing provider credentials in the request path.
  void notifyContactRequest({ id, ...input, createdAt: now })
  return { id, createdAt: now }
}

export async function notifyContactRequest(_request) {
  return { delivered: false, reason: 'notification adapter disabled' }
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
    SELECT id, kind, name, contact, message, status, question_id, page_context,
      user_id, invitation_id, assigned_to, admin_note, resolved_at, updated_by,
      created_at, updated_at
    FROM contact_requests
    ORDER BY CASE status WHEN 'new' THEN 0 WHEN 'reviewing' THEN 1 ELSE 2 END,
      created_at DESC
    LIMIT ?
  `).all(limit).map(publicRequest)
}

export function updateContactRequest(db, id, patch, actorUserId) {
  const now = new Date().toISOString()
  const current = db.prepare('SELECT * FROM contact_requests WHERE id = ?').get(id)
  if (!current) return undefined
  const data = typeof patch === 'string' ? { status: patch } : (patch ?? {})
  const status = data.status ?? current.status
  const resolvedAt = status === 'resolved'
    ? (current.resolved_at ?? now)
    : null
  const result = db.prepare(`
    UPDATE contact_requests
    SET status = ?, assigned_to = ?, admin_note = ?, invitation_id = ?,
      resolved_at = ?, updated_by = ?, updated_at = ?
    WHERE id = ?
  `).run(
    status,
    data.assignedTo === undefined ? current.assigned_to : (data.assignedTo || null),
    data.adminNote === undefined ? (current.admin_note ?? '') : (data.adminNote ?? ''),
    data.invitationId === undefined ? current.invitation_id : (data.invitationId || null),
    resolvedAt,
    actorUserId ?? current.updated_by ?? null,
    now,
    id,
  )
  if (!result.changes) return publicRequest(current)
  return publicRequest(db.prepare(`
    SELECT id, kind, name, contact, message, status, question_id, page_context,
      user_id, invitation_id, assigned_to, admin_note, resolved_at, updated_by,
      created_at, updated_at
    FROM contact_requests WHERE id = ?
  `).get(id))
}

export function linkContactRequestInvitation(db, id, invitationId, actorUserId) {
  return updateContactRequest(db, id, { invitationId }, actorUserId)
}

export function deleteContactRequest(db, id) {
  return db.prepare('DELETE FROM contact_requests WHERE id = ?').run(id).changes > 0
}
