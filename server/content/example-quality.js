const EXAMPLE_MARKER = /\*\*示例场景[：:]\*\*/
const RESULT_MARKER = /\*\*对照结果[：:]\*\*/
const CODE_ANNOTATION_MARKER = /(?:示例重点|示例注解)[：:]/

const NEXT_SECTION = /\n\s*\*\*(?:递进追问|继续追问|易错点|参考来源)[：:]?\*\*/
const GENERIC_EXAMPLE = [
  /^(?:可以|建议)?(?:用|写|做|结合)?(?:一个|最小)?(?:代码|业务|项目)?(?:示例|场景)(?:来)?(?:验证|说明|观察)(?:这个|上述)?(?:问题|逻辑|边界|结果)?[。；;]?$/,
  /^(?:在)?(?:实际)?项目中(?:根据|结合)实际情况(?:选择|处理|验证)[。；;]?$/,
  /^观察结果是否符合预期[。；;]?$/,
  /^以下仅为示例[。；;]?$/,
]
const COMMENTABLE_LANGUAGES = new Set([
  'bash', 'c', 'c#', 'c++', 'cpp', 'cs', 'csharp', 'css', 'go', 'html', 'ini', 'java',
  'javascript', 'js', 'jsx', 'kotlin', 'less', 'lua', 'nginx', 'php', 'powershell',
  'ps1', 'py', 'python', 'ruby', 'rust', 'scss', 'sh', 'shell', 'sql', 'swift', 'ts',
  'tsx', 'typescript', 'vue', 'yaml', 'yml',
])
const DECLARATIVE_LANGUAGES = new Set(['', 'http', 'json', 'markdown', 'md', 'text', 'txt', 'xml'])
const FRONTEND_BANKS = new Set([
  'frontend-ai-interviews', 'frontend-engineering', 'javascript', 'react-core', 'vue-core',
])
const JAVA_BANKS = new Set(['java-ai-applications', 'java-backend-interviews', 'java-foundations'])
const FRONTEND_FOREIGN_LANGUAGES = new Set([
  'c', 'c#', 'c++', 'cpp', 'cs', 'csharp', 'go', 'java', 'kotlin', 'php', 'py', 'python',
  'ruby', 'rust', 'swift',
])
const JAVA_FOREIGN_LANGUAGES = new Set([
  'css', 'html', 'javascript', 'js', 'jsx', 'scss', 'ts', 'tsx', 'typescript', 'vue',
])
function plainText(value) {
  return String(value ?? '')
    .replace(/(```|~~~)[\s\S]*?\1/g, ' code ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' diagram ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_>#|\-[\](){}]/g, ' ')
    .replace(/\s+/g, '')
}

function markerRegion(markdown, marker, stopPattern) {
  const match = marker.exec(markdown)
  if (!match) return ''
  const tail = markdown.slice(match.index + match[0].length)
  const stop = stopPattern.exec(tail)
  return (stop ? tail.slice(0, stop.index) : tail).trim()
}

export function extractExampleParts(markdown) {
  const source = String(markdown ?? '').replace(/\r\n?/g, '\n')
  const scenario = markerRegion(source, EXAMPLE_MARKER, /\n\s*\*\*对照结果[：:]\*\*|\n\s*\*\*(?:递进追问|继续追问|易错点|参考来源)[：:]?\*\*/)
  const result = markerRegion(source, RESULT_MARKER, NEXT_SECTION)
  return { scenario, result }
}

export function extractFencedCodeBlocks(markdown) {
  const source = String(markdown ?? '').replace(/\r\n?/g, '\n')
  const blocks = []
  const pattern = /(?:^|\n)(`{3,}|~{3,})([^\n]*)\n([\s\S]*?)\n\1(?=\n|$)/g
  for (const match of source.matchAll(pattern)) {
    const fenceOffset = match[0].startsWith('\n') ? 1 : 0
    const start = match.index + fenceOffset
    blocks.push({
      language: match[2].trim().toLowerCase(),
      code: match[3],
      start,
      end: match.index + match[0].length,
    })
  }
  return blocks
}

function codeLineCount(code) {
  return code.split('\n').filter((line) => line.trim()).length
}

function hasNamedInlineComment(code) {
  return CODE_ANNOTATION_MARKER.test(code)
}

function hasNearbyDeclarativeAnnotation(markdown, block) {
  const before = markdown.slice(Math.max(0, block.start - 360), block.start)
  const after = markdown.slice(block.end, Math.min(markdown.length, block.end + 240))
  return /(?:^|\n)\s*>\s*\*\*?示例注解[：:]\*\*?/m.test(before)
    || /(?:^|\n)\s*>\s*示例注解[：:]/m.test(before)
    || /(?:^|\n)\s*\*\*示例注解[：:]\*\*/m.test(before)
    || /\*\*对照结果[：:]\*\*/.test(after)
}

function namesLanguage(title, language) {
  const haystack = String(title ?? '').toLowerCase()
  const aliases = {
    c: [' c ', 'c语言'],
    'c#': ['c#', 'csharp'],
    'c++': ['c++', 'cpp'],
    cpp: ['c++', 'cpp'],
    cs: ['c#', 'csharp'],
    csharp: ['c#', 'csharp'],
    go: ['go ', 'golang', 'goroutine'],
    java: ['java', 'jvm', 'spring', 'mybatis'],
    javascript: ['javascript', ' js ', 'node'],
    js: ['javascript', ' js ', 'node'],
    jsx: ['jsx', 'react'],
    kotlin: ['kotlin'],
    php: ['php'],
    py: ['python', 'flask'],
    python: ['python', 'flask'],
    ruby: ['ruby'],
    rust: ['rust'],
    swift: ['swift'],
    ts: ['typescript', ' ts '],
    tsx: ['tsx', 'react'],
    typescript: ['typescript', ' ts '],
    vue: ['vue'],
  }
  return (aliases[language] ?? [language]).some((alias) => (` ${haystack} `).includes(alias))
}

function isForeignCodeLanguage(bankId, title, language) {
  if (FRONTEND_BANKS.has(bankId) && FRONTEND_FOREIGN_LANGUAGES.has(language)) {
    return !namesLanguage(title, language)
  }
  if (JAVA_BANKS.has(bankId) && JAVA_FOREIGN_LANGUAGES.has(language)) {
    return !namesLanguage(title, language)
  }
  return false
}

function specificitySignals(value) {
  const signals = [
    /`[^`\n]{1,80}`/,
    /(?:```|~~~)/,
    /!\[[^\]]+\]\([^)]*\)/,
    /(?:^|\n)\s*(?:\d+[.)、]|[-*+]\s+)/m,
    /(?:→|->|=>)/,
    /\*\*(?:前提|过程|结果|输入|操作|输出|错误路径)[：:]\*\*/,
    /["“][^"”\n]{2,40}["”]/,
    /\b\d+(?:\.\d+)?(?:ms|s|MB|KB|%|次|条|个|字节|秒|分钟)?\b/i,
    /(?:例如|比如|假设|以.+为例|当.+时|用户|客户端|服务端|请求|响应|输入|输出|返回|报错|失败|成功|测试|验证)/,
  ]
  return signals.filter((pattern) => pattern.test(value)).length
}

