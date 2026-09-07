# Consumer audit remediation

The 17 findings in [the baseline audit](audit.md) have corresponding implementation
changes below. The original report and evidence describe commit `9f7bba5` and remain
historical; they are not a report of the patched application.

| Finding                       | Remediation                                                                                                                                                                                                         | Regression coverage                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1. Storage denial crashes     | Guard preference access; keep an editable in-memory recovery plan if IndexedDB fails. Preference failures cannot invalidate committed database writes.                                                              | Denied-storage and denied-preference browser scenarios; storage unit tests                                |
| 2. Deployment data overlap    | Preserve consumer database/key names; use independent develop and local namespaces without copying consumer records.                                                                                                | Namespace unit tests; real IndexedDB preservation scenario                                                |
| 3. Recovery timeout           | Remove automatic dismissal, retain explicit dismissal, and reopen from the persistent save-status button. Bound the recovery surface to the viewport.                                                               | Actual two-tab conflict held for 30 seconds, saved as a separate copy; denied-storage recovery and export |
| 4. Clipped dialogs            | Shared dialogs and alerts use a viewport height limit, internal scrolling and overscroll containment.                                                                                                               | 667 × 320 settings interaction; [production screenshot](evidence/fixed-landscape-settings.png)            |
| 5. Touch multi-selection      | Add Select multiple / Done selecting to Placed in room, retaining the library while choosing separate objects.                                                                                                      | Desktop and emulated-phone grouping; [production screenshot](evidence/fixed-mobile-multiple.png)          |
| 6. Keyboard outline editing   | Room setup exposes corner selection, X/Y fields, addition, removal and associated validation feedback.                                                                                                              | DOM-only outline editing, addition and deletion; existing geometry/undo tests                             |
| 7. Text undo                  | Exclude text-editing and dialog targets before handling plan-history shortcuts.                                                                                                                                     | Native undo within a rename field leaves plan history intact                                              |
| 8. Unbounded imports          | Enforce 5 MB total, 20 rooms, 500 objects, 250 groups, 256 corners, bounded identifiers/names/profiles and finite geometry. Check file sizes before reading; stop excessive polygon work before intersection loops. | Oversized bytes, 30,000 vertices, excessive objects/rooms/strings, valid-copy import                      |
| 9. Invalid inside walls       | Share a pure interior validator across schema/import and room edits. Reject inverted/collapsed/intersecting inner faces while allowing short valid interior faces.                                                  | Inverted 10-metre thickness, collapsed room and valid 28-mm face regressions                              |
| 10. Placement false negatives | Accept exact boundary contact; try a 90-degree orientation while preserving physical dimensions; describe a failed search accurately.                                                                               | Exact fit and rotated narrow-room placement                                                               |
| 11. Response security         | Add anti-framing, nosniff, referrer and permissions headers. Nonce SSR scripts with a matching CSP; keep HTML non-cacheable and asset caching intact.                                                               | Compiled-response assertions plus real hydration and exports under CSP                                    |
| 12. Release CI gaps           | CI exercises local Vinext and both actual Worker builds with desktop/mobile browsers; development authentication and throttling are tested against isolated local Durable Objects.                                  | `test:browser`, `test:release`, existing gate test                                                        |
| 13. Broken local assets       | Use Vinext's Node RSC development server when there are no local Cloudflare storage bindings; retain Cloudflare for deployment builds.                                                                              | Real development CSS, browser bootstrap, canvas and persistence flows                                     |
| 14. Silent numeric rejection  | Accept decimal comma or point; preserve invalid drafts with associated error text and aria-invalid; Escape restores the valid value.                                                                                | Decimal comma, invalid text, blur and Escape through Room setup                                           |
| 15. Unsaved starter           | Persist the starter before claiming saved; use separate IDs for simultaneous fresh tabs; preserve editable state on failure.                                                                                        | Pending/rejected initial-write unit tests; browser reload and room-list checks                            |
| 16. Dimension provenance      | Expose reference models, source links and recorded check dates, generic planning labels, and clearance exclusions in the library and object details. Preserve preset identity after edits/renaming.                 | Manufacturer/generic provenance and serialization regressions                                             |
| 17. Stale docs/copy           | Correct 207 presets, inside dimensions, touch navigation, keyboard corner controls, import limits, and the new-room inside size.                                                                                    | Copy and implementation review                                                                            |

## Verification

Run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`,
`npm audit --omit=dev --audit-level=high`, `npm run test:browser`, and
`npm run test:release`. The unit suite contains 170 tests. The browser suite has
10 scenarios at desktop and phone sizes (20 cases) and is run against local
development plus each compiled deployment. The release script also checks the
password gate, CSRF rejection, asset protection, session behavior, login limits,
base paths, and response security headers. No test deploys to Cloudflare.

The local machine uses its installed Chromium (Helium) through
`PLAYWRIGHT_EXECUTABLE_PATH`; CI installs Playwright's managed Chromium. Custom
local browsers run in separate processes per test because Helium can exit when
contexts close. The phone tests emulate touch and viewport characteristics;
physical-device and screen-reader certification are not implied.

Namespaces prevent accidental cross-environment changes, not access by another
script on the same origin. Consumer storage names are preserved. Newly unsupported
legacy records remain stored, and failed loading creates a separate recovery plan.
Automatic placement remains a bounded conservative search, not a proof that no
arbitrary rotated arrangement could fit. Published reference links may change;
clearance and actual-product measurements still need to be considered by the user.
