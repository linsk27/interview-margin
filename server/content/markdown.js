import crypto from 'node:crypto'

import { toString } from 'mdast-util-to-string'
import remarkParse from 'remark-parse'
import { unified } from 'unified'

import { normalizeReadableQuestionBody } from './readability.js'
import { enhanceQuestionClarity } from './clarity.js'

function stableUuid(value) {
  const bytes = Buffer.from(crypto.createHash('sha256').update(value).digest().subarray(0, 16))
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

const TAG_RULES = [
  ['MCP', ['mcp', 'model context protocol']],
  ['Skill', ['skill', 'skill.md', '技能包']],
  ['Agent', ['agent', '智能体', '多 agent', 'sub-agent']],
  ['Tool Calling', ['tool calling', 'function calling', 'tools/call', '工具调用']],
  ['实时通信', ['sse', 'server-sent', 'websocket', 'eventsource', 'streamable http', '流式']],
  ['安全', ['cswsh', '攻击', '鉴权', '认证', '授权', 'xss', 'csrf', '洪泛', '耗尽']],
  ['Vue', ['vue', '响应式', 'computed', 'watch', 'pinia', 'vuex', 'nexttick']],
  ['React', ['react', 'hook', 'jsx', 'fiber']],
  ['JavaScript', ['javascript', '闭包', '原型', 'promise', 'event loop']],
  ['TypeScript', ['typescript', '类型体操', '类型系统', '泛型约束']],
  ['工程化', ['vite', 'webpack', 'nginx', '性能', 'lighthouse', '部署']],
  ['后端', ['flask', 'node', 'jwt', 'rbac', 'cors', 'restful', 'sqlalchemy']],
  ['数据库', ['mysql', 'sql', '索引', '事务', 'redis']],
  ['AI / RAG', ['rag', 'embedding', 'bm25', 'rerank', '向量召回', '向量检索', '混合检索', 'prompt', 'token', 'contextforge']],
  ['小程序', ['uniapp', '小程序', '页面栈', '微信']],
  ['IoT', ['ble', '蓝牙', 'mqtt', 'gatt', 'mtu']],
  ['网络', ['tcp', 'udp', 'http', 'websocket', 'osi', '网络']],
  ['可视化', ['three.js', 'raycaster', 'echarts', '数字孪生']],
  ['项目拷打', ['项目', 'crud', 'srm', 'amz123', '包装']],
  ['场景题', ['排查', '怎么办', '失败', '卡顿', '中断', '异常']],
]

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

export function inferTags(title, plainText, baseTags = []) {
  const normalizedTitle = title.toLowerCase()
  const escapedKeyword = (keyword) => keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const matchesKeyword = (haystack, keyword) => {
    if (!/[a-z0-9]/i.test(keyword)) return haystack.includes(keyword)
    return new RegExp(`(?:^|[^a-z0-9])${escapedKeyword(keyword)}(?=$|[^a-z0-9])`, 'i').test(haystack)
  }
  const javaContext = baseTags.some((tag) => /^java(?:\s|$)/i.test(tag))
  const gitContext = baseTags.some((tag) => /^git$/i.test(tag))
  const excludedTags = new Set([
    ...(javaContext ? ['Vue', 'React', 'JavaScript', 'TypeScript'] : []),
    ...(gitContext ? ['React'] : []),
  ])
  const matchedTags = (haystack) => TAG_RULES
    .filter(([tag]) => !excludedTags.has(tag))
    .filter(([, keywords]) => keywords.some((keyword) => matchesKeyword(haystack, keyword)))
    .map(([tag]) => tag)
  const titleTags = matchedTags(normalizedTitle)

  return [...baseTags, ...titleTags]
    .filter((tag, index, tags) => tags.indexOf(tag) === index)
    .slice(0, 6)
}

function extractSources(markdown) {
  const tree = unified().use(remarkParse).parse(markdown)
  const sources = []
  function walk(node) {
    if (node.type === 'link' && /^https?:\/\//.test(node.url)) {
      const title = toString(node).trim()
      const url = node.url.trim()
      sources.push({ title, url, kind: sourceKindForUrl(url) })
    }
    if (Array.isArray(node.children)) node.children.forEach(walk)
  }
  walk(tree)
  return sources.filter((source, index) => sources.findIndex((item) => item.url === source.url) === index)
}

const COMMUNITY_SOURCE_HOSTS = [
  'nowcoder.com',
  'maimai.cn',
  'xiaohongshu.com',
  'csdn.net',
]

const CURATED_GUIDE_SOURCE_HOSTS = [
  'javaguide.cn',
  'xiaolincoding.com',
  'xiaolinnote.com',
]

function matchesSourceHost(hostname, hosts) {
  return hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))
}

