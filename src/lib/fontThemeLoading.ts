import type { FontTheme } from '../types'

const FONT_LOAD_SAMPLE = '面试阅读字体切换响应式原理工具智能应用开发'

const FONT_THEME_FACE_SPECS: Record<FontTheme, string[]> = {
  clean: ['400 1rem "Noto Sans SC Variable"', '700 1rem "Noto Sans SC Variable"'],
  playful: ['400 1rem "ZCOOL KuaiLe"'],
  notebook: ['500 1rem "LXGW WenKai"'],
  flowing: ['400 1rem "Zhi Mang Xing"'],
}

// A theme can be requested repeatedly while a dialog is open or while the
// reader restores persisted settings. Reuse the same promise so a fast click
// sequence never starts duplicate font work or causes an intermediate flash.
const loadedThemesByFontSet = new WeakMap<object, Map<FontTheme, Promise<void>>>()

export function canLoadFontTheme() {
  return typeof document !== 'undefined' && typeof document.fonts?.load === 'function'
}

export async function ensureFontThemeLoaded(fontTheme: FontTheme, pageSample = '') {
  if (!canLoadFontTheme()) return
  const fontSet = document.fonts as unknown as object
  const loadedThemes = loadedThemesByFontSet.get(fontSet) ?? new Map<FontTheme, Promise<void>>()
  loadedThemesByFontSet.set(fontSet, loadedThemes)
  const previous = loadedThemes.get(fontTheme)
  if (previous) return previous
  const sample = `${FONT_LOAD_SAMPLE}${pageSample}`.replace(/\s+/g, ' ').slice(0, 2000)
  const loading = Promise.all(
    FONT_THEME_FACE_SPECS[fontTheme].map((spec) => document.fonts.load(spec, sample)),
  ).then(() => document.fonts.ready).then(() => undefined)
  loadedThemes.set(fontTheme, loading)
  try {
    await loading
  } catch (error) {
    // A failed request must be retryable (for example after a transient
    // connection loss); keep the current theme readable in the meantime.
    loadedThemes.delete(fontTheme)
    throw error
  }
}

export function resetFontThemeLoadCache() {
  // WeakMap entries are released with their FontFaceSet. This function exists
  // for integration tests and hot-reload hosts that replace document.fonts.
}
