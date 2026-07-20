// @vitest-environment node

import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const rootDir = path.resolve(process.cwd())

describe('Vercel guest failover configuration', () => {
  it('keeps functions and static assets ahead of the API proxy and SPA fallback', () => {
    const config = JSON.parse(fs.readFileSync(path.join(rootDir, 'vercel.json'), 'utf8'))

    expect(config.outputDirectory).toBe('dist')
    expect(config.rewrites).toEqual([
      {
        source: '/api/:path*',
        destination: 'https://interview.linsk27.dpdns.org/api/:path*',
      },
      { source: '/:path*', destination: '/index.html' },
    ])
    expect(config.headers).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: '/api/:path*' }),
      expect.objectContaining({ source: '/catalog.json' }),
    ]))
  })

  it('does not redirect the Vercel deployment back to the personal computer', () => {
    const entry = fs.readFileSync(path.join(rootDir, 'src/main.tsx'), 'utf8')
    expect(entry).not.toContain('interview-margin.vercel.app')
    expect(entry).not.toContain('window.location.replace')
  })
})
