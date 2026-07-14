import { describe, expect, it } from 'vitest'
import {
  calculateSpreadGeometry,
  canUseSpread,
  clampSpreadIndex,
  shouldUseSpread,
  spreadLabel,
  spreadOffset,
  spreadTranslation,
} from './spreadPagination'

describe('spread pagination', () => {
  it('only enables the spread when both dimensions are usable', () => {
    expect(canUseSpread(1088, 544)).toBe(true)
    expect(canUseSpread(1087, 700)).toBe(false)
    expect(canUseSpread(1200, 543)).toBe(false)
  })

  it('keeps the manual single-page preference even on a wide screen', () => {
    expect(shouldUseSpread('single', 1600, 900)).toBe(false)
    expect(shouldUseSpread('spread', 1600, 900)).toBe(true)
    expect(shouldUseSpread('spread', 900, 900)).toBe(false)
  })

  it('derives page and spread counts from the column overflow width', () => {
    const geometry = calculateSpreadGeometry(1088, 2240, 64)

    expect(geometry.pageWidth).toBe(512)
    expect(geometry.pageCount).toBe(4)
    expect(geometry.spreadCount).toBe(2)
    expect(geometry.spreadStep).toBe(1152)
    expect(spreadOffset(1, geometry)).toBe(1152)
    expect(spreadTranslation(1, geometry)).toBe(-1152)
  })

  it('positions a final odd page at the left side of its own spread', () => {
    const geometry = calculateSpreadGeometry(1350, 2057, 64)

    expect(geometry.pageCount).toBe(3)
    expect(geometry.spreadCount).toBe(2)
    expect(spreadTranslation(1, geometry)).toBe(-1414)
  })

  it('clamps navigation and formats complete or final single-page spreads', () => {
    expect(clampSpreadIndex(-2, 3)).toBe(0)
    expect(clampSpreadIndex(8, 3)).toBe(2)
    expect(spreadLabel(0, 5)).toBe('1\u20132 / 5')
    expect(spreadLabel(2, 5)).toBe('5 / 5')
  })
})
