// @vitest-environment node

import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const rootDir = path.resolve(process.cwd())

describe('public promotion and search assets', () => {
  it('publishes canonical Open Graph, Twitter and parseable structured data', () => {
    const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8')
    expect(html).toContain('<link rel="canonical" href="https://interview.linsk27.dpdns.org/"')
    expect(html).toContain('property="og:image" content="https://interview.linsk27.dpdns.org/assets/interview-margin-share.png"')
    expect(html).toContain('name="twitter:card" content="summary_large_image"')
    expect(html).toContain('rel="icon" type="image/svg+xml" href="/favicon.svg"')

    const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1]
    expect(jsonLd).toBeTruthy()
    expect(JSON.parse(jsonLd)).toMatchObject({
      name: '面试边注', url: 'https://interview.linsk27.dpdns.org/', isAccessibleForFree: true,
    })
  })

  it('keeps crawl configuration on the production origin and exposes valid assets', () => {
    const robots = fs.readFileSync(path.join(rootDir, 'public', 'robots.txt'), 'utf8')
    const sitemap = fs.readFileSync(path.join(rootDir, 'public', 'sitemap.xml'), 'utf8')
    const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'public', 'site.webmanifest'), 'utf8'))
    expect(robots).toContain('Disallow: /api/')
    expect(robots).toContain('https://interview.linsk27.dpdns.org/sitemap.xml')
    expect(sitemap).toContain('<loc>https://interview.linsk27.dpdns.org/</loc>')
    expect(sitemap).not.toContain('#')
    expect(manifest).toMatchObject({ name: '面试边注', lang: 'zh-CN', start_url: '/' })
    expect(fs.existsSync(path.join(rootDir, 'public', 'favicon.svg'))).toBe(true)

    const image = fs.readFileSync(path.join(rootDir, 'public', 'assets', 'interview-margin-share.png'))
    expect(image.subarray(1, 4).toString()).toBe('PNG')
    expect(image.readUInt32BE(16)).toBe(1731)
    expect(image.readUInt32BE(20)).toBe(909)
    expect(image.byteLength).toBeLessThan(5 * 1024 * 1024)
  })
})
