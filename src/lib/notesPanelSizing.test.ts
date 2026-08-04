import { describe, expect, it } from 'vitest'
import {
  NOTES_PANEL_DEFAULT_WIDTH,
  NOTES_PANEL_LARGE_DEFAULT_WIDTH,
  NOTES_PANEL_MAX_WIDTH,
  NOTES_PANEL_MIN_WIDTH,
  clampNotesPanelWidth,
  defaultNotesPanelWidth,
  maximumNotesPanelWidth,
  notesPanelWidthFromPointer,
} from './notesPanelSizing'

describe('notes panel sizing', () => {
  it('uses the larger default at 1440px and above', () => {
    expect(defaultNotesPanelWidth(1439)).toBe(NOTES_PANEL_DEFAULT_WIDTH)
    expect(defaultNotesPanelWidth(1440)).toBe(NOTES_PANEL_LARGE_DEFAULT_WIDTH)
    expect(defaultNotesPanelWidth(1920)).toBe(NOTES_PANEL_LARGE_DEFAULT_WIDTH)
  })

  it('keeps enough room for the rail, reader, and optional library panel', () => {
    expect(maximumNotesPanelWidth(960, false)).toBe(NOTES_PANEL_MIN_WIDTH)
    expect(maximumNotesPanelWidth(1216, true)).toBe(NOTES_PANEL_MIN_WIDTH)
    expect(maximumNotesPanelWidth(1440, true)).toBe(368)
    expect(maximumNotesPanelWidth(1920, false)).toBe(NOTES_PANEL_MAX_WIDTH)
  })

  it('never reports a maximum below the minimum panel width', () => {
    expect(maximumNotesPanelWidth(640, false)).toBe(NOTES_PANEL_MIN_WIDTH)
    expect(maximumNotesPanelWidth(800, true)).toBe(NOTES_PANEL_MIN_WIDTH)
  })

  it('clamps preferred widths to the current desktop layout', () => {
    expect(clampNotesPanelWidth(200, 1440, false)).toBe(NOTES_PANEL_MIN_WIDTH)
    expect(clampNotesPanelWidth(440, 960, false)).toBe(NOTES_PANEL_MIN_WIDTH)
    expect(clampNotesPanelWidth(440, 1920, false)).toBe(440)
    expect(clampNotesPanelWidth(900, 1920, false)).toBe(NOTES_PANEL_MAX_WIDTH)
  })

  it('grows when the right panel edge is dragged left and shrinks to the right', () => {
    expect(notesPanelWidthFromPointer(336, 1100, 1040, 1440, false)).toBe(396)
    expect(notesPanelWidthFromPointer(336, 1100, 1140, 1440, false)).toBe(296)
  })

  it('clamps pointer resizing at both bounds', () => {
    expect(notesPanelWidthFromPointer(336, 1100, 800, 960, false)).toBe(NOTES_PANEL_MIN_WIDTH)
    expect(notesPanelWidthFromPointer(336, 1100, 1300, 1440, false)).toBe(
      NOTES_PANEL_MIN_WIDTH,
    )
  })
})
