const FENCED_EXAMPLE_RE = /~~~([^\n]*)\n([\s\S]*?)~~~/g

const LINE_COMMENT_LANGUAGES = new Set([
  'js', 'javascript', 'jsx', 'ts', 'typescript', 'tsx',
])
const HASH_COMMENT_LANGUAGES = new Set(['bash', 'sh', 'shell', 'yaml', 'yml'])
const MARKUP_COMMENT_LANGUAGES = new Set(['html', 'vue', 'xml'])
const BLOCK_COMMENT_LANGUAGES = new Set(['css', 'scss', 'less'])
const SQL_COMMENT_LANGUAGES = new Set(['sql'])

function plainText(value) {
  return String(value ?? '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*_>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function shorten(value, maxLength = 68) {
  const text = plainText(value)
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1).replace(/[，、；：,.\s]+$/u, '')}…`
}

function exampleFocus(example, title) {
  const lead = String(example).split(/\n\s*\n/)[0]
  return shorten(lead || `用最小场景验证“${title}”`)
}

function inlineComment(language, focus) {
  const lang = String(language).trim().toLowerCase()
  if (LINE_COMMENT_LANGUAGES.has(lang)) return `// 示例重点：${focus}`
  if (HASH_COMMENT_LANGUAGES.has(lang)) return `# 示例重点：${focus}`
  if (MARKUP_COMMENT_LANGUAGES.has(lang)) return `<!-- 示例重点：${focus} -->`
  if (BLOCK_COMMENT_LANGUAGES.has(lang)) return `/* 示例重点：${focus} */`
  if (SQL_COMMENT_LANGUAGES.has(lang)) return `-- 示例重点：${focus}`
  return undefined
}

function annotateFencedBlocks(example, title) {
  let blockNumber = 0
  return example.replace(FENCED_EXAMPLE_RE, (whole, language, body) => {
    blockNumber += 1
    const focus = exampleFocus(example, title)
    const numberedFocus = blockNumber > 1 ? `第 ${blockNumber} 段：${focus}` : focus
    const comment = inlineComment(language, numberedFocus)
    if (comment) {
      const cleanBody = body.replace(/^\n+/, '').replace(/\s+$/u, '')
      return `~~~${language}\n${comment}\n${cleanBody}\n~~~`
    }
    return `> 示例注解：${numberedFocus}\n\n${whole}`
  })
}

function labelExampleFlow(example) {
  const value = String(example).trim()
  const firstFence = value.indexOf('~~~')
  if (firstFence < 0) return `**示例场景：** ${value}`

  const lead = value.slice(0, firstFence).trim()
  const lastFence = value.lastIndexOf('~~~')
  const endOfLastFence = lastFence + 3
  const fencedContent = value.slice(firstFence, endOfLastFence).trim()
  const result = value.slice(endOfLastFence).trim()
  const sections = []
  if (lead) sections.push(`**示例场景：** ${lead}`)
  sections.push(fencedContent)
  if (result) sections.push(`**对照结果：** ${result}`)
  return sections.join('\n\n')
}

function assertConcreteExample(entry, bankId) {
  const example = String(entry.example ?? '')
  const hasFence = /~~~[^\n]*\n[\s\S]+?~~~/u.test(example)
  const hasDecisionTable = /\|[^\n]+\|\n\|\s*:?-{3,}/u.test(example)
  const hasOperationalScenario = /(验证步骤|操作步骤|输入|输出|场景|正例|反例)/u.test(example)
  if (!hasFence && !hasDecisionTable && !hasOperationalScenario) {
    throw new Error(`${bankId} Q${entry.number}: 示例必须提供代码、输入输出、对照表或可执行场景`)
  }

  const blocks = [...example.matchAll(FENCED_EXAMPLE_RE)]
  for (const [, language, body] of blocks) {
    const comment = inlineComment(language, '检查')
    if (comment && !/(?:\/\/|#|<!--|\/\*|--)[^\n]*示例重点/u.test(body)) {
      throw new Error(`${bankId} Q${entry.number}: ${language || 'plain'} 示例缺少中文重点注释`)
    }
  }
}

/**
 * 只服务于前端基础题库：把已有的具体示例整理成稳定的阅读顺序，
 * 并给每个可注释代码块补充与题目相关的中文观察目标。
 */
export function strengthenFrontendExamples(entries, { bankId }) {
  return entries.map((entry) => {
    const annotated = annotateFencedBlocks(String(entry.example ?? '').trim(), entry.title)
    const enhanced = {
      ...entry,
      example: labelExampleFlow(annotated),
    }
    assertConcreteExample(enhanced, bankId)
    return enhanced
  })
}

