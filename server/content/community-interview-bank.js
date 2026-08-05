import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { formatEnrichedBody, enrichmentTextLength } from './enrichments/format.js'
import { sourceKindForUrl } from './markdown.js'
import { visualForCommunityQuestion } from './community-visuals.js'

const currentFile = fileURLToPath(import.meta.url)
const projectRoot = path.resolve(path.dirname(currentFile), '../..')

const NON_TECHNICAL_TITLE = /(?:自我介绍|职业规划|为什么选择(?:我们|公司|岗位)|期望薪资|有什么要问|反问|能否实习|是否接受加班|手里.*offer)/i
const SOURCE_POLICIES = new Map([
  ['java-foundations', 'curated-guide'],
  ['java-backend-interviews', 'community-guide-official'],
  ['java-ai-applications', 'community-guide-official'],
])
const ALLOWED_SOURCE_KINDS = new Set(['community-interview', 'curated-guide', 'official'])
const JAVA_FOUNDATION_SOURCE_HOSTS = new Set(['docs.oracle.com', 'openjdk.org'])
const CURATED_GUIDE_SOURCE_HOSTS = new Set(['javaguide.cn', 'xiaolincoding.com', 'xiaolinnote.com'])
const JAVA_SPECIALIST_OFFICIAL_SOURCE_HOSTS = new Set([
  'cheatsheetseries.owasp.org',
  'datatracker.ietf.org',
  'dev.mysql.com',
  'developer.mozilla.org',
  'docs.langchain.com',
  'docs.langchain4j.dev',
  'docs.oracle.com',
  'docs.spring.io',
  'docs.temporal.io',
  'echarts.apache.org',
  'genai.owasp.org',
  'github.com',
  'html.spec.whatwg.org',
  'java2ai.com',
  'kafka.apache.org',
  'learn.microsoft.com',
  'milvus.io',
  'modelcontextprotocol.io',
  'openai.github.io',
  'openjdk.org',
  'opentelemetry.io',
  'platform.openai.com',
  'projectreactor.io',
  'react.dev',
  'redis.io',
  'rocketmq.apache.org',
  'www.elastic.co',
  'www.envoyproxy.io',
  'www.postgresql.org',
  'www.rfc-editor.org',
])
const JAVA_SPECIALIST_GITHUB_PATHS = [
  '/openjdk/jdk8u',
  '/pgvector/pgvector',
]

function questionList(bank) {
  return bank.sections.flatMap((section) => section.questions)
}

function prefixedSource(source) {
  const kind = source.kind ?? sourceKindForUrl(source.url)
  const prefix = kind === 'community-interview'
    ? '真实面经线索（题目已改写）'
    : kind === 'curated-guide'
      ? '高频题库参考（内容已重写）'
      : '技术校准'
  return { ...source, kind, label: `${prefix}：${source.label}` }
}

function hasAllowedHostname(value, allowedHosts) {
  try {
    const hostname = new URL(value).hostname.toLowerCase()
    return [...allowedHosts].some((host) => hostname === host || hostname.endsWith(`.${host}`))
  } catch {
    return false
  }
}

function isValidHttpsUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && Boolean(url.hostname)
  } catch {
    return false
  }
}

function isAllowedJavaSpecialistOfficialSource(value) {
  try {
    const url = new URL(value)
    const hostname = url.hostname.toLowerCase()
    if (!hasAllowedHostname(value, JAVA_SPECIALIST_OFFICIAL_SOURCE_HOSTS)) return false
    if (hostname.endsWith('.github.com')) return false
    if (hostname !== 'github.com') return true
    return JAVA_SPECIALIST_GITHUB_PATHS.some((prefix) => (
      url.pathname === prefix || url.pathname.startsWith(`${prefix}/`)
    ))
  } catch {
    return false
  }
}

function assertText(value, minimum, message) {
  if (enrichmentTextLength(value) < minimum) throw new Error(message)
}

