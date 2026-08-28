import { describe, expect, it } from 'vitest'

import { isMarketingEntry } from './entryRoute'

describe('isMarketingEntry', () => {
  it.each(['', '#product', '#workflow', '#questions'])('keeps the landing page for its own anchor %s', (hash) => {
    expect(isMarketingEntry({ pathname: '/', hash })).toBe(true)
  })

  it.each([
    ['/app', ''],
    ['/', '#question-banks'],
    ['/', '#q-1'],
    ['/', '#invite/example-token'],
    ['/app', '#question-banks'],
  ])('keeps workspace and legacy deep links in the application (%s%s)', (pathname, hash) => {
    expect(isMarketingEntry({ pathname, hash })).toBe(false)
  })
})
