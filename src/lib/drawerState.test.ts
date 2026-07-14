import { describe, expect, it } from 'vitest'
import {
  isFocusMode,
  setFocusMode,
  toggleFocusMode,
  toggleLibrary,
  toggleNotes,
} from './drawerState'

describe('drawer state', () => {
  it('derives focus mode only when both drawers are closed', () => {
    expect(isFocusMode({ libraryOpen: false, notesOpen: false })).toBe(true)
    expect(isFocusMode({ libraryOpen: true, notesOpen: false })).toBe(false)
    expect(isFocusMode({ libraryOpen: false, notesOpen: true })).toBe(false)
  })

  it('closes both drawers from any non-focus state and restores both from focus mode', () => {
    expect(toggleFocusMode({ libraryOpen: true, notesOpen: false })).toEqual({
      libraryOpen: false,
      notesOpen: false,
    })
    expect(toggleFocusMode({ libraryOpen: false, notesOpen: true })).toEqual({
      libraryOpen: false,
      notesOpen: false,
    })
    expect(toggleFocusMode({ libraryOpen: false, notesOpen: false })).toEqual({
      libraryOpen: true,
      notesOpen: true,
    })
  })

  it('lets each drawer leave focus mode without opening the other drawer', () => {
    const focused = setFocusMode(true)

    expect(toggleLibrary(focused)).toEqual({ libraryOpen: true, notesOpen: false })
    expect(toggleNotes(focused)).toEqual({ libraryOpen: false, notesOpen: true })
  })
})
