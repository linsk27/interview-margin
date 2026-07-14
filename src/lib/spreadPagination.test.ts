import { describe, expect, it } from 'vitest'
import {
  calculateSpreadGeometry,
  canUseSpread,
  clampSpreadIndex,
  spreadLabel,
  spreadOffset,
} from './spreadPagination'

describe('spread pagination', () => {
  it('only enables the spread when both dimensions are usable', () => {
    expect(canUseSpread(1088, 544)).toBe(true)
    expect(canUseSpread(1087, 700)).toBe(false)
    expect(canUseSpread(1200, 543)).toBe(false)
  })

  it('derives page and spread counts from the column overflow width', () => {
    const geometry = calculateSpreadGeometry(1088, 2240, 64)

    expect(geometry.pageWidth).toBe(512)
    expect(geometry.pageCount).toBe(4)
    expect(geometry.spreadCount).toBe(2)
    expect(geometry.spreadStep).toBe(1152)
    expect(spreadOffset(1, geometry)).toBe(1152)
  })

  it('clamps navigation and formats complete or final single-page spreads', () => {
    expect(clampSpreadIndex(-2, 3)).toBe(0)
    expect(clampSpreadIndex(8, 3)).toBe(2)
    expect(spreadLabel(0, 5)).toBe('1\u20132 / 5')
    expect(spreadLabel(2, 5)).toBe('5 / 5')
  })
})
