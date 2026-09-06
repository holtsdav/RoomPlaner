# Room Planner audit — 5 September 2026

The planner has a sound millimetre-based model and consistent canvas zoom, but it is **not yet reliable enough for precise fit decisions without checking the reported measurements**. This audit found **22 issues: 7 P1, 14 P2, 1 P3; no P0 observed**. The highest priorities are silent object resizing, ambiguous room measurement conventions, incorrect group reflection, and saved-data conflicts.

This is an audit deliverable. Product source and the user's stored rooms were not changed. Existing uncommitted work was preserved. Because files changed during the first pass, final geometry and edge checks used a snapshot captured at **2026-09-05 13:39:10 Europe/Berlin**. [Source hashes](evidence/source-manifest.json) identify the 122 source files. Repository checks were repeated on the working tree afterward. The original app remains available at http://localhost:3000.

## Coverage and evidence

- Read the application routes, every editor domain/state/persistence/UI implementation, current tests, shared primitives used by the editor, and project/configuration documentation. Unused generated component primitives were not exercised as product flows.
- Checked all **184 selectable presets** across eight categories: 178 furniture/device/structural presets and six basic shapes. [Per-object dimension matrix](dimensions.md) lists W/D/H, labels, visible extents and source status for every object.
- **2,760 SVG-envelope cases**: native size, 1×1, 1×10,000, 10,000×1 and 10,000×10,000 mm, each at 0.04/0.12/0.8 scale. Basic shapes use the declared envelope in that pass; actual rendered shapes are covered by the canvas pass.
- **552 actual Konva canvas measurements**: every preset at three scales. Maximum zoom-induced change after converting pixels back to world dimensions was **2.1×10⁻¹¹ mm**. Zoom itself is consistent; this does not certify that the silhouette fills its declared envelope.
- All 184 presets passed positive/integer schema validation, JSON W/D/H round trips, and bounding-envelope rotation calculations at eight angles. Height is metadata in this 2D model; there is no vertical collision simulation to verify.
- Existing suite: **103 tests / 16 files passed**. Lint, TypeScript and production build pass. Formatting fails on object-variant.test.ts, so the combined check command fails.
- Isolated Chromium/Helium contexts checked desktop 1440×900, phone 390×844 and small phone 320×568; object input commit/cancel/invalid entry, undo, unit switching, hidden focus, off-screen controls, large-room fit, scale reset, persistence corruption and two-tab conflicts. No test data was written to the user's browsing profile.
- Axe: missing H1 on desktop/selected state; no violations in the phone sample. Manual source/interaction checks found keyboard issues outside what Axe can infer from a canvas. This is not a WCAG conformance certification.
- The browser reported no application page errors in the completed UI pass. Dedicated Chrome DevTools MCP was unavailable; no Lighthouse, production INP/LCP, or physical-device performance claim is made.

The extreme Kettle test produced one browser SVG bounding-box excursion of about **0.195 CSS px** at 1×10,000 mm. It is retained in raw evidence as an extreme-aspect numerical anomaly, not counted as a release defect or a native-size failure.

## Audit health

| Dimension                |   Score / 4 | Main reason                                                                                     |
| ------------------------ | ----------: | ----------------------------------------------------------------------------------------------- |
| Accessibility            |           2 | Labelled controls and usable dialogs; no keyboard room-corner workflow and hidden library focus |
| Performance              |           2 | Bounded grid; full scene/list work and measured large-scene delays                              |
| Responsive design        |           2 | Phone layouts fit; pan/annotation/off-screen-control gaps remain                                |
| Theming                  |           2 | Tokens exist, but substantial hard-coded editor colors and stale design documentation           |
| Implementation integrity |           2 | Coherent drafting product; fit/data integrity bugs and missing dimension controls               |
| **Total**                | **10 / 20** | **Acceptable structure; significant work needed**                                               |

The product-specific visual system passes the basic coherence check: a drawing surface, object library, scale controls and contextual editing belong together. Dimensional and persistence integrity fail the stricter release-readiness check. The design detector's grid warning is not a reason to remove a functional blueprint grid. Scores are audit judgments, not measured accessibility compliance percentages.

