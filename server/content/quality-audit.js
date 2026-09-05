import { auditQuestionExample } from './example-quality.js'
import { isConclusionOnlyDecisionAnswer } from './answer-quality.js'

// Content is audited from rendered Markdown instead of a hand-maintained
// flag. The same checks therefore work for imports and editor-created rows.
const SECTION_PATTERNS = {
  answer: /^(?:#{1,6}\s*)?(?:\*\*)?(?:先背答案|短回答|题解)(?:[：:])?(?:\*\*)?\s*(.*)$/i,
  glossary: /^(?:#{1,6}\s*)?(?:\*\*)?关键词翻译(?:[：:])?(?:\*\*)?\s*(.*)$/i,
  mechanism: /^(?:#{1,6}\s*)?(?:\*\*)?(?:原理(?:\s*\/?\s*流程)?|机制拆解)(?:[：:])?(?:\*\*)?\s*(.*)$/i,
  practice: /^(?:#{1,6}\s*)?(?:\*\*)?(?:代码\s*\/?\s*场景|排查\s*\/?\s*场景|项目\s*\/?\s*场景|项目场景|项目落点)(?:[：:])?(?:\*\*)?\s*(.*)$/i,
  followups: /^(?:#{1,6}\s*)?(?:\*\*)?(?:继续追问|递进追问)(?:[：:])?(?:\*\*)?\s*(.*)$/i,
  pitfalls: /^(?:#{1,6}\s*)?(?:\*\*)?易错点(?:[：:])?(?:\*\*)?\s*(.*)$/i,
  sources: /^(?:#{1,6}\s*)?(?:\*\*)?参考来源(?:[：:])?(?:\*\*)?\s*(.*)$/i,
}

const TRIGGER_SIGNALS = /因为|由于|当[^。；;\n]{0,36}(?:时|后)|如果|若|一旦|收到|读取|写入|输入|请求|修改|变化|触发|前提|条件/
const MECHANISM_SIGNALS = /通过|先[^。；;\n]{0,36}(?:再|后)|根据|拦截|记录|查找|比较|队列|索引|解析|转换|调用|执行|建立|过滤|排序|合并|重排|缓存|编码|解码|收集|通知/
const RESULT_SIGNALS = /因此|所以|从而|导致|结果|最终|避免|得到|返回|更新|失败|成功|不会|才能|保证|说明/

function textOnly(value) {
  return String(value ?? '')
    .replace(/(```|~~~)[\s\S]*?\1/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\*_>#|`~\[\](){}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseSections(markdown) {
  const source = String(markdown ?? '').replace(/\r\n?/g, '\n')
  const sections = Object.fromEntries(Object.keys(SECTION_PATTERNS).map((key) => [key, '']))
  let current = null
  for (const line of source.split('\n')) {
    const trimmed = line.trim()
    let matched = false
    for (const [key, pattern] of Object.entries(SECTION_PATTERNS)) {
      const candidate = trimmed.match(pattern)
      if (!candidate) continue
      current = key
      if (candidate[1]) sections[key] += `${candidate[1]}\n`
      matched = true
      break
    }
    if (!matched && current) sections[current] += `${line}\n`
  }
  return Object.fromEntries(Object.entries(sections).map(([key, value]) => [key, value.trim()]))
}

function extractConclusion(answer) {
  const match = String(answer ?? '').match(/(?:^|\n)\s*[-*+]?\s*\*\*结论[：:]\*\*\s*([^\n]+)/i)
  return textOnly(match?.[1] ?? '')
}

function causalChain(value) {
  const text = textOnly(value)
  return {
    trigger: TRIGGER_SIGNALS.test(text),
    mechanism: MECHANISM_SIGNALS.test(text),
    result: RESULT_SIGNALS.test(text),
  }
}

function splitParagraphs(markdown) {
  const source = String(markdown ?? '').replace(/\r\n?/g, '\n')
  const paragraphs = []
  let inFence = false
  let buffer = []
  const flush = () => {
    const value = textOnly(buffer.join('\n'))
    if (value) paragraphs.push(value)
    buffer = []
  }
  for (const line of source.split('\n')) {
    if (/^\s*(?:```|~~~)/.test(line)) {
      flush()
      inFence = !inFence
      continue
    }
    if (inFence) continue
    if (!line.trim()) flush()
    else if (/^\s*!\[[^\]]*\]\([^)]*\)\s*$/.test(line)) flush()
    else buffer.push(line)
  }
  flush()
  return paragraphs
}

function fencedCode(markdown) {
  return /(?:^|\n)\s*(?:```|~~~)/.test(String(markdown ?? ''))
}

function hasConcreteExample(markdown, sections) {
  return Boolean(
    sections.practice
    || /\*\*示例场景[：:]/.test(String(markdown ?? ''))
    || fencedCode(markdown)
    || /(?:输入|输出|前提|过程|结果|点击|请求|响应|运行)/.test(textOnly(markdown)),
  )
}

function sourceCountOf(question) {
  if (Array.isArray(question.sources)) return question.sources.length
  if (Number.isFinite(Number(question.sourceCount))) return Number(question.sourceCount)
  return 0
}

function firstAbbreviationIssues(markdown, title) {
  // Do not inspect code fences/inline code: language identifiers and variable
  // names are not learner-facing abbreviations. Question numbers (Q1) are
  // labels, not terms that need expansion.
  const source = `${String(title ?? '')}\n${String(markdown ?? '')}`
    .replace(/(```|~~~)[\s\S]*?\1/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
  const issues = []
  // Keep the check focused on less-common acronyms; ubiquitous protocol
  // words are generally explained by the neighbouring glossary already.
  const ignored = new Set(['API', 'HTTP', 'HTTPS', 'URL', 'JSON', 'HTML', 'CSS', 'DOM', 'SQL', 'TCP', 'UDP', 'SSE', 'UI', 'UX', 'CPU', 'GPU', 'JVM', 'GC', 'SDK', 'CLI', 'OS', 'ID', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'TLS', 'DNS', 'JWT', 'RAG', 'AI', 'MCP', 'BM25', 'RRF', 'ACL', 'PDF', 'SSR', 'CSR', 'SPA', 'CORS', 'CDN', 'CI', 'CD', 'NMT', 'SLO', 'TTL', 'QPS', 'MQTT', 'BLE', 'GATT', 'MTU', 'ATT', 'SSID', 'ACK', 'UUID', 'CRC', 'PDU', 'NDC', 'RAF', 'FCP', 'MMR', 'MVP', 'CRUD', 'RBAC', 'CSRF', 'XSS', 'SEO', 'JS', 'TS', 'ES', 'SVG', 'IEEE', 'OSI', 'IP', 'ERR', 'HEAD', 'DONE', 'DRAFT', 'REJECT', 'REJECTED', 'APPROVING', 'SELECT', 'UPDATE', 'UNIQUE', 'WHERE', 'JOIN', 'EXPLAIN', 'ANALYZE', 'PAID', 'DIV', 'OPTIONS', 'SUBMITTED', 'DEGRADED', 'SCXML', 'STEMM', 'SRM', 'NDC', 'US', 'TR', 'API'] )
  const seen = new Set()
  for (const match of source.matchAll(/\b[A-Z]{2,8}\b/g)) {
    const acronym = match[0]
    if (/^Q\d+$/i.test(acronym) || /\d/.test(acronym) || ignored.has(acronym) || seen.has(acronym)) continue
    seen.add(acronym)
    const before = source.slice(Math.max(0, match.index - 55), match.index)
    const after = source.slice(match.index, match.index + acronym.length + 55)
    const glossaryExplains = new RegExp(`(?:\\*\\*)?${acronym.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}(?:\\s*[:：])`, 'i').test(source)
    const proseExplains = /[\u4e00-\u9fff](?:指|表示|即|是|一种|全称|简称|代表)\s*$/.test(before)
    if (!glossaryExplains && !/[（(][^）)]{1,24}[）)]/.test(after) && !proseExplains) {
      issues.push({ acronym, message: `首次出现 ${acronym} 时缺少中文解释` })
    }
  }
  return issues
}

function makeIssue(code, message, extra = {}, severity = 'error') {
  return { code, message, severity, ...extra }
}

/** Audit one question against the publishing contract. */
export function auditQuestionForPublish(question = {}, { strict = false } = {}) {
  const id = question.id
  const bankId = question.bankId ?? question.bank_id
  const title = String(question.title ?? '').trim()
  const body = String(question.body ?? question.body_md ?? '')
  const sections = parseSections(body)
  const sourceCount = sourceCountOf(question)
  const problems = []

  if (!title || !body.trim()) problems.push(makeIssue('EMPTY_CONTENT', '题目标题和正文不能为空'))
  const visibleLength = textOnly(body).length
  if (visibleLength < 620) problems.push(makeIssue('BODY_TOO_SHORT', '正文少于 620 个非空白字符', { bodyLength: visibleLength }))
  if (!sections.answer) problems.push(makeIssue('MISSING_ANSWER', '缺少“短回答”区块'))
  if (!sections.mechanism) problems.push(makeIssue('MISSING_MECHANISM', '缺少“原理 / 流程”区块'))
  if (!sections.practice || !hasConcreteExample(body, sections)) problems.push(makeIssue('MISSING_EXAMPLE', '缺少可复现的代码或真实场景'))
  if (!sections.followups) problems.push(makeIssue('MISSING_FOLLOWUP', '缺少面试官递进追问'))
  if (!sections.pitfalls) problems.push(makeIssue('MISSING_PITFALL', '缺少边界、坑点或反例'))
  if (!sections.sources || sourceCount < 1) problems.push(makeIssue('MISSING_SOURCE', '缺少可核验的参考来源', { sourceCount }))

  const rationaleText = `${sections.answer}\n${sections.mechanism}`
  const chain = causalChain(rationaleText)
  if (!sections.answer || !/(?:为什么|原理|因为|由于|触发|机制)/.test(rationaleText)) {
    problems.push(makeIssue('MISSING_WHY', '答案没有明确说明为什么'))
  } else {
    const missing = Object.entries(chain).filter(([, present]) => !present).map(([name]) => name)
    if (missing.length) problems.push(makeIssue('INCOMPLETE_CAUSAL_CHAIN', `因果链缺少：${missing.join('、')}`, { missing }))
  }

  if (isConclusionOnlyDecisionAnswer(title, sections.answer)) {
    problems.push(makeIssue('CONCLUSION_ONLY_ANSWER', '选择题答案只有结论，没有说明触发条件、工作机制和结果'))
  }

  const conclusion = extractConclusion(sections.answer)
  if (conclusion && (conclusion.length < 40 || conclusion.length > 120)) {
    problems.push(makeIssue('CONCLUSION_LENGTH', `结论建议控制在 40–120 字（当前 ${conclusion.length} 字）`, { length: conclusion.length }, 'warning'))
  }

  const paragraphs = splitParagraphs(body)
  paragraphs.forEach((paragraph) => {
    if (paragraph.length > 280) problems.push(makeIssue('LONG_PARAGRAPH', `段落超过 280 字（${paragraph.length} 字），建议拆成列表`, { length: paragraph.length }, 'warning'))
    if (paragraph.length > 400) problems.push(makeIssue('PARAGRAPH_NEEDS_SPLIT', `段落超过 400 字，必须拆分（${paragraph.length} 字）`, { length: paragraph.length }))
  })

  // Audit the learner-facing introduction only. Code constants, long
  // mechanism prose, follow-up samples and source URLs are not useful
  // abbreviation evidence; the first ~600 visible characters are enough to
  // catch a jargon term before its glossary appears.
  const learnerIntroduction = `${sections.answer}\n${sections.mechanism}`.slice(0, 1_200)
  for (const abbreviation of firstAbbreviationIssues(learnerIntroduction, title)) {
    problems.push(makeIssue('MISSING_ABBREVIATION_EXPLANATION', abbreviation.message, { acronym: abbreviation.acronym }, 'warning'))
  }

  // Preserve diagnostics from the stricter example checker for code comments,
  // concrete inputs and expected results.
  for (const exampleProblem of auditQuestionExample({ id, bankId, title, body })) {
    problems.push(makeIssue(`EXAMPLE_${String(exampleProblem.code).toUpperCase().replace(/-/g, '_')}`, exampleProblem.message, { sourceCode: exampleProblem.code }))
  }

  const errorCount = problems.filter((item) => item.severity !== 'warning').length
  const warningCount = problems.length - errorCount
  const score = Math.max(0, Math.min(100, 100 - errorCount * 10 - warningCount * 2))
  return {
    id,
    bankId,
    title,
    score,
    passed: errorCount === 0,
    strictPassed: strict ? errorCount === 0 : true,
    metrics: {
      bodyLength: visibleLength,
      sourceCount,
      sections: Object.fromEntries(Object.entries(sections).map(([key, value]) => [key, Boolean(value)])),
      causalChain: chain,
      paragraphsOver280: paragraphs.filter((paragraph) => paragraph.length > 280).length,
      paragraphsOver400: paragraphs.filter((paragraph) => paragraph.length > 400).length,
    },
    issues: problems,
  }
}

export function auditContentQuality(db) {
  const active = db.prepare(`SELECT q.id, q.bank_id AS bankId, q.title, q.body_md AS body,
    length(q.body_md) AS bodyLength,
    (SELECT count(*) FROM source_refs s WHERE s.question_id=q.id) AS sourceCount
    FROM questions q JOIN question_banks b ON b.id=q.bank_id
    WHERE q.archived_at IS NULL AND b.archived_at IS NULL`).all()
  const audits = active.map((question) => auditQuestionForPublish(question))
  const issues = audits.flatMap((audit) => audit.issues.map((item) => ({
    id: audit.id,
    bankId: audit.bankId,
    title: audit.title,
    ...item,
  })))
  const errors = issues.filter((item) => item.severity !== 'warning')
  const warnings = issues.filter((item) => item.severity === 'warning')
  const byCode = {}
  for (const item of issues) byCode[item.code] = (byCode[item.code] ?? 0) + 1
  const banks = db.prepare("SELECT count(*) AS n FROM question_banks WHERE archived_at IS NULL").get().n
  return {
    generatedAt: new Date().toISOString(),
    totals: {
      banks,
      questions: active.length,
      passed: audits.filter((audit) => audit.passed).length,
      needsReview: new Set(errors.map((item) => item.id)).size,
      warnings: new Set(warnings.map((item) => item.id)).size,
    },
    issueCount: issues.length,
    blockingIssueCount: errors.length,
    warningCount: warnings.length,
    byCode,
    questions: audits.map(({ id, bankId, title, score, passed, metrics, issues: questionIssues }) => ({
      id, bankId, title, score, passed, metrics, issueCount: questionIssues.length,
    })),
    issues: issues.slice(0, 2_000),
    issuesTruncated: Math.max(0, issues.length - 2_000),
  }
}

export { parseSections, causalChain }
