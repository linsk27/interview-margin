// @vitest-environment node
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('eager startup styles', () => {
  it('loads fallback styles from the entry, independently of lazy App CSS', () => {
    const entry = fs.readFileSync('src/main.tsx', 'utf8')
    const css = fs.readFileSync('src/boot.css', 'utf8')
    expect(entry).toContain("import './boot.css'")
    expect(entry).toContain('className="boot-screen"')
    expect(css).toContain('min-height: 100dvh')
    expect(css).toContain('place-items: center')
    expect(css).toContain('prefers-reduced-motion')
    expect(css).not.toMatch(/@import|@font-face|url\(|var\(/)
    expect(fs.readFileSync('src/styles.css', 'utf8')).not.toContain('.load-state__panel')
  })
})