## Prioritized findings

### 01. [P1] Wall attachment silently changes real object dimensions

[features/editor/domain/wall-attachment.ts:83](/Users/holtsdav/Documents/Dev/RoomPlaner/features/editor/domain/wall-attachment.ts:83) · Dimensions / logic

A 100-inch wall-mounted TV is 2,234 mm wide in the catalog. In a 1,000 × 1,000 mm room, attachment reduces it to 1,000 mm; its name and 100-inch image profile remain unchanged. This falsely suggests the product fits. Corner attachments also clamp dimensions.

**Action:** Reject placement or show an explicit resize choice. Preserve original physical dimensions and mark custom sizes. Suggested workflow: `$impeccable harden`.

### 02. [P1] Room measurements describe wall centre lines, not usable inside dimensions

[features/editor/ui/planner-canvas.tsx:1000](/Users/holtsdav/Documents/Dev/RoomPlaner/features/editor/ui/planner-canvas.tsx:1000) · Dimensions / UX

The default room is labelled 4.8 × 3.6 m, but a 120 mm stroke is centred on its boundary: its usable interior is 4.68 × 3.48 m. Room setup says “Bounding width” without explaining this convention. Entering measurements taken inside a room loses 120 mm on each axis. Placement uses the inside wall face, so the discrepancy affects what the app allows to fit.

**Action:** Use interior measurements by default, or explicitly distinguish inside, centre-line and outside measurements throughout setup and wall labels. Suggested workflow: `$impeccable clarify`.

### 03. [P1] Group horizontal mirroring flips the local shape vertically

[features/editor/domain/commands.ts:207](/Users/holtsdav/Documents/Dev/RoomPlaner/features/editor/domain/commands.ts:207) · Logic

Mirroring a zero-degree triangle and square horizontally reflects their centres correctly, but gives each rotation 180 degrees plus a horizontal local mirror. The triangle ends upside down. A reflection across a vertical line should keep its apex up.

**Action:** Use the correct reflection transform for both position and orientation. Test asymmetric shapes at non-zero rotations, not only rectangles. Suggested workflow: `$impeccable harden`.

### 04. [P1] A second tab can overwrite the first tab’s saved changes

[features/editor/persistence/local-plan-repository.ts:42](/Users/holtsdav/Documents/Dev/RoomPlaner/features/editor/persistence/local-plan-repository.ts:42) · Persistence

Two tabs loaded the same room. Tab A renamed it “Edited in tab A” and saved. Tab B moved an object and saved its old revision. The persisted name reverted to “Living room”, with no conflict notice. The save queue serializes only one module instance.

**Action:** Add revision comparison and a transaction at write time, plus cross-tab synchronization or an explicit single-writer lock. Suggested workflow: `$impeccable harden`.

### 05. [P1] One malformed saved room blocks the entire room list

[features/editor/persistence/local-plan-repository.ts:53](/Users/holtsdav/Documents/Dev/RoomPlaner/features/editor/persistence/local-plan-repository.ts:53) · Persistence / recovery

A valid room round-tripped successfully. After adding one malformed record, listLocalPlans threw instead of returning the valid room. This also affects deleteRoom, which deletes first and then reads this list; failure can leave a deleted room open and later eligible for autosave.

**Action:** Validate records independently, return healthy rooms, expose recoverable records separately, and make deletion/switching atomic. Suggested workflow: `$impeccable harden`.

### 06. [P1] Room-corner editing has no keyboard entry point

[features/editor/ui/planner-canvas.tsx:1136](/Users/holtsdav/Documents/Dev/RoomPlaner/features/editor/ui/planner-canvas.tsx:1136) · Accessibility / UX

Wall selection, corner selection and adding a corner exist only as canvas mouse/touch handlers. The keyboard handler can move an already selected corner but cannot select one. PropertiesPanel, which contains coordinate fields, is not imported by any rendered surface. WCAG 2.1.1 keyboard access is therefore incomplete.

