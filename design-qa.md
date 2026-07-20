# Immersive reader design QA

## Reference and tested states

- Reference: `docs/design/reader-immersive-reference.png` (1487 × 1058).
- Desktop implementation: `C:/Users/lsk69/.codex/visualizations/2026/07/18/019f756d-390f-7700-83ff-c1889eaa829f/interview-reader-immersive-2026-07-21/desktop-final-clean.png` (1487 × 1058, dark theme, guest, interview Q1, single-page layout, drawers closed).
- Mobile implementation: `C:/Users/lsk69/.codex/visualizations/2026/07/18/019f756d-390f-7700-83ff-c1889eaa829f/interview-reader-immersive-2026-07-21/mobile-final.png` (390 × 844, dark theme, guest, interview Q1, drawers closed).
- Real rich-content proof: `C:/Users/lsk69/.codex/visualizations/2026/07/18/019f756d-390f-7700-83ff-c1889eaa829f/interview-reader-immersive-2026-07-21/rich-content-diagram-code.png` (JavaScript Q12 with a real repository diagram and code block).
- Full comparison: `C:/Users/lsk69/.codex/visualizations/2026/07/18/019f756d-390f-7700-83ff-c1889eaa829f/interview-reader-immersive-2026-07-21/desktop-comparison-final.png`.
- Focused comparison: `C:/Users/lsk69/.codex/visualizations/2026/07/18/019f756d-390f-7700-83ff-c1889eaa829f/interview-reader-immersive-2026-07-21/desktop-comparison-focus.png`.

## Iteration history

1. Pass 1 found three material mismatches: the learning guide consumed a tall block below the title, the dark theme rendered the rail as a light strip, and answer/content spacing pushed the first useful explanation too far below the fold.
2. Pass 2 moved the guide before the title, compacted its vertical rhythm, introduced dedicated dark-rail tokens, reduced answer spacing, and replaced the oversized focus ring with a restrained section marker.
3. Pass 3 placed the desktop learning progress and route in the unused center of the top toolbar, removed duplicate desktop question metadata already present in the toolbar, and moved the title/answer to the same vertical rhythm as the selected reference.

## Browser and interaction checks

- Desktop at 1487 × 1058: document width equals viewport width (1487 px); the title begins at 88 px and the answer card at 199 px; closed library is `aria-hidden=true` and `inert`.
- Narrow desktop at 1220 × 900: the fixed route occupies x=440–836, does not overlap the breadcrumb or action cluster, and document width remains 1220 px.
- Tablet at 1024 × 820: the route returns to in-flow sticky behavior and document width remains 1024 px.
- Mobile at 390 × 844: document and body widths remain 390 px; the route is sticky and its right edge is 368 px; the closed library is hidden and inert.
- Mobile drawer: opens at x=0–344 with `aria-hidden=false` and no `inert`, then closes back to `aria-hidden=true` and `inert` without changing document width.
- Learning-route interaction: selecting “原理” scrolls and focuses the real mechanism section; the tested rich question rendered one repository diagram and one code block.
- Browser console: no runtime errors or warnings were emitted during the final pass.

## Final issue review

- P0: none.
- P1: none.
- P2: none.
- P3 / accepted content-driven difference: the reference demonstrates table, comparison-flow, code, and pitfall modules in one synthetic lesson. The implementation renders those modules only when the selected real question contains them; it does not invent unsupported learning content merely to fill the layout.

final result: passed
