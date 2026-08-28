// @vitest-environment node

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  buildPublicBankCatalog, buildPublicCatalog, buildPublicCatalogIndex, exportPublicCatalog,
} from './export-public-catalog.js'

const temporaryDirectories = []

function temporaryDirectory() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'interview-public-catalog-'))
  temporaryDirectories.push(directory)
  return directory
}

function objectKeys(value, result = new Set()) {
  if (Array.isArray(value)) {
    value.forEach((item) => objectKeys(item, result))
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => {
      result.add(key)
      objectKeys(item, result)
    })
  }
  return result
}

afterEach(() => {
  temporaryDirectories.splice(0).forEach((directory) => {
    fs.rmSync(directory, { recursive: true, force: true })
  })
})

describe('public catalog exporter', () => {
  it('exports exactly the public, active seeded catalog', () => {
    const catalog = buildPublicCatalog()
    const questions = catalog.sections.flatMap((section) => section.questions)

    expect(catalog.banks).toHaveLength(14)
    expect(questions).toHaveLength(762)
    expect(new Set(questions.map((question) => question.id)).size).toBe(762)
    expect(catalog.banks.map((bank) => bank.id)).toEqual([
      'interview', 'javascript', 'git-engineering', 'vue-core', 'react-core',
      'frontend-engineering', 'backend-fullstack', 'database-cache', 'network-deployment',
      'frontend-ai-interviews', 'java-foundations', 'java-backend-interviews', 'java-ai-applications',
      '360-ai-frontend',
    ])
    expect(catalog.banks.every((bank) => bank.visibility === 'public')).toBe(true)
    expect(catalog.sections.every((section) => section.questions.length > 0)).toBe(true)

    const keys = objectKeys(catalog)
    for (const privateKey of [
      'users', 'sessions', 'progress', 'annotations', 'activity', 'settings',
      'passwordHash', 'tokenHash', 'createdBy', 'archivedAt', 'verifiedAt',
      'plainText',
    ]) {
      expect(keys.has(privateKey), `unexpected private or volatile field: ${privateKey}`).toBe(false)
    }
  }, 20_000)

  it('builds a lightweight index and one plainText-free payload per bank', () => {
    const index = buildPublicCatalogIndex()
    expect(index.version).toBe(1)
    expect(index.banks).toHaveLength(14)
    expect(index.banks.reduce((total, bank) => total + bank.questionCount, 0)).toBe(762)
    const indexedQuestions = index.banks.flatMap((bank) => bank.sections.flatMap((section) => section.questions))
    expect(indexedQuestions).toHaveLength(762)
    expect(indexedQuestions.find((question) => question.id === 'js-q-100')).toMatchObject({ library: 'javascript' })
    expect(JSON.stringify(index)).not.toContain('plainText')
    expect(JSON.stringify(index)).not.toContain('"body"')

    const javascript = buildPublicBankCatalog('javascript')
    expect(javascript).toMatchObject({ version: 1, bank: { id: 'javascript' } })
    const questions = javascript.sections.flatMap((section) => section.questions)
    expect(questions).toHaveLength(index.banks.find((bank) => bank.id === 'javascript').questionCount)
    expect(questions.every((question) => typeof question.body === 'string')).toBe(true)
    expect(questions.every((question) => !Object.hasOwn(question, 'plainText'))).toBe(true)
  }, 40_000)

  it('writes byte-for-byte deterministic JSON and creates the destination directory', () => {
    const directory = temporaryDirectory()
    const first = path.join(directory, 'first', 'catalog.json')
    const second = path.join(directory, 'second', 'catalog.json')

    const firstResult = exportPublicCatalog({ outputPath: first })
    const secondResult = exportPublicCatalog({ outputPath: second })

    expect(firstResult).toMatchObject({ banks: 14, questions: 762, outputPath: first })
    expect(secondResult).toMatchObject({ banks: 14, questions: 762, outputPath: second })
    expect(firstResult.bankFiles).toHaveLength(14)
    expect(secondResult.bankFiles).toHaveLength(14)
    expect(fs.readFileSync(first, 'utf8')).toBe(fs.readFileSync(second, 'utf8'))
    expect(fs.readFileSync(firstResult.indexOutputPath, 'utf8'))
      .toBe(fs.readFileSync(secondResult.indexOutputPath, 'utf8'))
    for (const firstBankPath of firstResult.bankFiles) {
      const secondBankPath = path.join(secondResult.banksOutputDirectory, path.basename(firstBankPath))
      expect(fs.readFileSync(firstBankPath, 'utf8')).toBe(fs.readFileSync(secondBankPath, 'utf8'))
    }
    expect(JSON.parse(fs.readFileSync(first, 'utf8'))).toEqual(buildPublicCatalog())
  }, 60_000)
})