**Action:** Expose a DOM-based room-outline editor with corner selection, add/remove controls and X/Y inputs. Also expose exact object X/Y positioning. Suggested workflow: `$impeccable harden`.

### 07. [P1] Imperial dimension labels discard sub-inch precision

[features/editor/domain/plan-document.ts:218](/Users/holtsdav/Documents/Dev/RoomPlaner/features/editor/domain/plan-document.ts:218) · Dimensions

formatMeasurement rounds to whole inches: 1, 3 and 10 mm all display as 0″; 313 mm displays as 1′. Catalog and placed-object labels can differ from the actual footprint by up to 12.7 mm. Metric wall labels above 1 m also round to 0.01 m, losing up to 5 mm.

**Action:** Provide explicit display precision or fractional inches. Keep precise values available beside rounded wall labels; never present non-zero lengths as zero without an approximation indicator. Suggested workflow: `$impeccable clarify`.

### 08. [P2] Visible silhouettes can be smaller than their measured envelope

[features/editor/domain/room-blueprints.ts:418](/Users/holtsdav/Documents/Dev/RoomPlaner/features/editor/domain/room-blueprints.ts:418) · Dimensions / rendering

25 presets differ by more than 3% on at least one visible axis. Actual Konva examples: Era 300 draws 251.68 × 175.75 mm against 260 × 185 mm; a 100-inch standing TV draws 361 mm depth against 380 mm; the 160 mm succulent draws 134.4 mm. Wall TVs intentionally leave mounting depth, but no footprint boundary explains that empty space.

**Action:** Normalize physical silhouettes such as Era 300 to their declared bounds. Distinguish schematic foliage and mounting clearance; show a full measured envelope on selection. See the object matrix for all affected variants. Suggested workflow: `$impeccable harden`.

### 09. [P2] Object height is hidden and mounting height ignores imperial units

[features/editor/ui/object-floating-toolbar.tsx:332](/Users/holtsdav/Documents/Dev/RoomPlaner/features/editor/ui/object-floating-toolbar.tsx:332) · Dimensions / settings

All 178 furniture/device presets have stored heightMm, but the library and active toolbar show width and depth only. There is no object-height editor or room-height model. “Height above floor” edits mountingHeightMm, not object height, and remains 60 cm for the acoustic panel while W/D switch to inches.

**Action:** Expose W × D × H with separate elevation, honor the selected unit system, and describe height as metadata until vertical fit is supported. Suggested workflow: `$impeccable clarify`.

### 10. [P2] Corner alignment is snapped a second time when committed

[features/editor/state/planner-store.ts:542](/Users/holtsdav/Documents/Dev/RoomPlaner/features/editor/state/planner-store.ts:542) · Logic / dimensions

A position of (123,177) mm commits as (100,200) with 50 mm snapping enabled. Canvas drag previews already resolve alignment to arbitrary object edges, then moveCorner applies grid snapping again, so the final corner can jump away from its alignment guide.

**Action:** Separate raw pointer snapping from committing an already resolved coordinate. Preserve exact numeric edits and the displayed drag endpoint. Suggested workflow: `$impeccable harden`.

### 11. [P2] Selection toolbar can sit entirely outside the canvas

[features/editor/ui/planner-canvas.tsx:783](/Users/holtsdav/Documents/Dev/RoomPlaner/features/editor/ui/planner-canvas.tsx:783) · Responsive / UX

Toolbar Y has a minimum but no maximum. With an object at Y=20,000 mm, the toolbar was positioned at page Y=3,139.5 in a 900 px viewport. Selecting an off-screen item from the library does not bring its controls into view.

**Action:** Clamp using actual toolbar height and viewport bounds, or dock controls when the selection is off-screen. Provide “Reveal selection”. Suggested workflow: `$impeccable adapt`.

### 12. [P2] Collapsed object library retains invisible keyboard focus

[features/editor/ui/planner-workspace.tsx:548](/Users/holtsdav/Documents/Dev/RoomPlaner/features/editor/ui/planner-workspace.tsx:548) · Accessibility

