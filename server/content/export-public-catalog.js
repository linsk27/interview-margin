import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createDatabase } from '../database.js'
import { getBankCatalog, listCatalog, listCatalogIndex } from '../repository.js'
import { assert360PublicContentSafe } from './public-content-policy.js'

const currentFile = fileURLToPath(import.meta.url)
const projectRoot = path.resolve(path.dirname(currentFile), '../..')

function publicSource(source) {
  return {
    id: source.id,
    title: source.title,
    url: source.url,
    kind: source.kind,
  }
}

function publicQuestion(question) {
  return {
    id: question.id,
    library: question.library,
    number: question.number,
    title: question.title,
    body: question.body,
    sectionId: question.sectionId,
    sectionTitle: question.sectionTitle,
    tags: question.tags,
    difficulty: question.difficulty,
    readMinutes: question.readMinutes,
    order: question.order,
    version: question.version,
    provenance: question.provenance,
    sources: question.sources.map(publicSource),
  }
}

function publicQuestionMetadata(question) {
  return {
    id: question.id,
    library: question.library,
    number: question.number,
    title: question.title,
    sectionId: question.sectionId,
    sectionTitle: question.sectionTitle,
    tags: question.tags,
    difficulty: question.difficulty,
    readMinutes: question.readMinutes,
    order: question.order,
    version: question.version,
    provenance: question.provenance,
    sources: question.sources.map(publicSource),
  }
}

function publicBank(bank) {
  return {
    id: bank.id,
    title: bank.title,
    shortTitle: bank.shortTitle,
    kicker: bank.kicker,
    category: bank.category,
    description: bank.description,
    baseTags: bank.baseTags,
    tone: bank.tone,
    visibility: bank.visibility,
    sortOrder: bank.sortOrder,
    version: bank.version,
  }
}

function deterministicPublicCatalog(catalog) {
  return {
    banks: catalog.banks.map(publicBank),
    sections: catalog.sections.map((section) => ({
      id: section.id,
      title: section.title,
      order: section.order,
      questions: section.questions.map(publicQuestion),
    })),
  }
}

function deterministicPublicCatalogIndex(index) {
  return {
    version: 1,
    banks: index.banks.map((bank) => ({
      ...publicBank(bank),
      questionCount: bank.questionCount,
      sections: bank.sections.map((section) => ({
        id: section.id,
        title: section.title,
        order: section.order,
        questionCount: section.questionCount,
        questions: section.questions.map(publicQuestionMetadata),
      })),
    })),
  }
}

function deterministicPublicBankCatalog(catalog) {
  return {
    version: 1,
    bank: publicBank(catalog.bank),
    sections: catalog.sections.map((section) => ({
      id: section.id,
      title: section.title,
      order: section.order,
      questions: section.questions.map(publicQuestion),
    })),
  }
}

export function buildPublicCatalogArtifacts({ rootDir = projectRoot } = {}) {
  const { db } = createDatabase({
    filename: ':memory:',
    rootDir,
    bootstrap: false,
  })

  try {
    const catalog = deterministicPublicCatalog(listCatalog(db, {
      includeArchived: false,
      includePrivate: false,
      includePlainText: false,
    }))
    const index = deterministicPublicCatalogIndex(listCatalogIndex(db, {
      includeArchived: false,
      includePrivate: false,
    }))
    const banks = Object.fromEntries(index.banks.map((bank) => {
      const bankCatalog = getBankCatalog(db, bank.id, {
        includeArchived: false,
        includePrivate: false,
        includePlainText: false,
      })
      return [bank.id, deterministicPublicBankCatalog(bankCatalog)]
    }))
    const public360Content = catalog.sections
      .flatMap((section) => section.questions)
      .filter((question) => question.library === '360-ai-frontend')
      .map((question) => `${question.title}\n${question.body}`)
      .join('\n')
    assert360PublicContentSafe(public360Content, '360 AI 公共目录快照')
    return { catalog, index, banks }
  } finally {
    db.close()
  }
}

/**
 * Builds the same public, active catalog served to anonymous visitors without
 * ever opening the production database. The seeded in-memory database is
 * always closed before the catalog is returned.
 */
export function buildPublicCatalog({ rootDir = projectRoot } = {}) {
  return buildPublicCatalogArtifacts({ rootDir }).catalog
}

export function buildPublicCatalogIndex({ rootDir = projectRoot } = {}) {
  return buildPublicCatalogArtifacts({ rootDir }).index
}

export function buildPublicBankCatalog(bankId, { rootDir = projectRoot } = {}) {
  return buildPublicCatalogArtifacts({ rootDir }).banks[bankId]
}

/**
 * Writes a deterministic JSON snapshot suitable for static/offline hosting.
 */
export function exportPublicCatalog({
  rootDir = projectRoot,
  outputPath = path.join(rootDir, 'public/catalog.json'),
  indexOutputPath,
  banksOutputDirectory,
} = {}) {
  const { catalog, index, banks } = buildPublicCatalogArtifacts({ rootDir })
  const resolvedOutput = path.resolve(outputPath)
  const resolvedIndexOutput = path.resolve(indexOutputPath ?? path.join(path.dirname(resolvedOutput), 'catalog-index.json'))
  const resolvedBanksOutput = path.resolve(banksOutputDirectory ?? path.join(path.dirname(resolvedOutput), 'catalog-banks'))
  fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true })
  fs.mkdirSync(path.dirname(resolvedIndexOutput), { recursive: true })
  fs.mkdirSync(resolvedBanksOutput, { recursive: true })
  fs.writeFileSync(resolvedOutput, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8')
  fs.writeFileSync(resolvedIndexOutput, `${JSON.stringify(index, null, 2)}\n`, 'utf8')

  const bankFiles = Object.entries(banks).map(([bankId, bankCatalog]) => {
    const bankPath = path.join(resolvedBanksOutput, `${bankId}.json`)
    fs.writeFileSync(bankPath, `${JSON.stringify(bankCatalog, null, 2)}\n`, 'utf8')
    return bankPath
  })
  const expectedBankFiles = new Set(bankFiles.map((bankPath) => path.resolve(bankPath)))
  for (const name of fs.readdirSync(resolvedBanksOutput)) {
    const candidate = path.resolve(resolvedBanksOutput, name)
    if (name.endsWith('.json') && !expectedBankFiles.has(candidate)) fs.rmSync(candidate)
  }

  return {
    outputPath: resolvedOutput,
    indexOutputPath: resolvedIndexOutput,
    banksOutputDirectory: resolvedBanksOutput,
    bankFiles,
    banks: catalog.banks.length,
    sections: catalog.sections.length,
    questions: catalog.sections.reduce((total, section) => total + section.questions.length, 0),
  }
}

function cliOutputPath(args) {
  const outputIndex = args.findIndex((arg) => arg === '--output' || arg === '-o')
  if (outputIndex >= 0) {
    if (!args[outputIndex + 1]) throw new Error(`${args[outputIndex]} requires a path`)
    return path.resolve(process.cwd(), args[outputIndex + 1])
  }
  const positional = args.find((arg) => !arg.startsWith('-'))
  return positional ? path.resolve(process.cwd(), positional) : undefined
}

if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  const outputPath = cliOutputPath(process.argv.slice(2))
  const result = exportPublicCatalog({ outputPath })
  console.log(JSON.stringify(result, null, 2))
}
