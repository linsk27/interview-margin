const SCENARIO_MARKER = /\*\*示例场景[：:]\*\*/u
const RESULT_MARKER = /\*\*对照结果[：:]\*\*/u
const ANNOTATION_MARKER = /(?:示例重点|示例注解)[：:]/u

const SLASH_COMMENT_LANGUAGES = new Set([
  'c', 'cpp', 'csharp', 'cs', 'go', 'java', 'javascript', 'js', 'jsx', 'kotlin',
  'php', 'rust', 'swift', 'ts', 'tsx', 'typescript',
])
const HASH_COMMENT_LANGUAGES = new Set([
  'bash', 'nginx', 'powershell', 'ps1', 'py', 'python', 'ruby', 'sh', 'shell',
  'yaml', 'yml',
])
const BLOCK_COMMENT_LANGUAGES = new Set(['css', 'less', 'scss'])
const MARKUP_COMMENT_LANGUAGES = new Set(['html', 'vue', 'xml'])
const SQL_COMMENT_LANGUAGES = new Set(['lua', 'sql'])
const DECLARATIVE_LANGUAGES = new Set(['', 'http', 'json', 'markdown', 'md', 'text', 'txt'])

function fenceToken(line) {
  const match = String(line).match(/^ {0,3}(`{3,}|~{3,})(.*)$/u)
  if (!match) return undefined
  return {
    marker: match[1],
    character: match[1][0],
    length: match[1].length,
    info: match[2].trim(),
    canClose: match[2].trim() === '',
  }
}

function closesFence(token, fence) {
  return Boolean(token
    && token.canClose
    && token.character === fence.character
    && token.length >= fence.length)
}

function plainText(value) {
  return String(value ?? '')
    .replace(/(```|~~~)[\s\S]*?\1/gu, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/gu, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/gu, '$1')
    .replace(/[`*_>#|\[\](){}]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
}

function cleanTitle(value) {
  return String(value ?? '')
    .replace(/^Q\d+(?:\.\d+)*[：:]?\s*/iu, '')
    .replace(/[？?]\s*$/u, '')
    .trim()
}

function shorten(value, maximum = 76) {
  const text = plainText(value)
  if (text.length <= maximum) return text
  return `${text.slice(0, maximum - 1).replace(/[，、；：,.\s]+$/u, '')}…`
}

function nearbyExplanation(lines, openingIndex, title) {
  const paragraphs = []
  let current = []
  for (let index = openingIndex - 1; index >= 0 && paragraphs.length < 2; index -= 1) {
    const line = lines[index].trim()
    if (!line) {
      if (current.length) {
        paragraphs.push(current.reverse().join(' '))
        current = []
      }
      continue
    }
    if (/^\*\*(?:示例场景|对照结果|代码\s*\/\s*场景|原理|关键词翻译)[：:]\*\*$/u.test(line)) continue
    if (/^(?:#{1,6}\s|\[clarity-)/u.test(line)) break
    current.push(line)
  }
  if (current.length) paragraphs.push(current.reverse().join(' '))
  const nearby = paragraphs.find((paragraph) => plainText(paragraph).length >= 12)
  return shorten(nearby || `观察“${cleanTitle(title)}”的输入、关键步骤和输出`)
}

function inlineComment(language, focus) {
  if (SLASH_COMMENT_LANGUAGES.has(language)) return `// 示例重点：${focus}`
  // Keep one leading space so simplistic Markdown heading counters do not
  // mistake a shell/YAML comment inside a fence for a document heading.
  if (HASH_COMMENT_LANGUAGES.has(language)) return ` # 示例重点：${focus}`
  if (BLOCK_COMMENT_LANGUAGES.has(language)) return `/* 示例重点：${focus} */`
  if (MARKUP_COMMENT_LANGUAGES.has(language)) return `<!-- 示例重点：${focus} -->`
  if (SQL_COMMENT_LANGUAGES.has(language)) return `-- 示例重点：${focus}`
  return undefined
}

function hasNearbyAnnotation(lines, openingIndex) {
  return lines
    .slice(Math.max(0, openingIndex - 5), openingIndex)
    .some((line) => /示例注解[：:]/u.test(line))
}

/**
 * Adds a short, topic-specific teaching note to every non-trivial fenced block.
 * Executable formats keep the note in a legal comment. Data and protocol samples
 * keep their bytes intact and receive a visible Markdown annotation instead.
 */
export function annotateTeachingCode(markdown, { title = '' } = {}) {
  const lines = String(markdown ?? '').replace(/\r\n?/gu, '\n').split('\n')
  const output = []

  for (let index = 0; index < lines.length; index += 1) {
    const opening = fenceToken(lines[index])
    if (!opening || opening.canClose) {
      output.push(lines[index])
      continue
    }

    let closingIndex = index + 1
    while (closingIndex < lines.length && !closesFence(fenceToken(lines[closingIndex]), opening)) {
      closingIndex += 1
    }
    if (closingIndex >= lines.length) {
      output.push(lines[index])
      continue
    }

    const body = lines.slice(index + 1, closingIndex)
    const nonEmptyLines = body.filter((line) => line.trim()).length
    const language = opening.info.split(/\s+/u)[0].toLowerCase()
    const focus = nearbyExplanation(lines, index, title)
    const comment = inlineComment(language, focus)

    if (nonEmptyLines >= 3 && !ANNOTATION_MARKER.test(body.join('\n'))) {
      if (comment) {
        output.push(lines[index], comment, ...body, lines[closingIndex])
      } else if ((DECLARATIVE_LANGUAGES.has(language) || language) && !hasNearbyAnnotation(lines, index)) {
        if (output.at(-1)?.trim()) output.push('')
        output.push(`**示例注解：** ${focus}`, '', lines[index], ...body, lines[closingIndex])
      } else {
        output.push(lines[index], ...body, lines[closingIndex])
      }
    } else {
      output.push(lines[index], ...body, lines[closingIndex])
    }
    index = closingIndex
  }

  return output.join('\n')
}

function lastUsefulSentence(value) {
  const candidates = plainText(value)
    .split(/(?<=[。！？!?])/u)
    .map((item) => item.trim())
    .filter((item) => item.length >= 24)
  return candidates.at(-1)
}

function splitTeachingSentences(value) {
  return plainText(value)
    .split(/(?<=[。！？!?；;])/u)
    .map((item) => item.trim())
    .filter((item) => item.length >= 10)
}

function structurePlainScenario(content) {
  const marker = content.match(SCENARIO_MARKER)
  if (!marker || marker.index === undefined) return content
  const scenarioStart = marker.index + marker[0].length
  const resultMatch = RESULT_MARKER.exec(content.slice(scenarioStart))
  const scenarioEnd = resultMatch ? scenarioStart + resultMatch.index : content.length
  const scenario = content.slice(scenarioStart, scenarioEnd).trim()
  if (!scenario || /(?:^|\n)\s*(?:[-*+]\s+|\d+[.)、]\s+|\|[^\n]+\|)/m.test(scenario)) return content

  // Dedicated bank enrichments already pair an authored observation with a
  // concrete code/protocol block. Splitting that prose again can cut a quoted
  // question mark in half and is less readable than the authored sequence.
  if (/\*\*观察目标[：:]\*\*/u.test(scenario) || /(?:^|\n)(?:```|~~~)/m.test(scenario)) {
    return content
  }

  const fenceIndex = scenario.search(/(?:^|\n)(?:```|~~~)/m)
  const prose = fenceIndex >= 0 ? scenario.slice(0, fenceIndex).trim() : scenario
  const remainder = fenceIndex >= 0 ? scenario.slice(fenceIndex).trim() : ''
  const sentences = splitTeachingSentences(prose)
  if (sentences.length < 2) return content

  const premise = sentences[0]
  const outcome = sentences.at(-1)
  const process = sentences.slice(1, -1).join(' ')
  const structured = [
    `- **前提：** ${premise}`,
    process ? `- **过程：** ${process}` : '',
    `- **结果：** ${outcome}`,
    remainder,
  ].filter(Boolean).join('\n\n')
  return `${content.slice(0, scenarioStart)}\n\n${structured}\n\n${content.slice(scenarioEnd).trimStart()}`.trim()
}

function enrichShortScenario(content, summary) {
  const marker = content.match(SCENARIO_MARKER)
  if (!marker || marker.index === undefined) return content
  const scenarioStart = marker.index + marker[0].length
  const resultMatch = RESULT_MARKER.exec(content.slice(scenarioStart))
  const scenarioEnd = resultMatch ? scenarioStart + resultMatch.index : content.length
  const scenario = content.slice(scenarioStart, scenarioEnd).trim()
  if (plainText(scenario).length >= 72 || !plainText(summary)) return content
  const observation = `- **观察目标：** ${shorten(summary, 150)}`
  return `${content.slice(0, scenarioEnd).trimEnd()}\n\n${observation}\n\n${content.slice(scenarioEnd).trimStart()}`.trim()
}

function resultExplanation(example, summary, title) {
  const structuredSteps = [...String(example ?? '').matchAll(
    /(?:^|\n)\s*[-*+]?\s*\*\*(?:过程|结果)[：:]\*\*\s*([^\n]+)/gu,
  )]
    .map((match) => shorten(match[1], 110).replace(/[；;。]\s*$/u, ''))
    .filter(Boolean)
  if (structuredSteps.length) {
    return `检查结果：${structuredSteps.join('；').replace(/[；;]\s*$/u, '')}`
  }
  const observed = lastUsefulSentence(example)
  const topic = cleanTitle(title)
  if (observed) {
    return topic
      ? `用这个结果回答“${topic}”：${observed}`
      : `完成后重点核对这一点：${observed}`
  }
  const conclusion = shorten(summary, 150)
  if (conclusion) {
    return topic
      ? `“${topic}”在这个例子里的关键结论是：${conclusion}`
      : `这个例子最终要验证的是：${conclusion}`
  }
  return '完成后应能同时说清输入条件、执行过程和可观察结果；若结果不同，就回到对应步骤定位，而不是只背结论。'
}

/** Normalizes an authored example without replacing its domain-specific facts. */
export function formatTeachingExample(example, { summary = '', title = '' } = {}) {
  let content = annotateTeachingCode(String(example ?? '').trim(), { title })
  if (!SCENARIO_MARKER.test(content)) content = `**示例场景：**\n\n${content}`
  content = structurePlainScenario(content)
  content = enrichShortScenario(content, summary)
  if (!RESULT_MARKER.test(content)) {
    content = `${content}\n\n**对照结果：**\n\n${resultExplanation(content, summary, title)}`
  }
  return content.trim()
}