After the collapse animation, the aside is 0 px wide but retains 97 potentially focusable buttons, inputs and summaries. Its search input can still receive focus at X=-37 px, partially clipped. This breaks visible focus and navigation order.

**Action:** Apply inert/hidden after collapse and return focus to the library toggle. Do not merely reduce grid width to zero. Suggested workflow: `$impeccable harden`.

### 13. [P2] Phone canvas cannot be freely panned by touch

[features/editor/ui/planner-canvas.tsx:717](/Users/holtsdav/Documents/Dev/RoomPlaner/features/editor/ui/planner-canvas.tsx:717) · Responsive / interaction

Stage dragging requires Space or middle mouse. onTouchStart only clears selection; there is no touch pan/pinch handling or persistent pan tool. Zoom buttons work, but a phone user cannot navigate arbitrary zoomed room regions. This is source-confirmed; no physical-device gesture trace was recorded.

**Action:** Add a pan tool or two-finger pan/pinch with clear one-finger object manipulation, plus keyboard/click alternatives. Suggested workflow: `$impeccable adapt`.

### 14. [P2] Room setup shows a stale room name

[features/editor/ui/room-settings-dialog.tsx:50](/Users/holtsdav/Documents/Dev/RoomPlaner/features/editor/ui/room-settings-dialog.tsx:50) · Logic / forms

After renaming a room to “Audit renamed room”, opening Edit dimensions still showed “Living room” in the name field. The controlled open prop changes outside this component, bypassing its onOpenChange initialization. Editing the stale value can overwrite the current name.

**Action:** Synchronize the draft when the dialog opens or the room ID changes, and commit room-name edits as one undo step. Suggested workflow: `$impeccable harden`.

### 15. [P2] Resetting group scale does not restore original dimensions

[features/editor/ui/multi-object-floating-toolbar.tsx:61](/Users/holtsdav/Documents/Dev/RoomPlaner/features/editor/ui/multi-object-floating-toolbar.tsx:61) · Logic / dimensions

A pair of 127 mm objects scaled to 1% and reset to 100% ended at 100 mm. Each update rescales already rounded integer dimensions, so information is lost; the reset button implies restoration.

**Action:** Keep a gesture/selection baseline and calculate absolute target dimensions from it. Restore the baseline on reset. Suggested workflow: `$impeccable harden`.

### 16. [P2] An imported inches-unit plan changes to metric when grid is toggled

[features/editor/ui/canvas-spacing-controls.tsx:23](/Users/holtsdav/Documents/Dev/RoomPlaner/features/editor/ui/canvas-spacing-controls.tsx:23) · Logic / settings

The document schema accepts units="in", but settingsUnits preserves only "ft-in". Opening a valid "in" plan and clicking Hide grid changed units to "m".

**Action:** Normalize supported unit aliases once at the boundary, or preserve getMeasurementSystem(document.units) in every settings action. Suggested workflow: `$impeccable harden`.

### 17. [P2] Large scenes rebuild substantial geometry and UI on selection

[features/editor/ui/planner-canvas.tsx:1056](/Users/holtsdav/Documents/Dev/RoomPlaner/features/editor/ui/planner-canvas.tsx:1056) · Performance

All objects render regardless of visibility; ObjectFootprint is not memoized and regenerates blueprint paths. The hidden placed-object list is also fully mounted. In the isolated development browser, 500 chairs produced 4,750 Konva shapes and 9,168 DOM nodes; eight selection-to-two-animation-frame samples averaged 94 ms with a 316 ms maximum. This is not an INP or production benchmark. The production planner chunk is about 830 kB raw / 255 kB gzip.

**Action:** Memoize stable footprints/path geometry and expensive overlap work, cull off-screen drawing nodes, defer closed library content, and profile a production trace before choosing further bundle splits. Suggested workflow: `$impeccable optimize`.

### 18. [P2] Wall text becomes too small, and large rooms cannot fit

[features/editor/ui/planner-canvas.tsx:1049](/Users/holtsdav/Documents/Dev/RoomPlaner/features/editor/ui/planner-canvas.tsx:1049) · Responsive / canvas

