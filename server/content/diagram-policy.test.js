// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { inspectMarkdownDiagrams, isSafeQuestionMarkdown } from './diagram-policy.js'

describe('question diagram policy', () => {
  it('accepts an accessible same-origin SVG diagram', () => {
    const markdown = '![事件循环阶段](/content/diagrams/javascript/event-loop-v1.svg "宏任务和微任务")'
    expect(inspectMarkdownDiagrams(markdown)).toEqual({
      diagrams: [{
        url: '/content/diagrams/javascript/event-loop-v1.svg',
        alt: '事件循环阶段',
        title: '宏任务和微任务',
      }],
      errors: [],
    })
  })

  it.each([
    ['远程图', '![remote](https://example.com/a.svg)'],
    ['协议相对图', '![remote](//example.com/a.svg)'],
    ['目录穿越', '![bad](/content/diagrams/../secret.svg)'],
    ['空替代文本', '![](/content/diagrams/javascript/event-loop-v1.svg)'],
    ['原始 HTML 图', '<img src="/content/diagrams/javascript/event-loop-v1.svg">'],
    ['内联 SVG', '<svg onload="alert(1)"></svg>'],
  ])('rejects %s', (_label, markdown) => {
    expect(isSafeQuestionMarkdown(markdown)).toBe(false)
  })

  it('does not reject ordinary links or code examples containing image text', () => {
    expect(isSafeQuestionMarkdown('[MDN](https://developer.mozilla.org/)\n\n`<img src="x">`')).toBe(true)
  })
})
