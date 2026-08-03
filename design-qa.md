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

## Follow-up: notes motion and resizing (2026-07-22)

- Root cause: the notes panel was conditionally mounted only while open. Its closing transform could never run, while the reading grid continued its 420 ms reflow, producing a mismatched hierarchy animation.
- Fix: the panel now remains mounted in the reader, then uses `aria-hidden`, `inert`, visibility, pointer events, and the same 420 ms easing as the reading grid to enter and leave safely.
- Fix: the desktop panel sits above the status and floating controls but below the global toolbar. The AI button and dialog now follow the panel offset with the same easing.
- Fix: the panel's left edge is a 12 px drag target. Pointer dragging, Arrow keys (16 px), Shift + Arrow (48 px), Home/End, double-click reset, and a header compact/restore control are supported.
- Width policy: 288 px minimum, 336/352 px responsive default, 480 px maximum, with a dynamic cap that always reserves the rail, an optional library drawer, and at least 544 px for the reader. The preferred width is device-local UI state and is not synced to study data.
- Dragging disables layout transitions and text selection until pointer release; reduced-motion mode also removes the panel and assistant transitions.
- Browser evidence at 1440 × 900: default 352 px, compact 288 px, ArrowLeft 304 px, End 480 px, double-click reset 352 px; the panel starts at y=64 and uses z-index 209.
- Browser evidence at 390 × 844: the existing modal drawer remains 88% wide with a scrim; desktop resize controls are hidden.
- Automated checks: 12 notes sizing/component tests passed, including pointer, keyboard, compact/restore, persistent hidden state, and accessible separator semantics. The two service suites that timed out only during the parallel full run passed 11/11 when rerun serially; production build passed.

final result: passed

---

# Design QA — 学习导览与阅读字体

## Evidence

- Source visual truth: `C:\Users\lsk69\AppData\Local\Temp\codex-clipboard-f2a9759d-5f89-45c2-b46e-d164c191589d.png`
- Implementation URL: `http://127.0.0.1:4173/`
- Full desktop capture: `artifacts/learning-route-full-qa.png`
- Focused navigation capture: `artifacts/learning-route-focused-qa.png`
- Side-by-side comparison: `artifacts/learning-route-comparison.png`
- Desktop font-settings capture: `artifacts/font-settings-qa.png`
- Mobile font-settings capture: `artifacts/font-settings-mobile-qa.png`
- Desktop viewport: 1280 × 720 CSS px, device scale factor 1
- Mobile viewport: 390 × 844 CSS px, device scale factor 1
- Source navigation pixels: 536 × 80
- Focused implementation navigation pixels: 536 × 80
- State: light theme, single-page reader, Q1; navigation verified at answer, mechanism, and follow-up sections; settings verified with serif/sans and 15/17/20 px options

The source and focused implementation navigation were compared at the same 536 × 80 pixel size. A focused comparison was necessary because the supplied source is a cropped navigation strip rather than a full application screen. The number of visible route items is content-driven (the source question has six sections; the verification question has four), so fidelity was judged on hierarchy, density, active-state behavior, and legibility rather than item count.

## Findings

No actionable P0, P1, or P2 issues remain.

- Fonts and typography: the reader now exposes two genuinely different bundled Chinese families—Noto Serif SC and Noto Sans SC—and the setting cards preview the same Chinese phrase in each family. Body sizes resolve to 15, 17, and 20 px; section headings scale with the selected body size. At 390 px the two font cards stack, and both preview strings render without truncation.
- Spacing and layout rhythm: the learning route retains the compact strip from the source. The current item adds a blue surface, stronger weight, and a 2 px inset underline without shifting surrounding items. The font-setting cards fit both 1280 px and 390 px viewports with no horizontal overflow.
- Colors and visual tokens: active navigation and selected font/size cards use the existing accent tokens. Inactive items remain neutral, while the pitfalls label preserves its warm semantic color.
- Image quality and asset fidelity: this change introduces no raster or illustrative assets. Existing Lucide interface icons and bundled web fonts remain sharp at both tested densities.
- Copy and content: route labels remain content-derived (`速答 / 术语 / 原理 / 追问…`). Font choices are named `书刊宋体` and `清晰黑体`, with concise usage descriptions; size choices show their actual pixel values.
- Accessibility and interaction: exactly one route button exposes `aria-current="location"`. Clicking a route item scrolls and focuses its target. Clicking `追问` or `来源` opens the related disclosure. Font and size options are radio groups with correct checked state.

## Comparison History

1. Initial browser pass found that clicking `原理` scrolled it into the correct visual position, but the scrollspy still reported `术语` because the activation line ignored the section's CSS scroll margin.
   - Fix: derive each section's activation threshold from its computed `scroll-margin-block-start`.
   - Post-fix evidence: clicking `原理` settled with `03 原理` as the current item; restored scroll position also selected `03 原理`; clicking the final `追问` section settled with `04 追问` and opened its details content.
2. First 390 px pass showed the two font-preview cards side by side, causing the Chinese sample to truncate.
   - Fix: stack font cards below 30 rem while retaining the two-column desktop layout.
   - Post-fix evidence: the final 390 × 844 capture has one full-width card per font, no horizontal overflow, and each preview's `clientWidth` equals its `scrollWidth`.

## Verification

- Primary interactions tested: route clicks, smooth scrolling, active section updates, follow-up disclosure opening, font-family switching, size switching, and narrow-screen layout.
- Computed result after selecting `清晰黑体 + 大字`: `Noto Sans SC Variable`, 20 px body text, 38 px line height.
- Browser console: no warning or error entries.
- Automated checks: production build passed; 38 test files / 190 tests passed before the final responsive-only refinement; focused post-refinement checks passed for Reader, SettingsDialog, and storage migration.

## Follow-up Polish

- P3: during a long smooth scroll, the highlight intentionally follows the intermediate sections before settling on the clicked destination. This is consistent with the scrollspy model and does not block use.

final result: passed
