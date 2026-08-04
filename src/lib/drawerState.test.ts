import { describe, expect, it } from 'vitest'
import {
  openLibrary,
  openNotes,
  toggleLibrary,
  toggleNotes,
  visibleDrawerState,
} from './drawerState'

describe('drawer state', () => {
  it('keeps focus independent when both drawers are manually closed', () => {
    let focusMode = false
    let drawers = { libraryOpen: true, notesOpen: true }

    drawers = toggleLibrary(drawers)
    drawers = toggleNotes(drawers)

    expect(drawers).toEqual({ libraryOpen: false, notesOpen: false })
    expect(focusMode).toBe(false)
    expect(visibleDrawerState(drawers, focusMode)).toBe(drawers)
  })

  it('hides drawers during focus without overwriting the state restored on exit', () => {
    const drawers = { libraryOpen: true, notesOpen: false }

    expect(visibleDrawerState(drawers, true)).toEqual({
      libraryOpen: false,
      notesOpen: false,
    })
    expect(visibleDrawerState(drawers, false)).toBe(drawers)
  })

  it('can explicitly open either drawer when leaving focus', () => {
    const drawers = { libraryOpen: false, notesOpen: false }

    expect(openLibrary(drawers)).toEqual({ libraryOpen: true, notesOpen: false })
    expect(openNotes(drawers)).toEqual({ libraryOpen: false, notesOpen: true })
  })
})
