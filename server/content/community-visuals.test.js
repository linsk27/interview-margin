// @vitest-environment node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { DIAGRAM_URL_PATTERN } from './diagram-policy.js'
import { communityVisualEntries, visualForCommunityQuestion } from './community-visuals.js'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

describe('community interview diagram mappings', () => {
  it('prefers the dedicated Fetch framing diagram over the broader SSE mapping', () => {
    expect(visualForCommunityQuestion(
      'frontend-ai-interviews',
      'Fetch 流式响应如何正确分帧、解码并处理中断？',
    )?.src).toBe('/content/diagrams/frontend-ai/sse-framing-buffer-v1.svg')

    expect(visualForCommunityQuestion(
      'frontend-ai-interviews',
      'AI 对话为什么通常使用 SSE，何时必须换成 WebSocket？',
    )?.src).toBe('/content/diagrams/frontend-ai/streaming-answer-pipeline-v1.svg')
  })

  it('uses compact, accessible and script-free local SVG assets', () => {
    const entries = communityVisualEntries()
    expect(entries.length).toBeGreaterThanOrEqual(8)
    expect(entries.filter(({ bankId }) => bankId === 'java-foundations').map(({ visual }) => visual.src))
      .toEqual([
        '/content/diagrams/java-foundations/object-contract-v1.svg',
        '/content/diagrams/java-foundations/hashmap-put-resize-v2.svg',
        '/content/diagrams/java-backend/thread-pool-admission-v1.svg',
        '/content/diagrams/java-foundations/thread-coordination-v1.svg',
        '/content/diagrams/java-foundations/jvm-memory-v1.svg',
      ])
    for (const { bankId, visual } of entries) {
      expect(bankId).toMatch(/^[a-z0-9-]+$/)
      expect(visual.alt.trim().length).toBeGreaterThan(12)
      expect(visual.caption.trim().length).toBeGreaterThan(16)
      expect(DIAGRAM_URL_PATTERN.test(visual.src)).toBe(true)

      const filename = path.join(rootDir, 'public', visual.src)
      expect(fs.existsSync(filename), `${visual.src} 不存在`).toBe(true)
      const svg = fs.readFileSync(filename, 'utf8')
      expect(Buffer.byteLength(svg)).toBeLessThan(100_000)
      expect(svg).toMatch(/^<svg\b/)
      expect(svg).toMatch(/\bviewBox="0 0 1200 720"/)
      expect(svg).toMatch(/<title\b/)
      expect(svg).toMatch(/<desc\b/)
      expect(svg).not.toMatch(/<script\b|<foreignObject\b|\son[a-z]+\s*=|\b(?:href|xlink:href)\s*=/i)
    }
  })
})
