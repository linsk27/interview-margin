const SECTION_LABELS = [
  ['answer', /^(?:\*\*)?(?:先背答案|短回答|题解)(?:[：:])(?:\*\*)?\s*$/],
  ['glossary', /^(?:\*\*)?关键词翻译(?:[：:])(?:\*\*)?\s*$/],
  ['mechanism', /^(?:\*\*)?(?:原理(?:\s*\/?\s*流程)?|机制拆解)(?:[：:])(?:\*\*)?\s*$/],
  ['practice', /^(?:\*\*)?(?:代码\s*\/\s*场景|排查\s*\/\s*场景|项目\s*\/\s*场景|项目场景|项目落点)(?:[：:])(?:\*\*)?\s*$/],
  ['followups', /^(?:\*\*)?(?:继续追问|递进追问)(?:[：:])?.*?(?:\*\*)?\s*$/],
  ['pitfalls', /^(?:\*\*)?易错点(?:[：:])(?:\*\*)?\s*$/],
  ['sources', /^(?:\*\*)?参考来源(?:[：:])(?:\*\*)?\s*$/],
]

const PROSE_LIMITS = {
  answer: 132,
  mechanism: 168,
  practice: 168,
  default: 188,
}

const INLINE_SECTION_LABEL = /^\*\*(先背答案|短回答|题解|原理(?:\s*\/?\s*流程)?|机制拆解|代码\s*\/\s*场景|排查\s*\/\s*场景|项目\s*\/\s*场景|项目场景|项目落点)[：:]\*\*\s+(.+)$/

function sectionKind(line) {
  const value = line.trim()
  return SECTION_LABELS.find(([, pattern]) => pattern.test(value))?.[0]
}

function inlineSection(line) {
  const match = line.trim().match(INLINE_SECTION_LABEL)
  if (!match) return undefined
  const label = match[1]
  const kind = /^(?:先背答案|短回答|题解)$/.test(label)
    ? 'answer'
    : /^(?:原理|机制)/.test(label)
      ? 'mechanism'
      : 'practice'
  return { kind, label: `**${label}：**`, content: match[2].trim() }
}

function isStructuralLine(line) {
  const value = line.trim()
  return !value
    || /^(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|>|\|)/.test(value)
    || /^!\[[^\]]*]\(/.test(value)
    || /^<(?:table|details|summary|div|figure|img|aside)\b/i.test(value)
    || /^---+$/.test(value)
    || /^\s{2,}\S/.test(line)
}

function splitSentences(value) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) return []
  const sentences = normalized
    .split(/(?<=[。！？；])|(?<=[.!?])\s+(?=[A-Z\u4e00-\u9fff])/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
  return sentences.flatMap((sentence) => {
    if (sentence.length <= PROSE_LIMITS.default) return [sentence]
    const clauses = sentence
      .split(/(?<=[，、：])|(?<=,|:)\s+/u)
      .map((clause) => clause.trim())
      .filter(Boolean)
    return clauses.length > 1 ? groupSentences(clauses, PROSE_LIMITS.mechanism) : [sentence]
  })
}

function groupSentences(sentences, limit) {
  const groups = []
  let current = ''
  for (const sentence of sentences) {
    if (!current) {
      current = sentence
      continue
    }
    if (current.length + sentence.length <= limit) {
      current += sentence
      continue
    }
    groups.push(current)
    current = sentence
  }
  if (current) groups.push(current)
  return groups
}

function readableParagraph(lines, kind) {
  const value = lines.map((line) => line.trim()).join(' ').replace(/\s+/g, ' ').trim()
  const limit = PROSE_LIMITS[kind] ?? PROSE_LIMITS.default
  if (value.length <= limit) return value

  const sentences = splitSentences(value)
  if (kind === 'answer' && sentences.length >= 3) {
    const points = groupSentences(sentences.slice(1), limit)
    return `${sentences[0]}\n\n${points.map((point) => `- ${point}`).join('\n')}`
  }

  const groups = groupSentences(sentences, limit)
  if (groups.length < 2) return value
  return groups.join('\n\n')
}

/**
 * Keeps authored Markdown intact while breaking only dense, plain prose blocks.
 * Built-in seed content opts into this before it reaches SQLite. Admin imports
 * stay byte-for-byte authored unless their caller explicitly enables it.
 */
export function normalizeReadableQuestionBody(markdown) {
  const lines = String(markdown ?? '').replace(/\r\n?/g, '\n').split('\n')
  const output = []
  let paragraph = []
  let kind = 'default'
  let fence

  const flushParagraph = () => {
    if (!paragraph.length) return
    output.push(readableParagraph(paragraph, kind))
    paragraph = []
  }

  for (const line of lines) {
    const fenceMatch = line.trim().match(/^(```|~~~)/)
    if (fence) {
      output.push(line)
      if (fenceMatch?.[1] === fence) fence = undefined
      continue
    }
    if (fenceMatch) {
      flushParagraph()
      fence = fenceMatch[1]
      output.push(line)
      continue
    }

    const inline = inlineSection(line)
    if (inline) {
      flushParagraph()
      kind = inline.kind
      output.push(inline.label, '')
      paragraph.push(inline.content)
      continue
    }

    const nextKind = sectionKind(line)
    if (nextKind) {
      flushParagraph()
      kind = nextKind
      output.push(line)
      continue
    }

    if (isStructuralLine(line)) {
      flushParagraph()
      output.push(line)
      continue
    }
    paragraph.push(line)
  }
  flushParagraph()

  return output.join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function denseProseBlocks(markdown, limit = 210) {
  const lines = String(markdown ?? '').replace(/\r\n?/g, '\n').split('\n')
  const dense = []
  let paragraph = []
  let fence

  const flush = () => {
    if (!paragraph.length) return
    const text = paragraph.map((line) => line.trim()).join(' ').replace(/\s+/g, ' ').trim()
    if (text.length > limit) dense.push(text)
    paragraph = []
  }

  for (const line of lines) {
    const fenceMatch = line.trim().match(/^(```|~~~)/)
    if (fence) {
      if (fenceMatch?.[1] === fence) fence = undefined
      continue
    }
    if (fenceMatch) {
      flush()
      fence = fenceMatch[1]
      continue
    }
    if (isStructuralLine(line) || sectionKind(line)) {
      flush()
      continue
    }
    paragraph.push(line)
  }
  flush()
  return dense
}
