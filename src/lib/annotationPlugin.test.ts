import type { Element, Root, RootContent } from 'hast'
import { describe, expect, it } from 'vitest'
import type { Annotation } from '../types'
import { rehypeAnnotationMarks } from './annotationPlugin'

function annotation(quote: string): Annotation {
  return {
    id: 'annotation-1',
    questionId: 'q-1',
    quote,
    note: '重点',
    color: 'yellow',
    createdAt: '2026-07-14T00:00:00.000Z',
    updatedAt: '2026-07-14T00:00:00.000Z',
  }
}

function marks(node: RootContent | Root): Element[] {
  if (node.type === 'element' && node.tagName === 'mark') return [node]
  if (!('children' in node)) return []
  return node.children.flatMap((child) => marks(child as RootContent))
}

describe('annotation highlighter', () => {
  it('highlights a quote inside one text node', () => {
    const tree: Root = {
      type: 'root',
      children: [{ type: 'element', tagName: 'p', properties: {}, children: [{ type: 'text', value: '理解依赖收集和派发更新' }] }],
    }

    rehypeAnnotationMarks({ annotations: [annotation('依赖收集')] })(tree)

    expect(marks(tree)).toHaveLength(1)
    expect(marks(tree)[0].children).toEqual([{ type: 'text', value: '依赖收集' }])
  })

  it('keeps one annotation continuous across inline elements', () => {
    const tree: Root = {
      type: 'root',
      children: [{
        type: 'element',
        tagName: 'p',
        properties: {},
        children: [
          { type: 'text', value: 'Vue3 用 ' },
          { type: 'element', tagName: 'code', properties: {}, children: [{ type: 'text', value: 'Proxy' }] },
          { type: 'text', value: ' 代理整个对象' },
        ],
      }],
    }

    rehypeAnnotationMarks({ annotations: [annotation('Vue3 用 Proxy 代理')] })(tree)
    const highlighted = marks(tree)

    expect(highlighted).toHaveLength(3)
    expect(highlighted.map((mark) => mark.children[0].type === 'text' ? mark.children[0].value : '').join('').replace(/\s+/g, ' ')).toBe('Vue3 用 Proxy 代理')
    expect(highlighted.every((mark) => mark.properties.dataAnnotationId === 'annotation-1')).toBe(true)
  })
})