function isGenericScenario(value) {
  const text = plainText(value)
  return GENERIC_EXAMPLE.some((pattern) => pattern.test(text))
}

/**
 * 审核一道题的教学示例。返回值为空代表通过；否则每项都可直接定位到修订动作。
 */
export function auditQuestionExample({ id, bankId, title, body }) {
  const markdown = String(body ?? '')
  const { scenario, result } = extractExampleParts(markdown)
  const issues = []

  if (!EXAMPLE_MARKER.test(markdown)) {
    issues.push({ code: 'missing-example-marker', message: '缺少“示例场景”' })
  } else {
    const length = plainText(scenario).length
    const hasConcreteArtifact = /(?:```|~~~)|!\[[^\]]+\]\([^)]*\)|\|[^\n]+\|\s*\n\|\s*:?-{3,}/.test(scenario)
    const minimumLength = hasConcreteArtifact ? 18 : 70
    if (length < minimumLength) {
      issues.push({ code: 'short-example', message: `示例场景只有 ${length} 个非空白字符` })
    }
    if (specificitySignals(scenario) < 1) {
      issues.push({ code: 'vague-example', message: '示例缺少可复现的输入、步骤、数值、结果或代码等具体证据' })
    }
    if (isGenericScenario(scenario)) {
      issues.push({ code: 'generic-example', message: '示例是可套用到任意题目的空泛模板' })
    }
  }

  if (!RESULT_MARKER.test(markdown)) {
    issues.push({ code: 'missing-result-marker', message: '缺少“对照结果”' })
  } else if (plainText(result).length < 24) {
    issues.push({ code: 'short-result', message: '对照结果没有解释示例证明了什么或错误表现是什么' })
  }

  for (const block of extractFencedCodeBlocks(markdown)) {
    if (codeLineCount(block.code) < 3) continue
    const language = block.language.split(/\s+/)[0]
    if (isForeignCodeLanguage(bankId, title, language)) {
      issues.push({
        code: 'foreign-language-code',
        message: `${bankId} 题目出现未由标题说明的 ${language} 代码，请确认不是跨题误贴`,
      })
    }
    if (COMMENTABLE_LANGUAGES.has(language)) {
      if (!hasNamedInlineComment(block.code)) {
        issues.push({
          code: 'unannotated-code',
          message: `${language || '代码'} 块缺少“示例重点”注释`,
        })
      }
    } else if (!hasNearbyDeclarativeAnnotation(markdown, block)) {
      issues.push({
        code: 'unexplained-declarative-code',
        message: `${DECLARATIVE_LANGUAGES.has(language) ? (language || '纯文本') : `未识别的 ${language}`} 块前缺少“示例注解”，块后也没有“对照结果”`,
      })
    }
  }

  return issues.map((issue) => ({
    id,
    bankId,
    title,
    ...issue,
  }))
}

export function findDuplicateExampleTemplates(questions) {
  const groups = new Map()
  for (const question of questions) {
    const { scenario, result } = extractExampleParts(question.body)
    const normalized = plainText(`${scenario}\n${result}`)
      .toLowerCase()
      .replace(/\d+/g, '#')
    if (normalized.length < 60) continue
    const group = groups.get(normalized) ?? []
    group.push({ id: question.id, bankId: question.bankId, title: question.title })
    groups.set(normalized, group)
  }
  return [...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([fingerprint, questionsInGroup]) => ({
      fingerprint: fingerprint.slice(0, 120),
      questions: questionsInGroup,
    }))
}

export function findRepeatedTeachingNotes(questions, maximumReuse = 2) {
  const groups = new Map()
  const add = (note, question) => {
    const normalized = plainText(note).toLowerCase()
    if (normalized.length < 8) return
    const group = groups.get(normalized) ?? []
    group.push({ id: question.id, bankId: question.bankId, title: question.title })
    groups.set(normalized, group)
  }

  for (const question of questions) {
    for (const block of extractFencedCodeBlocks(question.body)) {
      const note = block.code.match(/(?:示例重点|示例注解)[：:]\s*([^\n*<-]+)/)?.[1]
      if (note) add(note, question)
    }
    for (const match of String(question.body ?? '').matchAll(/(?:^|\n)\s*>?\s*\*\*?示例注解[：:]\*\*?\s*([^\n]+)/g)) {
      add(match[1], question)
    }
  }

  return [...groups.entries()]
    .filter(([, group]) => group.length > maximumReuse)
    .map(([note, references]) => ({ note, references }))
}
