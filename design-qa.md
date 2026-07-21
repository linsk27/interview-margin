# Reader drawer design QA

## Reference and final implementation

- Source visual truth: `C:/Users/lsk69/AppData/Local/Temp/codex-clipboard-e4d12c34-2912-4358-a8a1-6a097ada3420.png` (1920 x 910, light theme, authenticated reader, right annotation drawer open).
- Final right drawer: `C:/Users/lsk69/.codex/visualizations/2026/07/18/019f756d-390f-7700-83ff-c1889eaa829f/drawers-2026-07-22/final-right-desktop-1440x900-v2.jpg` (1440 x 900, light theme, authenticated reader, matching question and right drawer state).
- Final left drawer: `C:/Users/lsk69/.codex/visualizations/2026/07/18/019f756d-390f-7700-83ff-c1889eaa829f/drawers-2026-07-22/final-left-desktop-1440x900.jpg`.
- Final dual-drawer state: `C:/Users/lsk69/.codex/visualizations/2026/07/18/019f756d-390f-7700-83ff-c1889eaa829f/drawers-2026-07-22/final-both-desktop-1440x900-v2.jpg`.
- Narrow desktop state: `C:/Users/lsk69/.codex/visualizations/2026/07/18/019f756d-390f-7700-83ff-c1889eaa829f/drawers-2026-07-22/final-right-narrow-1215x900.jpg`.
- Mobile library state: `C:/Users/lsk69/.codex/visualizations/2026/07/18/019f756d-390f-7700-83ff-c1889eaa829f/drawers-2026-07-22/final-library-mobile-polished-390x844.jpg`.
- Mobile notes state: `C:/Users/lsk69/.codex/visualizations/2026/07/18/019f756d-390f-7700-83ff-c1889eaa829f/drawers-2026-07-22/final-notes-mobile-390x844.jpg`.
- Dark theme state: `C:/Users/lsk69/.codex/visualizations/2026/07/18/019f756d-390f-7700-83ff-c1889eaa829f/drawers-2026-07-22/final-right-dark-1440x900.jpg`.
- The source and final right-drawer screenshots were opened together in one comparison input. The host browser capture surface cannot reproduce the supplied 1920 px width, so the final visual was checked at 1440 px and again at the 1215/1216 px breakpoint instead of claiming a pixel-identical viewport.

## Comparison history

1. Initial P1 finding: both desktop drawers started at viewport row zero while the global toolbar sat above them at a higher z-index, hiding the drawer title and close control.
2. Initial P1 finding: fixed drawers overlaid the reading canvas; the question title, answer card, body copy, and bottom status controls could be covered instead of reflowing.
3. Initial P1 finding: the left internal close action only changed the mobile flag, so it did not close the desktop drawer; the close button also exposed the wrong expanded state.
4. Initial P2 finding: at 960–1215 px the right drawer used mobile state logic while the desktop scrim was hidden, creating a mixed interaction model.
5. Initial P2 finding: the mobile library header placed the title and five actions in one row, wrapping the title into an awkward narrow column.
6. Fix: desktop drawers now start immediately below the toolbar, occupy the remaining viewport height, and reserve matching grid tracks in the reading desk. The reader and status dock reflow into the true remaining width.
7. Fix: desktop note geometry now begins at the same 60rem breakpoint as the desktop rail; 60–75.99rem permits one docked drawer, while wider screens may show both.
8. Fix: close, scrim, question selection, and breakpoint transitions now clear the authoritative drawer state. The mobile library header uses a separate action row.

## Final evidence

- Left only: title, kicker, search, filters, close control, and question list are fully visible; the reader begins after the drawer edge.
- Right only: `Q1 / 边注`, close control, summary, review schedule, and annotation section are fully visible below the toolbar; the reader ends before the drawer edge.
- Both open at 1440 x 900: the center column remains readable, the title wraps normally, and neither drawer covers the reader or status dock.
- 1215 x 900: the right drawer is docked without a scrim, and opening the left drawer closes the right drawer as intended.
- 390 x 844: the mobile library and notes drawers remain modal overlays with a scrim; closing the scrim clears state and does not reopen a drawer after resizing.
- Light and dark themes retain readable borders, shadows, text, and input contrast.
- Browser console: no warnings or errors in the final pass.
- Interaction tests: internal left close, internal right close, mobile scrim close, narrow-desktop mutual exclusion, and wide dual-open state passed.
- Automated checks: 14 targeted tests passed; production build passed.

## Findings

- P0: none.
- P1: none remaining.
- P2: none remaining.
- P3: none required for this scoped correction.

final result: passed
