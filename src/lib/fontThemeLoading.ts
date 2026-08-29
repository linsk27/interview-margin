import type { FontTheme } from '../types'

const FONT_LOAD_SAMPLE = '面试阅读字体切换响应式原理工具智能应用开发'

const FONT_THEME_FACE_SPECS: Record<FontTheme, string[]> = {
  clean: ['400 1rem "Noto Sans SC Variable"', '700 1rem "Noto Sans SC Variable"'],
  playful: ['400 1rem "ZCOOL KuaiLe"'],
  notebook: ['500 1rem "LXGW WenKai"'],
  flowing: ['400 1rem "Zhi Mang Xing"'],
}

export function canLoadFontTheme() {
  return typeof document !== 'undefined' && typeof document.fonts?.load === 'function'
}

export async function ensureFontThemeLoaded(fontTheme: FontTheme, pageSample = '') {
  if (!canLoadFontTheme()) return
  const sample = `${FONT_LOAD_SAMPLE}${pageSample}`.replace(/\s+/g, ' ').slice(0, 2000)
  await Promise.all(
    FONT_THEME_FACE_SPECS[fontTheme].map((spec) => document.fonts.load(spec, sample)),
  )
  await document.fonts.ready
}
