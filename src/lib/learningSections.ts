import type {
  Blockquote,
  Heading,
  Paragraph,
  PhrasingContent,
  Root,
  RootContent,
  Strong,
  Text,
} from 'mdast'
import { toString } from 'mdast-util-to-string'
import remarkParse from 'remark-parse'
import type { Plugin } from 'unified'
import { unified } from 'unified'

export type LearningSectionKind =
  | 'answer'
  | 'glossary'
  | 'mechanism'
  | 'practice'
  | 'followups'
  | 'pitfalls'
  | 'sources'

export interface LearningOutlineItem {
  kind: LearningSectionKind
  label: string
  id: string
}

interface LearningLabel {
  kind: LearningSectionKind
  label: string
  leadingContent?: string
}

const DISCLOSURE_LABELS: Partial<Record<LearningSectionKind, string>> = {
  followups: '展开追问与回答',
  sources: '展开参考来源',
}

function parseLearningLabel(value: string): LearningLabel | undefined {
  const label = value.replace(/\s+/g, ' ').trim()
  let match = label.match(/^(先背答案|短回答|题解)\s*[：:]\s*$/)
  if (match) return { kind: 'answer', label: match[1] }

  match = label.match(/^(关键词翻译)\s*[：:]\s*$/)
  if (match) return { kind: 'glossary', label: match[1] }

  match = label.match(/^(原理(?:\s*\/?\s*流程)?|机制拆解)\s*[：:]\s*$/)
  if (match) return { kind: 'mechanism', label: match[1] }

  match = label.match(/^(代码\s*\/\s*场景|排查\s*\/\s*场景|项目\s*\/\s*场景|项目场景|项目落点)\s*[：:]\s*$/)
  if (match) return { kind: 'practice', label: match[1] }

  match = label.match(/^(继续追问|递进追问)\s*[：:]\s*(.*)$/)
  if (match) {
    return {
      kind: 'followups',
      label: match[1],
      leadingContent: match[2].trim() || undefined,
    }
  }

  match = label.match(/^(易错点)\s*[：:]\s*$/)
  if (match) return { kind: 'pitfalls', label: match[1] }

  match = label.match(/^(参考来源)\s*[：:]\s*$/)
  if (match) return { kind: 'sources', label: match[1] }
  return undefined
}

function labelFromNode(node: RootContent): LearningLabel | undefined {
  if (node.type !== 'paragraph') return undefined
  const firstChild = node.children[0]
  if (firstChild?.type !== 'strong') return undefined
  return parseLearningLabel(toString(firstChild))
}

function isUnknownBoldLabel(node: RootContent): boolean {
  if (node.type !== 'paragraph') return false
  const firstChild = node.children[0]
  return firstChild?.type === 'strong' && /^[^：:\n]{1,48}[：:]/.test(toString(firstChild).trim())
}

function sectionId(kind: LearningSectionKind, occurrence: number): string {
  const suffix = occurrence > 1 ? `-${occurrence}` : ''
  return `learning-section-${kind}${suffix}`
}

function outlineFromTree(tree: Root): LearningOutlineItem[] {
  const occurrences = new Map<LearningSectionKind, number>()
  const outline: LearningOutlineItem[] = []

  tree.children.forEach((node) => {
    const learningLabel = labelFromNode(node)
    if (!learningLabel) return
    const occurrence = (occurrences.get(learningLabel.kind) ?? 0) + 1
    occurrences.set(learningLabel.kind, occurrence)
    outline.push({
      kind: learningLabel.kind,
      label: learningLabel.label,
      id: sectionId(learningLabel.kind, occurrence),
    })
  })
  return outline
}

export function getLearningOutline(markdown: string): LearningOutlineItem[] {
  const tree = unified().use(remarkParse).parse(markdown) as Root
  return outlineFromTree(tree)
}

function trimLeadingWhitespace(children: PhrasingContent[]): PhrasingContent[] {
  const result = [...children]
  while (result[0]?.type === 'text') {
    const first = result[0] as Text
    const value = first.value.replace(/^\s+/, '')
    if (value) {
      result[0] = { ...first, value }
      break
    }
    result.shift()
  }
  return result
}

