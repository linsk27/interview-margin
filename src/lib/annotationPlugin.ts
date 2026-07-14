import type { Element, Parent, Root, RootContent, Text } from 'hast'
import type { Annotation } from '../types'

interface Options {
  annotations: Annotation[]
}

interface TextSegment {
  node: Text
  parent: Parent
  index: number
}

interface MappedCharacter {
  character: string
  offset: number
  segment: TextSegment
}

interface Replacement {
  index: number
  nodes: RootContent[]
}

const BLOCKED_TAGS = new Set(['mark', 'pre', 'script', 'style'])

function textNode(value: string): Text {
  return { type: 'text', value }
}

function markNode(annotation: Annotation, value: string): Element {
  return {
    type: 'element',
    tagName: 'mark',
    properties: {
      className: ['annotation-mark', `annotation-mark--${annotation.color}`],
      dataAnnotationId: annotation.id,
      title: annotation.note || '已高亮',
    },
    children: [textNode(value)],
  }
}

function collectCharacters(parent: Parent, result: MappedCharacter[], blocked = false): void {
  parent.children.forEach((node, index) => {
    const nodeBlocked = blocked || (node.type === 'element' && BLOCKED_TAGS.has(node.tagName))
    if (node.type === 'text' && !nodeBlocked) {
      const segment = { node, parent, index }
      Array.from(node.value).forEach((character, offset) => result.push({ character, offset, segment }))
      return
    }
    if ('children' in node && !nodeBlocked) collectCharacters(node as Parent, result, false)
  })
}

function normalizeCharacters(characters: MappedCharacter[]): { text: string; map: MappedCharacter[] } {
  let text = ''
  const map: MappedCharacter[] = []

  characters.forEach((entry) => {
    if (/\s/.test(entry.character)) {
      if (!text.endsWith(' ')) {
        text += ' '
        map.push(entry)
      }
      return
    }
    text += entry.character
    map.push(entry)
  })

  return { text, map }
}

function applyAnnotation(parent: Parent, annotation: Annotation): boolean {
  const characters: MappedCharacter[] = []
  collectCharacters(parent, characters)
  const normalized = normalizeCharacters(characters)
  const quote = annotation.quote.replace(/\s+/g, ' ').trim()
  const matchStart = normalized.text.indexOf(quote)
  if (matchStart < 0) return false

  const matched = normalized.map.slice(matchStart, matchStart + quote.length)
  const ranges = new Map<TextSegment, { start: number; end: number }>()
  matched.forEach((entry) => {
    const current = ranges.get(entry.segment)
    if (!current) {
      ranges.set(entry.segment, { start: entry.offset, end: entry.offset + 1 })
      return
    }
    current.start = Math.min(current.start, entry.offset)
    current.end = Math.max(current.end, entry.offset + 1)
  })

  const replacements = new Map<Parent, Replacement[]>()
  ranges.forEach((range, segment) => {
    const value = segment.node.value
    const nodes: RootContent[] = []
    if (range.start > 0) nodes.push(textNode(value.slice(0, range.start)))
    nodes.push(markNode(annotation, value.slice(range.start, range.end)))
    if (range.end < value.length) nodes.push(textNode(value.slice(range.end)))
    const list = replacements.get(segment.parent) ?? []
    list.push({ index: segment.index, nodes })
    replacements.set(segment.parent, list)
  })

  replacements.forEach((operations, target) => {
    operations
      .sort((left, right) => right.index - left.index)
      .forEach((operation) => target.children.splice(operation.index, 1, ...operation.nodes))
  })
  return true
}

export function rehypeAnnotationMarks(options: Options) {
  return (tree: Root) => {
    const usable = options.annotations
      .filter((annotation) => annotation.quote.trim().length >= 2)
      .sort((left, right) => right.quote.length - left.quote.length)

    usable.forEach((annotation) => {
      for (const child of tree.children) {
        if ('children' in child && applyAnnotation(child as Parent, annotation)) break
      }
    })
  }
}
