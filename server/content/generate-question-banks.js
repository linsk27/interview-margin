import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { GENERATED_BANKS, generatedQuestionCount } from './question-data.js'
import { GENERATED_ENRICHMENTS } from './enrichments/index.js'
import { assertEnrichmentEntries, formatEnrichedBody } from './enrichments/format.js'
import { visualForQuestion } from './enrichments/visuals.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '../..')

function questionsForBank(bank) {
  return bank.sections.flatMap(([, questions]) => questions)
}

function bodyFor(bank, question, number, enrichment) {
  return formatEnrichedBody({
    ...enrichment,
    summary: question.answer,
    visual: visualForQuestion(bank.id, number) ?? enrichment.visual,
  })
}

export function generateQuestionBanks(outputRoot = rootDir) {
  const outputDir = path.join(outputRoot, 'public/question-banks')
  fs.mkdirSync(outputDir, { recursive: true })
  const result = []

  for (const bank of GENERATED_BANKS) {
    const questions = questionsForBank(bank)
    const enrichments = GENERATED_ENRICHMENTS.get(bank.id)
    assertEnrichmentEntries(enrichments, {
      bankId: bank.id,
      expectedQuestions: questions,
      firstNumber: 1,
    })

    const lines = [`# ${bank.title}`, '']
    let number = 1
    for (const [sectionTitle, sectionQuestions] of bank.sections) {
      lines.push(`# ${sectionTitle}`, '')
      for (const question of sectionQuestions) {
        const enrichment = enrichments[number - 1]
        lines.push(
          `## Q${number}：${question.title}`,
          '',
          bodyFor(bank, question, number, enrichment),
          '',
        )
        number += 1
      }
    }
    const filename = path.basename(bank.source)
    const target = path.join(outputDir, filename)
    fs.writeFileSync(target, `${lines.join('\n').trim()}\n`, 'utf8')
    result.push({ id: bank.id, count: number - 1, target })
  }
  return result
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = generateQuestionBanks()
  console.log(JSON.stringify({ total: generatedQuestionCount(), banks: result }, null, 2))
}
