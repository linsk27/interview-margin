import { describe, expect, it } from 'vitest'

import {
  auditQuestionExample,
  extractExampleParts,
  extractFencedCodeBlocks,
  findDuplicateExampleTemplates,
  findRepeatedTeachingNotes,
} from './example-quality.js'

function question(body, title = 'Fetch 流式响应如何处理中断？') {
  return { id: 'q-1', bankId: 'frontend-ai-interviews', title, body }
}

const DETAILED_EXAMPLE = `**代码 / 场景：**

**示例场景：**

前提：用户用 Fetch 请求 \`/api/chat\`，服务端把两条 SSE 事件拆成 3 个网络 chunk 返回。

过程：客户端增量解码字节，把半包留在 buffer；只有读到空行后才解析完整事件。用户点击停止时，AbortController 只取消本次请求。

\`\`\`ts
// 示例重点：网络 chunk 不是一条完整 SSE 事件，残片必须留给下一轮。
const decoder = new TextDecoderStream()
const reader = response.body.pipeThrough(decoder).getReader()
await reader.cancel()
\`\`\`

**对照结果：**

正确实现最终派发两条完整消息，并把用户主动停止显示为“已停止”；错误实现会在半个 JSON 到达时直接解析失败。

**递进追问：**`

describe('question example quality gate', () => {
  it('accepts a concrete, relevant scenario with an annotated code example and explained result', () => {
    expect(auditQuestionExample(question(DETAILED_EXAMPLE))).toEqual([])
  })

  it('extracts stable example regions and every fenced block', () => {
    expect(extractExampleParts(DETAILED_EXAMPLE)).toEqual(expect.objectContaining({
      scenario: expect.stringContaining('3 个网络 chunk'),
      result: expect.stringContaining('最终派发两条完整消息'),
    }))
    expect(extractFencedCodeBlocks(DETAILED_EXAMPLE)).toEqual([
      expect.objectContaining({ language: 'ts', code: expect.stringContaining('示例重点') }),
    ])
  })

  it('rejects missing, short or generic examples with actionable issue codes', () => {
    const body = `**代码 / 场景：**\n\n**示例场景：**\n\n用一个示例验证边界。\n\n**对照结果：**\n\n符合预期。`
    expect(auditQuestionExample(question(body)).map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'short-example',
      'generic-example',
      'short-result',
    ]))

    const vague = `**示例场景：**\n\n这段文字只是把宏观原则换了几种说法，前后都停留在泛泛而谈的层面。读者读完依旧只能记住宽泛方向，无法把内容落实成明确动作，也无法据此判断自己的理解究竟处于哪个层次。\n\n**对照结果：**\n\n这段总结虽然足够长，却依旧没有提供任何可核对的技术现象。`
    expect(auditQuestionExample(question(vague)).map((issue) => issue.code)).toContain('vague-example')

    expect(auditQuestionExample(question('只有一段定义。')).map((issue) => issue.code)).toEqual([
      'missing-example-marker',
      'missing-result-marker',
    ])
  })

  it('requires an in-code teaching comment for procedural code', () => {
    const body = DETAILED_EXAMPLE.replace(
      '// 示例重点：网络 chunk 不是一条完整 SSE 事件，残片必须留给下一轮。\n',
      '',
    )
    expect(auditQuestionExample(question(body))).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'unannotated-code', message: expect.stringContaining('ts') }),
    ]))
  })

  it('allows a named explanation outside formats that cannot safely contain comments', () => {
    const body = DETAILED_EXAMPLE.replace(
      /```ts[\s\S]*?```/,
      `> 示例注解：下面分别是服务端返回的事件类型和负载字段。\n\n\`\`\`json\n{\n  "type": "delta",\n  "text": "你好"\n}\n\`\`\``,
    )
    expect(auditQuestionExample(question(body))).toEqual([])
  })

  it('accepts a detailed concept scenario without forcing unrelated code into it', () => {
    const body = `**代码 / 场景：**

**示例场景：**

- **前提：** Fetch 请求已经展示了前两段回答，此时用户点击“停止”。
- **过程：** 页面取消当前请求，同时保留已经展示的内容，并把按钮从“停止”改成“继续提问”。
- **结果：** 服务端稍后到达的内容不再写入这条消息，历史回答仍可阅读。

**对照结果：**

主动停止属于用户选择，不应显示成网络故障；真正断网时才展示失败原因和重试入口。

**递进追问：**`
    expect(auditQuestionExample(question(body))).toEqual([])
  })

  it('flags a foreign-language block that looks copied from another topic', () => {
    const body = DETAILED_EXAMPLE.replace('```ts', '```java')
    expect(auditQuestionExample(question(body))).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'foreign-language-code' }),
    ]))
  })

  it('finds copied example templates across different questions', () => {
    const copied = [
      { ...question(DETAILED_EXAMPLE), id: 'q-1' },
      { ...question(DETAILED_EXAMPLE, 'SSE 为什么需要事件边界？'), id: 'q-2' },
    ]
    expect(findDuplicateExampleTemplates(copied)).toEqual([
      expect.objectContaining({ questions: expect.arrayContaining([
        expect.objectContaining({ id: 'q-1' }),
        expect.objectContaining({ id: 'q-2' }),
      ]) }),
    ])
  })

  it('finds a mechanical teaching note reused across many code blocks', () => {
    const repeated = Array.from({ length: 3 }, (_, index) => ({
      ...question(DETAILED_EXAMPLE.replace(
        /示例重点：[^\n]+/,
        '示例重点：按顺序观察输入、关键操作与输出',
      )),
      id: `q-${index + 1}`,
    }))
    expect(findRepeatedTeachingNotes(repeated)).toEqual([
      expect.objectContaining({
        note: expect.stringContaining('按顺序观察输入'),
        references: expect.arrayContaining([expect.objectContaining({ id: 'q-1' })]),
      }),
    ])
  })
})
