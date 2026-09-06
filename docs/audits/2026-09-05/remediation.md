# Audit remediation — 5 September 2026

The 21 requested findings from [the original audit](audit.md) have been addressed. Finding 06, the keyboard entry point for room-corner editing, is intentionally unchanged at the user's request. The original audit and evidence remain a historical snapshot.

The editor is running locally at http://localhost:3000. Changes are local; no deployment or commit was made.

## Requested additions

- **TV with Stand** and **Wall-mounted TV** are separate library families, each with nine screen sizes. Existing preset IDs remain stable. Legacy TV profiles and automatic names are recovered, while custom names are preserved.
- **Object color** is available in both contextual toolbars. Changes apply to individual objects, groups, and multiple selections, support Undo, and persist through saves and JSON. Locked members retain their colors. Canvas, previews, and PNG use the same palette.
- Useful controls added: object height in the active unit system, a touch pan tool, reveal selection, and PNG grid/dimension options. Mounting elevation remains separate from object height. No unrelated planner preferences were added.

## Findings addressed

| Finding                                   | Result                                                                                                                                                                                                                                                                                 |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01, 19 — Physical size and wall clearance | Mounting never shrinks physical objects. Oversized new objects are rejected; existing objects that no longer fit retain their dimensions and show a warning. The full rotated envelope is checked against adjacent walls and concave notches, including either boundary direction.     |
| 02 — Room measurement convention          | Room setup, the canvas, accessible descriptions, and PNG explain centreline measurements. Saved coordinates are retained. Rectangular interior dimensions differ by the wall thickness.                                                                                                |
| 03 — Group mirroring                      | Horizontal reflection now combines the correct rotation with the local mirror transform.                                                                                                                                                                                               |
| 04 — Competing tabs                       | IndexedDB writes compare observed revisions within a transaction. A conflicting tab retains its edits and offers Save a copy.                                                                                                                                                          |
| 05 — Damaged local records and deletion   | Each list record is validated independently. Deletion and selecting a healthy successor are transactional. Failed successor validation leaves the original room intact; delayed saves cannot resurrect deleted rooms.                                                                  |
| 07 — Measurement rounding                 | Imperial labels retain two decimal places of inches; metric wall labels retain millimetres. Nonzero millimetre measurements no longer display as zero.                                                                                                                                 |
| 08 — Physical silhouettes                 | Era 300 and plant paths fill their unchanged measured bounds. Standing TV feet and wall-TV mounting brackets account for the full declared envelope. Selection shows the complete measured outline. Extreme generic-object insets and an SVG arc rounding anomaly were also corrected. |
| 09 — Height and elevation                 | Catalog variant menus display W × D × H. An expandable contextual row shows object height and mounting elevation and exposes their metric or imperial inputs. Abstract shapes explicitly indicate an unset height.                                                                     |
| 10 — Corner snapping                      | The store preserves the canvas-resolved or explicitly entered coordinate instead of snapping it again.                                                                                                                                                                                 |
| 11 — Off-screen toolbars                  | Toolbar placement uses its measured height and canvas bounds, with scrolling in short viewports. Reveal selection returns the object to view.                                                                                                                                          |
| 12 — Hidden sidebar focus                 | The collapsed tray is inert and closing it returns focus to the canvas.                                                                                                                                                                                                                |
| 13 — Touch navigation                     | The pan tool enables one-finger canvas dragging without moving objects or clearing selection. Zoom buttons remain available.                                                                                                                                                           |
| 14 — Stale room names                     | Room setup initializes from the current room on opening. Name edits commit on blur/Enter as one change.                                                                                                                                                                                |
| 15 — Group scaling drift                  | Absolute scale and rotation use captured geometry. Reset restores original integer dimensions and positions; external transforms/Undo establish a fresh baseline.                                                                                                                      |
| 16 — Imported imperial alias              | Grid and snap actions preserve the imperial measurement system for documents using the `in` alias.                                                                                                                                                                                     |
| 17 — Performance                          | Closed library contents mount on expansion; canvas objects outside the viewport are culled; artwork and geometry are reused. The canvas loads in a separate bundle.                                                                                                                    |
| 18 — Zoom and annotations                 | Wall text stays at 12 screen pixels. The fit range accommodates a 100 m room on the canvas.                                                                                                                                                                                            |
| 20 — PNG measurements                     | PNG can include wall dimensions and grid, always includes a scale legend, and uses whole multiples of the configured grid.                                                                                                                                                             |
| 21 — Repository formatting                | The existing variant-test formatting failure was corrected.                                                                                                                                                                                                                            |
| 22 — UI/documentation drift               | H1 structure is present, control colors use semantic primary tokens, and README, PRODUCT, and DESIGN describe the implemented editor.                                                                                                                                                  |

The Beam Gen 2 preset height was updated to **68 mm** after confirming the current metric technical specification on the [Sonos product page](https://www.sonos.com/en-us/shop/beam). Existing saved object heights are retained until the user changes the variant or height. Other silhouette corrections preserve catalog physical dimensions.

## Verification

- **114 unit tests across 17 files**, plus formatting, lint, typecheck, and production build.
- **184 presets**, **2,760 SVG geometry/scale cases**, and **552 actual Konva checks**: no failures. See the [updated object matrix](remediation/dimensions.md) and [raw geometry](remediation/dimensions.json).
- **1,226 displayed W/D/H/elevation checks** across metric and imperial units, plus **16 extreme legacy-shape cases**: no failures. Display conversion tolerance is at most 0.13 mm. [Field evidence](remediation/measurement-fields.json).
- Real UI checks cover group color Undo, locked members, exact scale reset, both TV families, color persistence, PNG options, toolbar bounds at 1440/390/320 pixels, touch panning, two-tab conflicts and copy recovery, corrupt records, atomic deletion, and delayed-save protection. [Results](remediation/verified-fixes.json).
- Axe found no violations in desktop, selected desktop, or phone samples; no application page errors were observed. The excluded corner-keyboard issue remains outside these automated checks.
- The comparable 500-object development benchmark improved from **94.2 ms to 38.2 ms** mean selection-to-two-animation-frame time. DOM nodes fell from **9,168 to 414**, and Konva shapes from **4,750 to 2,457**. These are development measurements, not production INP or physical-device benchmarks. [Before](evidence/performance.json), [after](remediation/performance.json).
- The production build no longer reports a JavaScript chunk over 500 kB.

Height and elevation remain metadata in a top-down editor; they do not simulate vertical clearance. Generic catalog dimensions remain editable examples. The bounded tests establish the reported cases rather than an exhaustive guarantee for every possible imported polygon.

## Repeating the browser checks

The scripts use Playwright and, for the broader audit, `@axe-core/playwright`. They create isolated browser contexts and do not access the user's existing room storage. Install these tools in a temporary directory, copy a script there so it can resolve those dependencies, create an output directory, and run with:

```sh
AUDIT_URL=http://localhost:3000 \
AUDIT_BROWSER=/path/to/chromium \
AUDIT_OUTPUT=/path/to/results \
node verify-fixes.mjs
```

Current scripts: [interaction fixes](scripts/verify-fixes.mjs), [all measurement fields](scripts/verify-measurement-ui.mjs), [Konva matrix](scripts/verify-canvas.mjs), and [geometry/accessibility/performance](scripts/verify-audit.mjs).

Visual evidence: [320px phone](remediation/verified-320.png), [390px phone](remediation/verified-390.png), and [colored PNG export](remediation/colored-export.png).
