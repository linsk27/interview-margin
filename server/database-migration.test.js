// @vitest-environment node

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { createDatabase } from './database.js'

describe('seed question identity migration', () => {
  let database
  let rootDir

  afterEach(() => {
    database?.db.close()
    database = undefined
    if (rootDir) fs.rmSync(rootDir, { recursive: true, force: true })
    rootDir = undefined
  })

  it('replaces a published seed question with a new identity and remains rollback-compatible', () => {
    rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'interview-margin-java-v2-'))
    const sourceDir = path.join(rootDir, 'public', 'question-banks')
    const filename = path.join(rootDir, 'data', 'interview.db')
    fs.mkdirSync(sourceDir, { recursive: true })
    fs.copyFileSync(
      path.resolve('public/question-banks/java-foundations.md'),
      path.join(sourceDir, 'java-foundations.md'),
    )

    database = createDatabase({
      rootDir,
      filename,
      seed: false,
      bootstrap: {
        username: 'migration-admin',
        password: 'MigrationAdminPassword!123',
        skipCredentialFile: true,
      },
    })
    const userId = database.db.prepare("SELECT id FROM users WHERE username = 'migration-admin'").get().id
    const now = new Date().toISOString()

    // Recreate the production state from immediately before migration v4.
    database.db.exec(`
      DROP TRIGGER retire_seed_question_number_before_insert;
      DROP TRIGGER retire_seed_question_number_before_update;
      DELETE FROM schema_migrations WHERE version = 4;
    `)
    database.db.prepare(`
      INSERT INTO question_banks(
        id, title, short_title, kicker, category, description, sort_order, created_at, updated_at
      ) VALUES('java-foundations', 'legacy', 'legacy', 'legacy', 'legacy', 'legacy', 0, ?, ?)
    `).run(now, now)
    database.db.prepare(`
      INSERT INTO sections(id, bank_id, title, sort_order)
      VALUES('java-foundations:legacy', 'java-foundations', 'legacy', 0)
    `).run()
    database.db.prepare(`
      INSERT INTO questions(
        id, bank_id, section_id, display_number, title, body_md, plain_text,
        sort_order, provenance, created_at, updated_at
      ) VALUES(
        'legacy-java-q1', 'java-foundations', 'java-foundations:legacy', '1',
        'legacy title', 'legacy body', 'legacy body', 0, 'seed', ?, ?
      )
    `).run(now, now)
    database.db.prepare(`
      INSERT INTO progress(user_id, question_id, status, note, updated_at)
      VALUES(?, 'legacy-java-q1', 'learning', 'legacy progress', ?)
    `).run(userId, now)
    database.db.close()
    database = undefined

    database = createDatabase({ rootDir, filename, bootstrap: false })
    const replacement = database.db.prepare(`
      SELECT id FROM questions
      WHERE bank_id = 'java-foundations' AND display_number = '1' AND archived_at IS NULL
    `).get()
    expect(replacement.id).not.toBe('legacy-java-q1')
    expect(database.db.prepare(`
      SELECT display_number, archived_at FROM questions WHERE id = 'legacy-java-q1'
    `).get()).toEqual({
      display_number: 'archived:legacy-java-q1',
      archived_at: expect.any(String),
    })
    expect(database.db.prepare(`
      SELECT note FROM progress WHERE user_id = ? AND question_id = 'legacy-java-q1'
    `).get(userId).note).toBe('legacy progress')

    // Match the old release's INSERT ... ON CONFLICT(id) path, not only a direct UPDATE.
    database.db.prepare(`
      INSERT INTO questions(
        id, bank_id, section_id, display_number, title, body_md, plain_text,
        sort_order, provenance, created_at, updated_at
      ) VALUES(
        'legacy-java-q1', 'java-foundations', 'java-foundations:legacy', '1',
        'legacy title', 'legacy body', 'legacy body', 0, 'seed', ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        bank_id=excluded.bank_id, section_id=excluded.section_id,
        display_number=excluded.display_number, title=excluded.title,
        body_md=excluded.body_md, plain_text=excluded.plain_text,
        archived_at=NULL, updated_at=excluded.updated_at
    `).run(now, new Date().toISOString())
    expect(database.db.prepare(`
      SELECT id FROM questions
      WHERE bank_id = 'java-foundations' AND display_number = '1' AND archived_at IS NULL
    `).get().id).toBe('legacy-java-q1')
    expect(database.db.prepare('SELECT display_number, archived_at FROM questions WHERE id = ?')
      .get(replacement.id)).toEqual({
      display_number: `archived:${replacement.id}`,
      archived_at: expect.any(String),
    })

    database.db.close()
    database = undefined
    database = createDatabase({ rootDir, filename, bootstrap: false })
    expect(database.db.prepare(`
      SELECT id FROM questions
      WHERE bank_id = 'java-foundations' AND display_number = '1' AND archived_at IS NULL
    `).get().id).toBe(replacement.id)
    expect(database.db.prepare(`
      SELECT note FROM progress WHERE user_id = ? AND question_id = 'legacy-java-q1'
    `).get(userId).note).toBe('legacy progress')
  })
})