export function sourceKindForUrl(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase()
    if (matchesSourceHost(hostname, COMMUNITY_SOURCE_HOSTS)) return 'community-interview'
    if (matchesSourceHost(hostname, CURATED_GUIDE_SOURCE_HOSTS)) return 'curated-guide'
    return 'official'
  } catch {
    return 'invalid'
  }
}

export function markdownToPlainText(markdown) {
  return toString(unified().use(remarkParse).parse(markdown)).replace(/\s+/g, ' ').trim()
}

export function parseQuestionMarkdown(source, options) {
  const tree = unified().use(remarkParse).parse(source)
  const children = tree.children
  const sections = []
  let currentSection
  let questionOrder = 0

  children.forEach((node, index) => {
    if (node.type === 'heading' && node.depth === 1) {
      const title = toString(node).trim()
      currentSection = {
        id: `${options.idPrefix ? `${options.idPrefix}-` : ''}${slugify(title) || `section-${sections.length + 1}`}`,
        title,
        order: sections.length,
        questions: [],
      }
      sections.push(currentSection)
      return
    }
    if (node.type !== 'heading' || node.depth !== 2) return
    const heading = toString(node).trim()
    const numberMatch = heading.match(/^Q([\d.]+)/i)
    if (!numberMatch) return
    if (!currentSection) {
      currentSection = { id: 'questions', title: '题目', order: 0, questions: [] }
      sections.push(currentSection)
    }
    const start = node.position?.end.offset ?? 0
    let end = source.length
    for (let nextIndex = index + 1; nextIndex < children.length; nextIndex += 1) {
      const next = children[nextIndex]
      if (next.type === 'heading' && next.depth <= 2) {
        end = next.position?.start.offset ?? end
        break
      }
    }
    const rawBody = source.slice(start, end).trim()
    const body = options.normalizeReadability
      ? normalizeReadableQuestionBody(enhanceQuestionClarity(
        normalizeReadableQuestionBody(rawBody),
        { title: heading, bankId: options.bankId },
      ))
      : rawBody
    const plainText = markdownToPlainText(body)
    const number = numberMatch[1]
    const prefix = options.idPrefix ? `${options.idPrefix}-` : ''
    const id = options.preserveIds === false
      ? stableUuid(`${options.idPrefix || 'question'}:${number.replace(/\./g, '-')}`)
      : `${prefix}q-${number.replace(/\./g, '-')}`
    const codeLines = (body.match(/^(?:```|~~~)/gm)?.length ?? 0) * 8
    currentSection.questions.push({
      id,
      number,
      title: heading,
      body,
      plainText,
      tags: inferTags(heading, plainText, options.baseTags),
      sources: extractSources(body),
      readMinutes: Math.max(1, Math.ceil((plainText.length + codeLines * 20) / 520)),
      order: questionOrder,
    })
    questionOrder += 1
  })
  return sections.filter((section) => section.questions.length > 0)
}

export function renderBankMarkdown(bank, sections, questions) {
  const lines = [`# ${bank.title}`, '']
  for (const section of sections) {
    lines.push(`# ${section.title}`, '')
    for (const question of questions.filter((item) => item.sectionId === section.id)) {
      lines.push(`## ${question.title}`, '', question.body, '')
    }
  }
  return lines.join('\n')
}