function trailingPhrasingContent(children: PhrasingContent[], length: number): PhrasingContent[] {
  const result: PhrasingContent[] = []
  let remaining = length

  for (let index = children.length - 1; index >= 0 && remaining > 0; index -= 1) {
    const child = children[index]
    const value = toString(child)
    if (!value) continue
    if (value.length <= remaining) {
      result.unshift(child)
      remaining -= value.length
      continue
    }
    if (child.type === 'text' || child.type === 'inlineCode') {
      result.unshift({ ...child, value: child.value.slice(-remaining) })
    } else {
      result.unshift({ type: 'text', value: value.slice(-remaining) })
    }
    remaining = 0
  }
  return trimLeadingWhitespace(result)
}

function contentFromLabelParagraph(
  paragraph: Paragraph,
  learningLabel: LearningLabel,
): Paragraph | undefined {
  const remainder = trimLeadingWhitespace(paragraph.children.slice(1))
  const children: PhrasingContent[] = []

  if (learningLabel.leadingContent) {
    const originalLabel = paragraph.children[0] as Strong
    const question: Strong = {
      type: 'strong',
      children: trailingPhrasingContent(originalLabel.children, learningLabel.leadingContent.length),
    }
    children.push(question)
    if (remainder.length) children.push({ type: 'text', value: ' ' })
  }
  children.push(...remainder)
  return children.length ? { type: 'paragraph', children } : undefined
}

function sectionHeading(label: string, id: string): Heading {
  return {
    type: 'heading',
    depth: 3,
    children: [{ type: 'text', value: label }],
    data: {
      hProperties: {
        id: `${id}-heading`,
        className: ['learning-section__heading'],
      },
    },
  }
}

function detailsContent(kind: LearningSectionKind, content: RootContent[]): Blockquote {
  const summary: Paragraph = {
    type: 'paragraph',
    children: [{ type: 'text', value: DISCLOSURE_LABELS[kind] ?? '展开完整内容' }],
    data: {
      hName: 'summary',
      hProperties: { className: ['learning-section__summary'] },
    },
  }
  return {
    type: 'blockquote',
    children: [summary, ...content] as Blockquote['children'],
    data: {
      hName: 'details',
      hProperties: { className: ['learning-section__details'] },
    },
  }
}

function sectionNode(
  item: LearningOutlineItem,
  content: RootContent[],
): Blockquote {
  const collapsible = item.kind === 'followups' || item.kind === 'sources'
  const body = collapsible ? [detailsContent(item.kind, content)] : content
  return {
    type: 'blockquote',
    children: [sectionHeading(item.label, item.id), ...body] as Blockquote['children'],
    data: {
      hName: 'section',
      hProperties: {
        id: item.id,
        className: ['learning-section', `learning-section--${item.kind}`],
        dataLearningKind: item.kind,
        tabIndex: -1,
      },
    },
  }
}

function transformLearningSections(tree: Root): void {
  const outline = outlineFromTree(tree)
  if (!outline.length) return

  const transformed: RootContent[] = []
  let active: { item: LearningOutlineItem; content: RootContent[] } | undefined
  let outlineIndex = 0

  const flush = () => {
    if (!active) return
    transformed.push(sectionNode(active.item, active.content))
    active = undefined
  }

  tree.children.forEach((node) => {
    const learningLabel = labelFromNode(node)
    if (!learningLabel) {
      if (active && isUnknownBoldLabel(node)) flush()
      if (active) active.content.push(node)
      else transformed.push(node)
      return
    }

    flush()
    const item = outline[outlineIndex]
    outlineIndex += 1
    const inlineContent = contentFromLabelParagraph(node as Paragraph, learningLabel)
    active = { item, content: inlineContent ? [inlineContent] : [] }
  })

  flush()
  tree.children = transformed
}

export const remarkLearningSections: Plugin<[], Root> = () => (tree) => {
  transformLearningSections(tree)
}
