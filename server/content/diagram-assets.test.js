// @vitest-environment node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { DIAGRAM_URL_PATTERN } from './diagram-policy.js'
import { visualEntries } from './enrichments/visuals.js'
import { clarityVisualEntries } from './clarity.js'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

describe('curated SVG diagram assets', () => {
  it('maps twelve cornerstone questions to accessible, safe local files', () => {
    const entries = visualEntries()
    expect(entries).toHaveLength(12)
    for (const [questionKey, visual] of entries) {
      expect(questionKey).toMatch(/^[a-z0-9-]+:\d+$/)
      expect(visual.alt.trim().length).toBeGreaterThan(8)
      expect(visual.caption.trim().length).toBeGreaterThan(12)
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

  it('keeps clarity diagrams local, accessible and free of active SVG content', () => {
    const entries = clarityVisualEntries()
    expect(entries.length).toBeGreaterThanOrEqual(9)
    for (const visual of entries) {
      expect(visual.banks.length).toBeGreaterThan(0)
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
