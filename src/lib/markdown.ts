import type { Root } from 'mdast'
import { toString } from 'mdast-util-to-string'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import type { InterviewQuestion, InterviewSection } from '../types'

const TAG_RULES: Array<[string, string[]]> = [
  ['Vue', ['vue', '响应式', 'computed', 'watch', 'pinia', 'vuex', 'nexttick']],
  ['TypeScript', ['typescript', '类型', '泛型']],
  ['工程化', ['vite', 'webpack', 'nginx', '性能', 'lighthouse', '部署']],
  ['后端', ['flask', 'jwt', 'rbac', 'cors', 'restful', 'sqlalchemy']],
  ['数据库', ['mysql', 'sql', '索引', '事务', 'redis']],
  ['AI / RAG', ['rag', 'embedding', 'agent', 'prompt', 'sse', 'token', 'contextforge']],
  ['小程序', ['uniapp', '小程序', '页面栈', '微信']],
  ['IoT', ['ble', '蓝牙', 'mqtt', 'gatt', 'mtu']],
  ['网络', ['tcp', 'udp', 'http', 'osi', '网络']],
  ['可视化', ['three.js', 'raycaster', 'echarts', '数字孪生']],
  ['项目拷打', ['项目', 'crud', 'sr m', 'srm', 'amz123', '包装']],
  ['场景题', ['排查', '怎么办', '失败', '卡顿', '中断', '异常']],
]

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function plainTextFromMarkdown(markdown: string): string {
  const tree = unified().use(remarkParse).parse(markdown) as Root
  return toString(tree).replace(/\s+/g, ' ').trim()
}

function inferTags(title: string, plainText: string): string[] {
  const haystack = `${title} ${plainText}`.toLowerCase()
  const tags = TAG_RULES
    .filter(([, keywords]) => keywords.some((keyword) => haystack.includes(keyword)))
    .map(([tag]) => tag)
  return tags.slice(0, 4)
}

export function parseInterviewMarkdown(source: string): InterviewSection[] {
  const tree = unified().use(remarkParse).parse(source) as Root
  const children = tree.children
  const sections: InterviewSection[] = []
  let currentSection: InterviewSection | undefined
  let questionOrder = 0

  children.forEach((node, index) => {
    if (node.type === 'heading' && node.depth === 1) {
      const title = toString(node).trim()
      currentSection = {
        id: slugify(title) || `section-${sections.length + 1}`,
        title,
        questions: [],
        order: sections.length,
      }
      sections.push(currentSection)
      return
    }

    if (node.type !== 'heading' || node.depth !== 2) return
    const title = toString(node).trim()
    const numberMatch = title.match(/^Q([\d.]+)/i)
    if (!numberMatch) return

    if (!currentSection) {
      currentSection = { id: 'questions', title: '面试题', questions: [], order: 0 }
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

    const body = source.slice(start, end).trim()
    const plainText = plainTextFromMarkdown(body)
    const number = numberMatch[1]
    const id = `q-${number.replace(/\./g, '-')}`
    const codeLines = (body.match(/^```/gm)?.length ?? 0) * 8
    const readMinutes = Math.max(1, Math.ceil((plainText.length + codeLines * 20) / 520))
    const question: InterviewQuestion = {
      id,
      number,
      title,
      body,
      plainText,
      sectionId: currentSection.id,
      sectionTitle: currentSection.title,
      tags: inferTags(title, plainText),
      readMinutes,
      order: questionOrder,
    }
    questionOrder += 1
    currentSection.questions.push(question)
  })

  return sections.filter((section) => section.questions.length > 0)
}

export function flattenQuestions(sections: InterviewSection[]): InterviewQuestion[] {
  return sections.flatMap((section) => section.questions)
}

export function questionFromHash(questions: InterviewQuestion[]): InterviewQuestion | undefined {
  const id = window.location.hash.replace(/^#/, '')
  return questions.find((question) => question.id === id)
}
