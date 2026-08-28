// @vitest-environment node

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { verifyPassword } from './auth.js'
import { createDatabase } from './database.js'

describe('database bootstrap administrator', () => {
  let database

  afterEach(() => {
    database?.db.close()
    database = undefined
    vi.unstubAllEnvs()
  })

  it('falls through blank config values to non-blank environment values', () => {
    vi.stubEnv('BOOTSTRAP_ADMIN_USERNAME', 'environment-admin')
    vi.stubEnv('BOOTSTRAP_ADMIN_PASSWORD', 'EnvironmentPassword!123')

    database = createDatabase({
      filename: ':memory:',
      seed: false,
      bootstrap: { username: ' \t ', password: '\n', skipCredentialFile: true },
    })

    expect(database.bootstrap).toEqual({
      username: 'environment-admin',
      password: 'EnvironmentPassword!123',
    })
  })

  it('uses safe defaults when bootstrap environment values are blank', () => {
    vi.stubEnv('BOOTSTRAP_ADMIN_USERNAME', '   ')
    vi.stubEnv('BOOTSTRAP_ADMIN_PASSWORD', '\t\n')

    database = createDatabase({
      filename: ':memory:',
      seed: false,
      bootstrap: { skipCredentialFile: true },
    })

    expect(database.bootstrap.username).toBe('admin')
    expect(database.bootstrap.password).toMatch(/^[A-Za-z0-9_-]{12}!aA7$/)
    expect(database.bootstrap.password.trim()).not.toBe('')

    const user = database.db.prepare('SELECT username, password_hash FROM users').get()
    expect(user.username).toBe('admin')
    expect(verifyPassword(user.password_hash, database.bootstrap.password)).toBe(true)
    expect(verifyPassword(user.password_hash, '')).toBe(false)
  })

  it('installs the contact request migration exactly once', () => {
    database = createDatabase({ filename: ':memory:', seed: false, bootstrap: false })
    expect(database.db.prepare('SELECT version FROM schema_migrations ORDER BY version').all())
      .toEqual([{ version: 1 }, { version: 2 }, { version: 3 }, { version: 4 }, { version: 5 }])
    expect(database.db.pragma('table_info(contact_requests)').map((column) => column.name)).toEqual([
      'id', 'kind', 'name', 'contact', 'message', 'status', 'created_at', 'updated_at',
    ])
  })
})

describe('built-in question seed synchronization', () => {
  let database
  let rootDir

  const completeSource = [
    '# 旧基础题',
    '',
    '## Q1 会被暂时移除的题目',
    '',
    '第一题正文。',
    '',
    '## Q2 始终保留的题目',
    '',
    '第二题正文。',
    '',
  ].join('\n')

  const sourceWithoutQ1 = [
    '# 新基础题',
    '',
    '## Q2 始终保留的题目',
    '',
    '第二题正文。',
    '',
  ].join('\n')

  afterEach(() => {
    database?.db.close()
    database = undefined
    if (rootDir) fs.rmSync(rootDir, { recursive: true, force: true })
    rootDir = undefined
  })

  it('archives missing seed questions, preserves user data, and unarchives returning questions', () => {
    rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'interview-margin-seed-'))
    const sourcePath = path.join(rootDir, 'public', 'interview.md')
    const filename = path.join(rootDir, 'data', 'interview.db')
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
    fs.writeFileSync(sourcePath, completeSource, 'utf8')

    database = createDatabase({
      rootDir,
      filename,
      bootstrap: {
        username: 'seed-admin',
        password: 'SeedAdminPassword!123',
        skipCredentialFile: true,
      },
    })

    const userId = database.db.prepare('SELECT id FROM users WHERE username = ?').get('seed-admin').id
    const originalSection = database.db.prepare(
      "SELECT id FROM sections WHERE bank_id = 'interview' AND sort_order = 0",
    ).get()
    const now = new Date().toISOString()
    database.db.prepare(`
      INSERT INTO progress(user_id, question_id, status, note, updated_at)
      VALUES(?, 'q-1', 'learning', '保留这条学习记录', ?)
    `).run(userId, now)
    database.db.prepare(`
      INSERT INTO annotations(id, user_id, question_id, quote, note, color, created_at, updated_at)
      VALUES('annotation-1', ?, 'q-1', '第一题正文', '保留这条批注', 'yellow', ?, ?)
    `).run(userId, now, now)
    database.db.close()
    database = undefined

    fs.writeFileSync(sourcePath, sourceWithoutQ1, 'utf8')
    database = createDatabase({ rootDir, filename, bootstrap: false })

    const archivedQuestion = database.db.prepare(`
      SELECT id, archived_at FROM questions WHERE id = 'q-1'
    `).get()
    expect(archivedQuestion.id).toBe('q-1')
    expect(archivedQuestion.archived_at).toEqual(expect.any(String))
    expect(database.db.prepare(`
      SELECT archived_at FROM questions WHERE id = 'q-2'
    `).get().archived_at).toBeNull()
    expect(database.db.prepare(`
      SELECT id, title FROM sections WHERE bank_id = 'interview' AND sort_order = 0
    `).get()).toEqual({ id: originalSection.id, title: '新基础题' })
    expect(database.db.prepare(`
      SELECT note FROM progress WHERE user_id = ? AND question_id = 'q-1'
    `).get(userId).note).toBe('保留这条学习记录')
    expect(database.db.prepare(`
      SELECT note FROM annotations WHERE user_id = ? AND question_id = 'q-1'
    `).get(userId).note).toBe('保留这条批注')
    database.db.close()
    database = undefined

    fs.writeFileSync(sourcePath, completeSource, 'utf8')
    database = createDatabase({ rootDir, filename, bootstrap: false })

    expect(database.db.prepare(`
      SELECT archived_at FROM questions WHERE id = 'q-1'
    `).get().archived_at).toBeNull()
    expect(database.db.prepare(`
      SELECT note FROM progress WHERE user_id = ? AND question_id = 'q-1'
    `).get(userId).note).toBe('保留这条学习记录')
    expect(database.db.prepare(`
      SELECT note FROM annotations WHERE user_id = ? AND question_id = 'q-1'
    `).get(userId).note).toBe('保留这条批注')
  })
})