Wall font size is 90 world units: at MIN_SCALE=.04 it is 3.6 CSS px, and around 4.8 px in the phone capture. A valid 100 × 100 m room remains 4,000 × 4,000 px after Fit room in a 1,152 × 836 px canvas because scale is clamped at .04.

**Action:** Keep annotations legible in screen pixels with collision-aware hiding; allow fit scale to fall below manual-zoom limits or impose an explained room-size limit. Suggested workflow: `$impeccable adapt`.

### 19. [P2] Wall-mounted items may overlap the adjoining wall

[features/editor/domain/wall-attachment.ts:99](/Users/holtsdav/Documents/Dev/RoomPlaner/features/editor/domain/wall-attachment.ts:99) · Logic / fit

A 600 × 100 mm acoustic panel placed at the top-left corner is centred at (300,110). Its left edge reaches X=0 even though the left wall’s interior face is X=60. Endpoint margins use half the object width without adjacent wall clearance. Non-right-angle corners need more than a fixed inset.

**Action:** Solve attachment against usable wall segments and adjoining interior faces; test acute, obtuse and concave corners. Suggested workflow: `$impeccable harden`.

### 20. [P2] PNG export removes measurements and changes grid spacing

[features/editor/ui/room-image-export.ts:240](/Users/holtsdav/Documents/Dev/RoomPlaner/features/editor/ui/room-image-export.ts:240) · Export / dimensions

The export renderer never draws wall dimensions or a scale legend. It substitutes max(gridSizeMm, ceil(worldWidth/120), ceil(worldHeight/120)) for grid spacing; a fine chosen grid can become an arbitrary spacing without disclosure. PNG therefore cannot be interpreted as a dimensioned plan.

**Action:** Add measurement/scale-legend export options, and choose major grid multiples while identifying the exported spacing. Suggested workflow: `$impeccable clarify`.

### 21. [P2] Required check command fails on formatting

[features/editor/state/object-variant.test.ts:1](/Users/holtsdav/Documents/Dev/RoomPlaner/features/editor/state/object-variant.test.ts:1) · Verification

npm run check exits before lint, types, tests and build because this file fails oxfmt. Running the remaining checks separately passes all 103 tests and the production build.

**Action:** Format the affected test and run the prescribed check command. Keep an explicit release gate for interaction regressions found here. Suggested workflow: `$impeccable harden`.

### 22. [P3] Product documentation and design tokens lag the implementation

[README.md:6](/Users/holtsdav/Documents/Dev/RoomPlaner/README.md:6) · Implementation integrity

README and PRODUCT.md still describe catalog/openings/export as future work although the current application includes catalog families, doors/windows and PNG/JSON export. DESIGN.md describes a navy brand rail absent from the current white header. The detector reports palette/type drift; its decorative-grid warning is a false positive for this drafting product. Axe found a missing level-one heading on desktop, not a contrast failure.

**Action:** Refresh capability/design documentation after functional fixes and add a meaningful level-one heading. Do not apply dark mode until hard-coded canvas/toolbar colors are deliberately supported. Suggested workflow: `$impeccable document`.

## Dimension reference status

Generic categories do not have one universally correct size. Their numbers are representative planning envelopes, not a guarantee that every chair, 55-inch television or wardrobe has those dimensions. The internal checks cover every preset; fresh manufacturer checks cover the **18 explicitly branded Sonos/Apple presets**. The remaining 166 are marked generic/reference-based in the matrix, including office presets whose selected reference products are documented in the earlier [office audit](../../product/home-office-dimension-audit.md). Those office source documents were not all independently remeasured in this pass.

Seventeen of the 18 branded presets match the cited manufacturer values after rounding to integer millimetres. **Beam Gen 2 has a source discrepancy**: the app rounds a historical 68.6 mm height to 69 mm, while its current product page gives 68 mm. This needs an explicit model/source decision; it is not evidence that the app's width/depth axes are reversed. See [fresh source checks](sources.md).

