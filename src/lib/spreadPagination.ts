import type { PageLayout } from '../types'

export const MIN_SPREAD_WIDTH = 1088
export const MIN_SPREAD_HEIGHT = 544

export interface SpreadGeometry {
  pageWidth: number
  pageCount: number
  spreadCount: number
  spreadStep: number
}

export function canUseSpread(width: number, height: number): boolean {
  return width >= MIN_SPREAD_WIDTH && height >= MIN_SPREAD_HEIGHT
}

export function shouldUseSpread(layout: PageLayout, width: number, height: number): boolean {
  return layout === 'spread' && canUseSpread(width, height)
}

export function calculateSpreadGeometry(contentWidth: number, scrollWidth: number, gap: number): SpreadGeometry {
  const safeGap = Math.max(0, gap)
  const pageWidth = Math.max(1, (contentWidth - safeGap) / 2)
  const pageStride = pageWidth + safeGap
  const measuredWidth = Math.max(contentWidth, scrollWidth)
  const pageCount = Math.max(2, Math.round((measuredWidth + safeGap) / pageStride))

  return {
    pageWidth,
    pageCount,
    spreadCount: Math.ceil(pageCount / 2),
    spreadStep: pageStride * 2,
  }
}

export function clampSpreadIndex(index: number, spreadCount: number): number {
  return Math.min(Math.max(0, Math.trunc(index)), Math.max(0, spreadCount - 1))
}

export function spreadOffset(index: number, geometry: SpreadGeometry): number {
  return clampSpreadIndex(index, geometry.spreadCount) * geometry.spreadStep
}

export function spreadLabel(index: number, pageCount: number): string {
  const firstPage = Math.min(index * 2 + 1, pageCount)
  const lastPage = Math.min(firstPage + 1, pageCount)
  return firstPage === lastPage
    ? `${firstPage} / ${pageCount}`
    : `${firstPage}\u2013${lastPage} / ${pageCount}`
}
