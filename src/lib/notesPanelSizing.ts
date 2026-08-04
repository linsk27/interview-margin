export const NOTES_PANEL_MIN_WIDTH = 288
export const NOTES_PANEL_DEFAULT_WIDTH = 336
export const NOTES_PANEL_LARGE_DEFAULT_WIDTH = 352
export const NOTES_PANEL_MAX_WIDTH = 480
export const NOTES_PANEL_RESIZE_STEP = 16

export const APP_RAIL_WIDTH = 56
export const READER_MIN_WIDTH = 680
export const LIBRARY_PANEL_WIDTH = 320
export const LIBRARY_PANEL_LARGE_WIDTH = 336
export const LARGE_VIEWPORT_BREAKPOINT = 1440

function finiteViewportWidth(viewportWidth: number) {
  return Number.isFinite(viewportWidth) ? Math.max(0, viewportWidth) : 0
}

export function defaultNotesPanelWidth(viewportWidth: number) {
  return finiteViewportWidth(viewportWidth) >= LARGE_VIEWPORT_BREAKPOINT
    ? NOTES_PANEL_LARGE_DEFAULT_WIDTH
    : NOTES_PANEL_DEFAULT_WIDTH
}

export function maximumNotesPanelWidth(viewportWidth: number, libraryOpen: boolean) {
  const viewport = finiteViewportWidth(viewportWidth)
  const libraryWidth = libraryOpen
    ? viewport >= LARGE_VIEWPORT_BREAKPOINT
      ? LIBRARY_PANEL_LARGE_WIDTH
      : LIBRARY_PANEL_WIDTH
    : 0
  const availableWidth = viewport - APP_RAIL_WIDTH - libraryWidth - READER_MIN_WIDTH

  return Math.max(
    NOTES_PANEL_MIN_WIDTH,
    Math.min(NOTES_PANEL_MAX_WIDTH, availableWidth),
  )
}

export function clampNotesPanelWidth(
  value: number,
  viewportWidth: number,
  libraryOpen: boolean,
) {
  const maximumWidth = maximumNotesPanelWidth(viewportWidth, libraryOpen)
  const fallbackWidth = defaultNotesPanelWidth(viewportWidth)
  const candidate = Number.isFinite(value) ? value : fallbackWidth

  return Math.min(maximumWidth, Math.max(NOTES_PANEL_MIN_WIDTH, candidate))
}

export function notesPanelWidthFromPointer(
  startWidth: number,
  startX: number,
  currentX: number,
  viewportWidth: number,
  libraryOpen: boolean,
) {
  const pointerDelta =
    Number.isFinite(startX) && Number.isFinite(currentX) ? startX - currentX : 0
  const initialWidth = Number.isFinite(startWidth)
    ? startWidth
    : defaultNotesPanelWidth(viewportWidth)

  return clampNotesPanelWidth(
    initialWidth + pointerDelta,
    viewportWidth,
    libraryOpen,
  )
}
