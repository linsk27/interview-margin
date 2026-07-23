import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import firstHalf from './enrichments/javascript-01-50.js'
import secondHalf from './enrichments/javascript-51-100.js'
import {
  assertEnrichmentEntries,
  formatEnrichedBody,
  normalizeQuestionTitle,
} from './enrichments/format.js'
import { visualForQuestion } from './enrichments/visuals.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '../..')

function parseHeading(line) {
  const match = line.match(/^##\s+Q(\d+)[：:]?\s*(.+?)\s*$/i)
  return match ? { number: Number(match[1]), title: match[2].trim() } : undefined
}

function extractSummary(blockLines, number) {
  const body = blockLines.join('\n')
  const match = body.match(/\*\*(?:题解|短回答)[：:]\*\*\s*([\s\S]*?)(?=\n\s*\*\*(?:原理|机制拆解|代码\s*\/\s*场景|递进追问|易错点|参考来源)[：:]\*\*|$)/)
  const summary = match?.[1]?.trim()
  if (!summary) throw new Error(`javascript Q${number}: 找不到原始题解`)
  return summary
}

function extractQuestionLead(blockLines, number) {
  const answerIndex = blockLines.findIndex((line) => /^\*\*答案[：:][^*]+\*\*/.test(line.trim()))
  if (answerIndex < 0) throw new Error(`javascript Q${number}: 找不到答案行`)
  return blockLines.slice(0, answerIndex + 1).join('\n').trim()
}

export function parseJavascriptQuestionInventory(source) {
  const lines = String(source).replace(/\r\n?/g, '\n').split('\n')
  const questions = []
  for (let index = 0; index < lines.length; index += 1) {
    const heading = parseHeading(lines[index])
    if (!heading) continue
    let end = index + 1
    while (end < lines.length && !/^#{1,2}\s+/.test(lines[end])) end += 1
    const blockLines = lines.slice(index + 1, end)
    questions.push({
      ...heading,
      heading: lines[index].trim(),
      lead: extractQuestionLead(blockLines, heading.number),
      summary: extractSummary(blockLines, heading.number),
    })
    index = end - 1
  }
  return questions
}

export function enrichJavascriptMarkdown(source) {
  const sourceText = String(source)
  const newline = sourceText.includes('\r\n') ? '\r\n' : '\n'
  const inventory = parseJavascriptQuestionInventory(sourceText)
  if (inventory.length !== 100) throw new Error(`javascript: 找到 ${inventory.length} 题，预期 100 题`)
  inventory.forEach((question, index) => {
    if (question.number !== index + 1) throw new Error(`javascript: 题号在 Q${index + 1} 处不连续`)
  })

  const firstExpected = inventory.slice(0, 50)
  const secondExpected = inventory.slice(50)
  assertEnrichmentEntries(firstHalf, {
    bankId: 'javascript-01-50', expectedQuestions: firstExpected, firstNumber: 1,
  })
  assertEnrichmentEntries(secondHalf, {
    bankId: 'javascript-51-100', expectedQuestions: secondExpected, firstNumber: 51,
  })
  const byNumber = new Map([...firstHalf, ...secondHalf].map((entry) => [entry.number, entry]))

  const lines = sourceText.replace(/\r\n?/g, '\n').split('\n')
  const output = []
  for (let index = 0; index < lines.length;) {
    if (/^#\s+/.test(lines[index])) {
      output.push(lines[index].trim(), '')
      index += 1
      while (index < lines.length && !lines[index].trim()) index += 1
      continue
    }
    const heading = parseHeading(lines[index])
    if (!heading) {
      index += 1
      continue
    }
    let end = index + 1
    while (end < lines.length && !/^#{1,2}\s+/.test(lines[end])) end += 1
    const original = inventory[heading.number - 1]
    const enrichment = byNumber.get(heading.number)
    if (normalizeQuestionTitle(enrichment.title) !== normalizeQuestionTitle(heading.title)) {
      throw new Error(`javascript Q${heading.number}: enrichment 标题不匹配`)
    }
    const visual = visualForQuestion('javascript', heading.number) ?? enrichment.visual
    output.push(
      `## Q${heading.number}：${heading.title}`,
      '',
      original.lead,
      '',
      formatEnrichedBody({ ...enrichment, summary: original.summary, visual }),
      '',
    )
    index = end
  }
  return `${output.join('\n').trim().replace(/\n/g, newline)}${newline}`
}

export function enrichJavascriptBank(outputRoot = rootDir) {
  const target = path.join(outputRoot, 'public/javascript-100.md')
  const source = fs.readFileSync(target, 'utf8')
  const enriched = enrichJavascriptMarkdown(source)
  fs.writeFileSync(target, enriched, 'utf8')
  return { id: 'javascript', count: 100, target }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(enrichJavascriptBank(), null, 2))
}
