export interface DrawerState {
  libraryOpen: boolean
  notesOpen: boolean
}

export function isFocusMode(state: DrawerState): boolean {
  return !state.libraryOpen && !state.notesOpen
}

export function setFocusMode(enabled: boolean): DrawerState {
  return enabled
    ? { libraryOpen: false, notesOpen: false }
    : { libraryOpen: true, notesOpen: true }
}

export function toggleFocusMode(state: DrawerState): DrawerState {
  return setFocusMode(!isFocusMode(state))
}

export function toggleLibrary(state: DrawerState): DrawerState {
  return { ...state, libraryOpen: !state.libraryOpen }
}

export function toggleNotes(state: DrawerState): DrawerState {
  return { ...state, notesOpen: !state.notesOpen }
}
