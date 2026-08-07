// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { inferTags, sourceKindForUrl } from './markdown.js'

describe('question metadata inference', () => {
  it('uses the question title instead of incidental answer keywords', () => {
    expect(inferTags(
      'Q34：SSE、WebSocket 和轮询怎么选？',
      '示例使用 TypeScript、React、Nginx 与 RAG Agent。',
      ['360', 'AI 应用前端', '一面'],
    )).toEqual(['360', 'AI 应用前端', '一面', '实时通信', '网络'])
  })

  it('keeps MCP, Skill and Agent questions in their own domain', () => {
    expect(inferTags(
      'Q78：MCP、Tool Calling、Skill 与 Agent 如何协作？',
      '实现可能使用 HTTP、TypeScript 和数据库。',
      ['360', 'AI 应用前端'],
    )).toEqual(['360', 'AI 应用前端', 'MCP', 'Skill', 'Agent', 'Tool Calling'])
  })

  it('marks community forum evidence separately from official documentation', () => {
    expect(sourceKindForUrl('https://blog.csdn.net/example/article/details/1')).toBe('community-interview')
    expect(sourceKindForUrl('https://modelcontextprotocol.io/specification/2025-11-25/server/tools')).toBe('official')
  })
})
