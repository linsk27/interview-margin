// @vitest-environment node

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
})
