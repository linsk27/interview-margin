import { isConclusionOnlyDecisionAnswer } from '../answer-quality.js'

const DEFAULT_VERIFIED_AT = '2026-07-20'

function countText(value) {
  return String(value ?? '')
    .replace(/```[\s\S]*?```/g, ' code ')
    .replace(/[`*_#[\]()]/g, '')
    .replace(/\s+/g, '')
    .length
}

export function normalizeQuestionTitle(value) {
  return String(value ?? '')
    .trim()
    .replace(/^Q\d+(?:\.\d+)*[：:]?\s*/i, '')
    .trim()
}

export function assertEnrichmentEntries(entries, {
  bankId,
  expectedQuestions,
  firstNumber = 1,
  minMechanismLength = 120,
  minExampleLength = 55,
} = {}) {
  if (!Array.isArray(entries)) throw new TypeError(`${bankId}: enrichment 必须是数组`)
  if (entries.length !== expectedQuestions.length) {
    throw new Error(`${bankId}: enrichment 数量 ${entries.length}，预期 ${expectedQuestions.length}`)
  }

  const seen = new Set()
  entries.forEach((entry, index) => {
    const expectedNumber = firstNumber + index
    const expected = expectedQuestions[index]
    if (entry.number !== expectedNumber) {
      throw new Error(`${bankId}: 第 ${index + 1} 项 number=${entry.number}，预期 ${expectedNumber}`)
    }
    if (seen.has(entry.number)) throw new Error(`${bankId}: 重复题号 ${entry.number}`)
    seen.add(entry.number)
    if (normalizeQuestionTitle(entry.title) !== normalizeQuestionTitle(expected.title)) {
      throw new Error(`${bankId} Q${entry.number}: 标题不一致：${entry.title} != ${expected.title}`)
    }
    if (countText(entry.mechanism) < minMechanismLength) {
      throw new Error(`${bankId} Q${entry.number}: mechanism 过短`)
    }
    if (countText(entry.example) < minExampleLength) {
      throw new Error(`${bankId} Q${entry.number}: example 过短`)
    }
    if (!Array.isArray(entry.followUps) || entry.followUps.length < 2
      || entry.followUps.some((item) => !item?.question || countText(item.answer) < 28)) {
      throw new Error(`${bankId} Q${entry.number}: 至少需要两组具体追问与回答`)
    }
    const conclusionOnlyFollowUp = entry.followUps.find((item) => (
      isConclusionOnlyDecisionAnswer(item.question, item.answer)
    ))
    if (conclusionOnlyFollowUp) {
      throw new Error(`${bankId} Q${entry.number}: 追问“${conclusionOnlyFollowUp.question}”只给结论，缺少原因或机制`)
    }
    if (!Array.isArray(entry.pitfalls) || entry.pitfalls.length < 2
      || entry.pitfalls.some((item) => countText(item) < 14)) {
      throw new Error(`${bankId} Q${entry.number}: 至少需要两个具体易错点`)
    }
    if (!Array.isArray(entry.sources) || entry.sources.length < 2
      || entry.sources.some((source) => !source?.label || !/^https:\/\//.test(source.url))) {
      throw new Error(`${bankId} Q${entry.number}: 至少需要两个 HTTPS 权威来源`)
    }
    if (entry.visual) {
      if (!entry.visual.alt?.trim() || !entry.visual.caption?.trim()
        || !/^\/content\/diagrams\/(?:[a-z0-9][a-z0-9-]*\/)*[a-z0-9][a-z0-9._-]*\.svg$/.test(entry.visual.src)) {
        throw new Error(`${bankId} Q${entry.number}: visual 必须是带 alt/caption 的站内 SVG`)
      }
    }
  })
  return entries
}

function renderFollowUps(followUps) {
  return followUps.map((item, index) => (
    `${index + 1}. **${item.question.trim()}**\n\n   ${item.answer.trim()}`
  )).join('\n\n')
}

function renderSources(sources, verifiedAt) {
  return sources.map((source) => `- [${source.label}](${source.url})`).join('\n')
    + `\n\n校验日期：${verifiedAt}`
}

export function formatEnrichedBody({
  summary,
  mechanism,
  example,
  followUps,
  pitfalls,
  sources,
  visual,
  verifiedAt = DEFAULT_VERIFIED_AT,
}) {
  const visualMarkdown = visual
    ? `\n\n![${visual.alt}](${visual.src} "${visual.caption}")`
    : ''
  return `**短回答：**

${summary.trim()}

**原理：**

${mechanism.trim()}${visualMarkdown}

**代码 / 场景：**

${example.trim()}

**递进追问：**

${renderFollowUps(followUps)}

**易错点：**

${pitfalls.map((item) => `- ${item.trim()}`).join('\n')}

**参考来源：**

${renderSources(sources, verifiedAt)}`
}

export function enrichmentTextLength(value) {
  return countText(value)
}
