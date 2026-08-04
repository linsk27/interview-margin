export interface DrawerState {
  libraryOpen: boolean
  notesOpen: boolean
}

export function visibleDrawerState(state: DrawerState, focusMode: boolean): DrawerState {
  return focusMode
    ? { libraryOpen: false, notesOpen: false }
    : state
}

export function toggleLibrary(state: DrawerState): DrawerState {
  return { ...state, libraryOpen: !state.libraryOpen }
}

export function toggleNotes(state: DrawerState): DrawerState {
  return { ...state, notesOpen: !state.notesOpen }
}

export function openLibrary(state: DrawerState): DrawerState {
  return state.libraryOpen ? state : { ...state, libraryOpen: true }
}

export function openNotes(state: DrawerState): DrawerState {
  return state.notesOpen ? state : { ...state, notesOpen: true }
}
