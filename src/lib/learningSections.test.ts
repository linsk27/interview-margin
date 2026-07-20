import type { Root } from 'mdast'
import remarkParse from 'remark-parse'
import { describe, expect, it } from 'vitest'
import { unified } from 'unified'
import { getLearningOutline, remarkLearningSections } from './learningSections'

function transform(markdown: string): Root {
  const processor = unified().use(remarkParse).use(remarkLearningSections)
  return processor.runSync(processor.parse(markdown)) as Root
}

describe('learning section markdown transform', () => {
  it.each([
    ['**先背答案：**', 'answer'],
    ['**短回答：**', 'answer'],
    ['**题解：**', 'answer'],
    ['**关键词翻译：**', 'glossary'],
    ['**原理：**', 'mechanism'],
    ['**原理流程：**', 'mechanism'],
    ['**原理 / 流程：**', 'mechanism'],
    ['**机制拆解：**', 'mechanism'],
    ['**代码 / 场景：**', 'practice'],
    ['**排查 / 场景：**', 'practice'],
    ['**项目场景：**', 'practice'],
    ['**项目落点：**', 'practice'],
    ['**继续追问：为什么？**', 'followups'],
    ['**递进追问：**', 'followups'],
    ['**易错点：**', 'pitfalls'],
    ['**参考来源：**', 'sources'],
  ] as const)('recognizes the learning label %s', (markdown, kind) => {
    expect(getLearningOutline(markdown)[0]).toMatchObject({ kind })
  })

  it('groups recognized labels into stable semantic sections', () => {
    const tree = transform([
      '**短回答：** 一句话结论。',
      '',
      '**原理 / 流程：**',
      '',
      '读取时收集依赖，写入时触发更新。',
    ].join('\n'))

    expect(tree.children).toHaveLength(2)
    expect(tree.children[0]).toMatchObject({
      type: 'blockquote',
      data: {
        hName: 'section',
        hProperties: {
          id: 'learning-section-answer',
          className: ['learning-section', 'learning-section--answer'],
          tabIndex: -1,
        },
      },
      children: [
        {
          type: 'heading',
          depth: 3,
          children: [{ type: 'text', value: '短回答' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '一句话结论。' }],
        },
      ],
    })
    expect(tree.children[1]).toMatchObject({
      data: { hProperties: { id: 'learning-section-mechanism' } },
    })
  })

  it('uses details for follow-ups and sources while preserving inline questions', () => {
    const tree = transform([
      '**继续追问：为什么 `cleanup` 需要清理旧依赖？**',
      '',
      '答：避免无效更新。',
      '',
      '**参考来源：**',
      '',
      '- [官方文档](https://example.com)',
    ].join('\n'))

    expect(tree.children[0]).toMatchObject({
      data: { hProperties: { id: 'learning-section-followups' } },
      children: [
        { type: 'heading', children: [{ type: 'text', value: '继续追问' }] },
        {
          type: 'blockquote',
          data: { hName: 'details' },
          children: [
            {
              type: 'paragraph',
              data: { hName: 'summary' },
              children: [{ type: 'text', value: '展开追问与回答' }],
            },
            {
              type: 'paragraph',
              children: [{
                type: 'strong',
                children: [
                  { type: 'text', value: '为什么 ' },
                  { type: 'inlineCode', value: 'cleanup' },
                  { type: 'text', value: ' 需要清理旧依赖？' },
                ],
              }],
            },
            {
              type: 'paragraph',
              children: [{ type: 'text', value: '答：避免无效更新。' }],
            },
          ],
        },
      ],
    })
    const sources = tree.children[1]
    expect(sources).toMatchObject({
      data: { hProperties: { id: 'learning-section-sources' } },
    })
    if (sources.type !== 'blockquote') throw new Error('参考来源应转换为 section 容器')
    expect(sources.children[0]).toMatchObject({
      type: 'heading', children: [{ type: 'text', value: '参考来源' }],
    })
    expect(sources.children[1]).toMatchObject({ data: { hName: 'details' } })
    const sourceDetails = sources.children[1]
    if (sourceDetails.type !== 'blockquote') throw new Error('参考来源内容应转换为 details')
    expect(sourceDetails.children[0]).toMatchObject({ data: { hName: 'summary' } })
    expect(sourceDetails.children[1]).toMatchObject({ type: 'list' })
  })

  it('keeps unknown bold paragraphs untouched', () => {
    const tree = transform([
      '**短回答：** 可直接复述的结论。',
      '',
      '**当前项目事实：** 这不是学习分段标签。',
      '',
      '这段补充也应保持普通 Markdown 流。',
    ].join('\n'))

    expect(tree.children).toHaveLength(3)
    expect(tree.children[0]).toMatchObject({
      data: { hProperties: { id: 'learning-section-answer' } },
    })
    expect(tree.children[1]).toMatchObject({
      type: 'paragraph',
      children: expect.arrayContaining([expect.objectContaining({ type: 'strong' })]),
    })
    expect(tree.children[2]).toMatchObject({ type: 'paragraph' })
  })

  it('returns outline ids that match duplicate section ids', () => {
    expect(getLearningOutline([
      '**短回答：** 第一版。',
      '',
      '**题解：** 第二版。',
      '',
      '**易错点：**',
    ].join('\n'))).toEqual([
      { kind: 'answer', label: '短回答', id: 'learning-section-answer' },
      { kind: 'answer', label: '题解', id: 'learning-section-answer-2' },
      { kind: 'pitfalls', label: '易错点', id: 'learning-section-pitfalls' },
    ])
  })
})
