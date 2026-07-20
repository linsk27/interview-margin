import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createDatabase } from '../database.js'
import { listCatalog } from '../repository.js'

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
    plainText: question.plainText,
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

function deterministicPublicCatalog(catalog) {
  return {
    banks: catalog.banks.map((bank) => ({
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
    })),
    sections: catalog.sections.map((section) => ({
      id: section.id,
      title: section.title,
      order: section.order,
      questions: section.questions.map(publicQuestion),
    })),
  }
}

/**
 * Builds the same public, active catalog served to anonymous visitors without
 * ever opening the production database. The seeded in-memory database is
 * always closed before the catalog is returned.
 */
export function buildPublicCatalog({ rootDir = projectRoot } = {}) {
  const { db } = createDatabase({
    filename: ':memory:',
    rootDir,
    bootstrap: false,
  })

  try {
    return deterministicPublicCatalog(listCatalog(db, {
      includeArchived: false,
      includePrivate: false,
    }))
  } finally {
    db.close()
  }
}

/**
 * Writes a deterministic JSON snapshot suitable for static/offline hosting.
 */
export function exportPublicCatalog({
  rootDir = projectRoot,
  outputPath = path.join(rootDir, 'public/catalog.json'),
} = {}) {
  const catalog = buildPublicCatalog({ rootDir })
  const resolvedOutput = path.resolve(outputPath)
  fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true })
  fs.writeFileSync(resolvedOutput, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8')

  return {
    outputPath: resolvedOutput,
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