export function assertCommunityInterviewBank(bank, { minimumQuestions = 24 } = {}) {
  if (!bank?.id || !bank?.title || !bank?.source || !Array.isArray(bank.sections)) {
    throw new Error('社区面经题库缺少必要元数据')
  }
  if (!/^public\/question-banks\/[a-z0-9-]+\.md$/.test(bank.source)) {
    throw new Error(`${bank.id}: source 必须位于 public/question-banks`)
  }
  const expectedPolicy = SOURCE_POLICIES.get(bank.id)
  if (expectedPolicy && bank.sourcePolicy !== expectedPolicy) {
    throw new Error(`${bank.id}: 来源策略必须为 ${expectedPolicy}`)
  }
  if (bank.sourcePolicy && bank.sourcePolicy !== expectedPolicy) {
    throw new Error(`${bank.id}: 未获准使用 ${bank.sourcePolicy} 来源策略`)
  }
  const questions = questionList(bank)
  if (questions.length < minimumQuestions) {
    throw new Error(`${bank.id}: 只有 ${questions.length} 题，至少需要 ${minimumQuestions} 题`)
  }

  const seenTitles = new Set()
  questions.forEach((question, index) => {
    const label = `${bank.id} Q${index + 1}`
    const normalizedTitle = question.title.replace(/[\s？?，,、：:；;（）()]/g, '').toLowerCase()
    if (!normalizedTitle || seenTitles.has(normalizedTitle)) throw new Error(`${label}: 标题为空或重复`)
    if (NON_TECHNICAL_TITLE.test(question.title)) throw new Error(`${label}: 不得收录非技术面试题`)
    seenTitles.add(normalizedTitle)

    assertText(question.summary, 28, `${label}: 短回答过短`)
    assertText(question.mechanism, 110, `${label}: 原理过短`)
    assertText(question.example, 55, `${label}: 场景过短`)
    if (!Array.isArray(question.followUps) || question.followUps.length < 2
      || question.followUps.some((item) => !item?.question || enrichmentTextLength(item.answer) < 24)) {
      throw new Error(`${label}: 至少需要两组具体追问`)
    }
    if (!Array.isArray(question.pitfalls) || question.pitfalls.length < 2
      || question.pitfalls.some((item) => enrichmentTextLength(item) < 12)) {
      throw new Error(`${label}: 至少需要两个具体易错点`)
    }
    const minimumSources = bank.sourcePolicy === 'community-guide-official' ? 3 : 2
    if (!Array.isArray(question.sources) || question.sources.length < minimumSources
      || question.sources.some((source) => !source?.label || !isValidHttpsUrl(source.url))) {
      throw new Error(`${label}: 来源不完整`)
    }
    const invalidKind = question.sources.find((source) => (
      !ALLOWED_SOURCE_KINDS.has(source.kind ?? sourceKindForUrl(source.url))
    ))
    if (invalidKind) throw new Error(`${label}: 来源类型无效`)
    const mismatchedSource = question.sources.find((source) => (
      source.kind && source.kind !== sourceKindForUrl(source.url)
    ))
    if (mismatchedSource) throw new Error(`${label}: 来源类型与域名不匹配`)
    const sourceKinds = new Set(question.sources.map((source) => source.kind ?? sourceKindForUrl(source.url)))
    if (!sourceKinds.has('official')) {
      throw new Error(`${label}: 必须包含官方技术来源`)
    }
    if (bank.sourcePolicy === 'curated-guide') {
      const invalidSource = question.sources.find((source) => {
        const kind = source.kind ?? sourceKindForUrl(source.url)
        if (kind === 'official') return !hasAllowedHostname(source.url, JAVA_FOUNDATION_SOURCE_HOSTS)
        if (kind === 'curated-guide') return !hasAllowedHostname(source.url, CURATED_GUIDE_SOURCE_HOSTS)
        return true
      })
      if (invalidSource) throw new Error(`${label}: Java 基础题只允许白名单教程与官方来源`)
      if (!sourceKinds.has('curated-guide')) throw new Error(`${label}: Java 基础题必须包含高频题库参考`)
    } else if (!sourceKinds.has('community-interview')) {
      throw new Error(`${label}: 面经题库必须同时包含真实面经线索和官方技术来源`)
    }
    if (bank.sourcePolicy === 'community-guide-official' && !sourceKinds.has('curated-guide')) {
      throw new Error(`${label}: Java 专项面经必须包含高频题库参考`)
    }
    if (bank.sourcePolicy === 'community-guide-official') {
      const invalidOfficial = question.sources.find((source) => {
        const kind = source.kind ?? sourceKindForUrl(source.url)
        return kind === 'official' && !isAllowedJavaSpecialistOfficialSource(source.url)
      })
      if (invalidOfficial) throw new Error(`${label}: Java 专项官方来源不在白名单域名`)
    }
    const invalidGuide = question.sources.find((source) => {
      const kind = source.kind ?? sourceKindForUrl(source.url)
      return kind === 'curated-guide' && !hasAllowedHostname(source.url, CURATED_GUIDE_SOURCE_HOSTS)
    })
    if (invalidGuide) throw new Error(`${label}: 高频题库参考不在白名单域名`)
  })
  return bank
}

function renderQuestion(bank, question, number, verifiedAt) {
  return [
    `## Q${number}：${question.title}`,
    '',
    formatEnrichedBody({
      ...question,
      visual: question.visual ?? visualForCommunityQuestion(bank.id, question.title),
      sources: question.sources.map(prefixedSource),
      verifiedAt,
    }),
    '',
  ]
}

