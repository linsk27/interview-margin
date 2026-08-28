import { describe, expect, it } from 'vitest'
import { FONT_THEME_STORAGE_KEY, createDefaultState, parseStudyState, progressFor, saveFontTheme, withActivity } from './storage'

describe('study state storage', () => {
  it('merges imported settings with current defaults', () => {
    const parsed = parseStudyState(JSON.stringify({
      version: 1,
      progress: {},
      annotations: [],
      settings: { theme: 'dark' },
    }))

    expect(parsed.settings.theme).toBe('dark')
    expect(parsed.settings.fontTheme).toBe('clean')
    expect(parsed.settings.readingSize).toBe('comfortable')
    expect(parsed.settings.pageLayout).toBe('single')
  })

  it('keeps the device font theme for guests and rejects stale values', () => {
    saveFontTheme('notebook')
    expect(createDefaultState().settings.fontTheme).toBe('notebook')

    window.localStorage.setItem(FONT_THEME_STORAGE_KEY, 'removed-theme')
    expect(createDefaultState().settings.fontTheme).toBe('clean')
  })

  it('falls back when an imported progress file contains an unknown font theme', () => {
    const parsed = parseStudyState(JSON.stringify({
      version: 1,
      progress: {},
      annotations: [],
      settings: { fontTheme: 'removed-theme' },
    }))

    expect(parsed.settings.fontTheme).toBe('clean')
  })

  it('rejects unrelated json', () => {
    expect(() => parseStudyState('{"hello":"world"}')).toThrow('进度文件')
  })

  it('returns immutable defaults for a new question', () => {
    const state = createDefaultState()
    const first = progressFor(state, 'q-1')
    first.note = 'changed locally'

    expect(progressFor(state, 'q-1').note).toBe('')
  })

  it('records activity without mutating the previous state', () => {
    const state = createDefaultState()
    const next = withActivity(state)

    expect(next).not.toBe(state)
    expect(Object.values(next.activity)).toEqual([1])
    expect(state.activity).toEqual({})
  })
})