TV/projector image dimensions correctly use 16:9 diagonal geometry and remain separate from floor depth. Beds correctly distinguish US mattress sizes from the app's generic frame allowance. Real installation clearance, cable plugs, open drawers/appliances, recline, door opening rough-in and regional bed conventions are not comprehensively modelled. The existing conservative envelope overlap logic supports ordering/placement heuristics; it is not a physical fit certificate.

## Additional settings worth adding

| Setting or control                                              | Why it helps                                                                |
| --------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Room dimensions: inside / centre line / outside                 | Removes the 120 mm ambiguity in the default room                            |
| Display unit and precision, including decimal/fractional inches | Preserves small device dimensions and exact wall measurements               |
| Aspect-ratio lock and “custom size” indication                  | Prevents accidental distortion and misleading unchanged product labels      |
| Object height, elevation and optional room height               | Makes stored H visible; separates object size from distance above the floor |
| Show measured envelope and user-entered clearance               | Explains gaps between schematic outlines and physical planning bounds       |
| Snap modes: grid / alignment / walls, plus temporary bypass     | Makes placement behavior predictable and preserves precise edits            |
| Pan tool and Reveal selection                                   | Makes mobile and off-screen object editing practical                        |
| Export dimensions, grid spacing and scale legend                | Produces a shareable plan whose measurements remain interpretable           |

These are recommendations, not settings added by this audit. Collision/clearance warnings should be advisory and height-aware where possible, because devices intentionally overlap desks in top view.

## What works well

- Canonical integer millimetres and a renderer-independent schema prevent zoom from rewriting physical dimensions.
- Shared blueprint functions keep previews, canvas and PNG geometry broadly consistent.
- Positive dimensions, unique IDs, valid group membership and non-crossing room boundaries are validated.
- Undo/redo, locked-object protections, named variants, JSON copies and saved profiles have useful existing regression coverage.
- Actual input testing confirmed 123.4 cm commits to 1,234 mm, undo returns 1,200 mm, Escape restores the original, and negative dimensions are rejected.
- Room operation locking, serialized autosave, preserved recovery copies and export-backup controls are useful foundations for fixing the storage issues.
- The phone layout keeps its selected toolbar within horizontal bounds and uses larger touch targets. The main remaining mobile issues concern canvas navigation and annotation legibility.

## Recommended order

1. `$impeccable harden`: fix dimension-preserving attachment, reflection, persistence conflicts/recovery and keyboard editing.
2. `$impeccable clarify`: settle measurement conventions, precision, height/elevation labels and export meaning.
3. `$impeccable adapt`: touch pan, screen-space labels and off-screen toolbar placement.
4. `$impeccable optimize`: measure and reduce full-scene/list work, then verify production behavior.
5. `$impeccable document`: align product/design documentation with the actual editor.
6. `$impeccable polish`: final visual/focus pass after the functional fixes.

You can request these one at a time or together. Re-run the audit after fixes; current tests passing does not cover the newly reproduced failures.

## Reproduction artifacts and limits

[Raw geometry](evidence/dimensions.json), [actual canvas measurements](evidence/canvas.json), [edge cases](evidence/edges.json), [logic cases](evidence/logic.json), [two-tab overwrite](evidence/multi-tab.json), [development performance samples](evidence/performance.json), and [browser screenshots](evidence/desktop.png) are included. The screenshot [mobile selection](evidence/mobile-selected.png) shows the mixed-unit elevation field and tiny wall labels. [Off-screen toolbar](evidence/offscreen-toolbar.png) demonstrates the missing control clamp.

The scripts in `scripts/` are audit harnesses, not new production dependencies or a replacement CI suite. They use disposable browser profiles, and require Playwright, @axe-core/playwright, a Chromium executable and a running Vite development server. Set `AUDIT_URL`, `AUDIT_OUTPUT` and optionally `AUDIT_BROWSER` before running. The dev server must expose source-module imports. Detailed assertions and recorded observations should be converted into focused regression tests when the respective defects are fixed.

No exhaustive physical-device matrix, production load trace, every possible polygon, third-party hardware revision or every possible multi-tab scheduling interleaving was tested. No repairs or deployment were requested or performed.