export function generateCommunityInterviewBanks(banks, {
  outputRoot = projectRoot,
  verifiedAt = '2026-08-05',
} = {}) {
  const seenBankIds = new Set()
  const seenTitles = new Map()
  const results = []

  for (const bank of banks) {
    assertCommunityInterviewBank(bank)
    if (seenBankIds.has(bank.id)) throw new Error(`重复题库 ID: ${bank.id}`)
    seenBankIds.add(bank.id)

    const lines = [`# ${bank.title}`, '']
    let number = 1
    for (const section of bank.sections) {
      if (!section.title || !section.questions?.length) throw new Error(`${bank.id}: 章节为空`)
      lines.push(`# ${section.title}`, '')
      for (const question of section.questions) {
        const normalized = question.title.replace(/[\s？?，,、：:；;（）()]/g, '').toLowerCase()
        if (seenTitles.has(normalized)) {
          throw new Error(`${bank.id}: 与 ${seenTitles.get(normalized)} 重复题目：${question.title}`)
        }
        seenTitles.set(normalized, `${bank.id} Q${number}`)
        lines.push(...renderQuestion(bank, question, number, bank.verifiedAt ?? verifiedAt))
        number += 1
      }
    }

    const target = path.join(outputRoot, bank.source)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, `${lines.join('\n').trim()}\n`, 'utf8')
    results.push({ id: bank.id, count: number - 1, target })
  }
  return results
}

function uniqueSourcesByKind(banks, expectedKind) {
  const sources = new Map()
  for (const bank of banks) {
    for (const question of questionList(bank)) {
      for (const source of question.sources) {
        if ((source.kind ?? sourceKindForUrl(source.url)) !== expectedKind) continue
        const item = sources.get(source.url) ?? { label: source.label, url: source.url, banks: new Set(), uses: 0 }
        item.banks.add(bank.id)
        item.uses += 1
        sources.set(source.url, item)
      }
    }
  }
  return [...sources.values()].map((source) => ({
    ...source,
    banks: [...source.banks].sort(),
  })).sort((a, b) => a.url.localeCompare(b.url))
}

export function uniqueCommunitySources(banks) {
  return uniqueSourcesByKind(banks, 'community-interview')
}

function platformForUrl(value) {
  const hostname = new URL(value).hostname.replace(/^www\./, '')
  if (hostname.endsWith('nowcoder.com')) return '牛客'
  if (hostname.endsWith('maimai.cn')) return '脉脉'
  if (hostname.endsWith('xiaohongshu.com')) return '小红书'
  return hostname
}

export function renderCommunitySourceAudit(banks, { verifiedAt = '2026-08-05' } = {}) {
  const sources = uniqueCommunitySources(banks)
  const curatedGuides = uniqueSourcesByKind(banks, 'curated-guide')
  const lines = [
    '# 社区真实面经来源审计',
    '',
    `校验日期：${verifiedAt}`,
    '',
    '> 社区帖子只用于确认“有人报告面试中出现过哪些技术主题”。题库答案不复用帖子回答，技术结论另由官方规范或项目文档校准。题目均已重新组织和改写，未复制面经正文。',
    '',
    `当前共收录 ${sources.length} 个可公开访问的面经页面。受登录墙或搜索屏蔽影响、无法读取正文的页面不进入题目来源。`,
    '',
    '> 小红书平台笔记在本次校验环境中无法稳定公开读取，因此没有把搜索摘要或登录后页面冒充可核验来源；题库中“小红书”相关条目来自牛客公开发布的小红书岗位面试复盘。',
    '',
    '| 平台 | 来源 | 使用题库 | 关联题数 |',
    '| --- | --- | --- | ---: |',
  ]
  for (const source of sources) {
    lines.push(`| ${platformForUrl(source.url)} | [${source.label.replace(/\|/g, '\\|')}](${source.url}) | ${source.banks.join('、')} | ${source.uses} |`)
  }
  lines.push('', '## Java 高频题库参考', '',
    '> JavaGuide 与小林 Coding 只用于筛选高频主题和组织复习顺序；题目与答案均重新撰写，技术结论继续由官方规范或项目文档校准。', '',
    '| 参考站点 | 使用题库 | 关联题数 |',
    '| --- | --- | ---: |')
  for (const source of curatedGuides) {
    lines.push(`| [${source.label.replace(/\|/g, '\\|')}](${source.url}) | ${source.banks.join('、')} | ${source.uses} |`)
  }
  lines.push('', '## 质量规则', '',
    '- 过滤自我介绍、职业规划、薪资、反问等非技术内容。',
    '- 同一问题只保留一个中性、可验证的版本，避免把公司隐私或作者项目数据照搬进题库。',
    '- 本审计表覆盖的社区面经题每题至少包含一个面经来源和一个官方技术来源；三个 Java 专项题库还要求 JavaGuide 或小林 Coding 高频参考，Java 基础题同时限制官方校准域名。',
    '- 社区作者给出的答案不视为标准答案；涉及版本差异时以题目中标注的官方文档为准。',
    '')
  return lines.join('\n')
}
