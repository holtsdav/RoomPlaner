# Room Planner consumer release audit — 6 September 2026

This is the baseline audit of commit `9f7bba5`. See the [remediation record](remediation.md) for the subsequent fixes and regression coverage.

**Release recommendation: HOLD.** The application builds and its ordinary editing flows work on desktop and mobile, but six major issues remain in storage resilience, environment separation, mobile controls, and keyboard accessibility. Passing the build and automated accessibility scans does not resolve these issues.

Audited commit: `9f7bba59e77d56c9cb3d0a32626757e6e7b6351e`. The working tree was clean at the start. This audit adds documentation, test scripts, and evidence only; it does not fix application code or deploy a release. [Source hashes](evidence/source-manifest.json) identify the implementation reviewed.

**17 actionable findings: 0 P0, 6 P1, 11 P2, 0 P3.** P1 means fix before a general consumer release. P2 means a concrete defect or hardening gap with a workaround or narrower impact. Findings below distinguish reproduced behavior from conclusions based on deployment configuration. No P0 security compromise or universal production outage was found within the tested scope.

**Implementation integrity: coherent product design; release readiness fails.** The drafting canvas, millimetre document model, shared blueprint renderer, and touch editor form a consistent application. The detector returned twelve advisory findings: eight palette values, three font sizes, and one grid-background warning. None was a deterministic failure. A drafting grid is appropriate here; an unused background utility is not evidence of a consumer defect. The important problems are interaction and data boundaries, rather than visual decoration. [Detector output](evidence/design-detector.json).

| Interface dimension      | Score / 4   | Assessment                                                                                                                                                                                 |
| ------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Accessibility            | 2           | Named controls and useful canvas descriptions, but corner editing cannot be entered with a keyboard.                                                                                       |
| Performance              | 3           | Good sampled ordinary editing; unrestricted import validation can block the main thread.                                                                                                   |
| Responsive design        | 2           | Main editor and touch sheets work across tested sizes; Settings is clipped in short viewports and touch cannot initiate multiple selection.                                                |
| Theming                  | 3           | Coherent light appearance and semantic base tokens, with literal drafting colors. No user-facing dark-mode feature was found, so unsupported dark mode is not treated as a release defect. |
| Implementation integrity | 3           | Clear domain boundaries and substantial regression coverage; production pathways and documentation have drifted from the repeatable checks.                                                |
| **Total**                | **13 / 20** | **Significant work remains. This interface score is not a security or release certification.**                                                                                             |

## Evidence and scope

The review covered both application routes, the active editor components, geometry and command model, catalog/profile implementation, Zustand state, IndexedDB persistence, import/export, touch and keyboard handlers, responsive CSS, shared primitives used by these flows, Worker/login coordinator, deployment configuration and scripts, package lock, and CI. Unused UI-library components and future product plans were inventoried, but were not treated as shipped functionality.

| Check                                           | Fresh result                                                                                                                                                                           | Evidence                                                                                     |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Formatting, lint, TypeScript, unit tests, build | Passed; **159 tests in 26 files**                                                                                                                                                      | [Full check](evidence/check.log)                                                             |
| Actual deployment builds                        | Production and development builds passed                                                                                                                                               | [Production](evidence/production-build.log), [development](evidence/develop-build.log)       |
| Dependency vulnerability audit                  | Zero advisories reported across production and development dependencies at audit time                                                                                                  | [npm result](evidence/dependencies.json)                                                     |
| Chromium production browser flows               | Passed at 1440×900, 390×844, 320×568, 844×390, 768×1024                                                                                                                                | [Results](evidence/release-ui.json)                                                          |
| WebKit production browser flows                 | Same five sizes passed JSON export, PNG export, room resize, and persistence after reload                                                                                              | [Results](evidence/release-webkit.json)                                                      |
| Automated accessibility                         | Chromium: no violations in ten initial/selected samples. WebKit: clean initial samples; focus-guard findings in four touch sheets, qualified below                                     | Browser results above                                                                        |
| Catalog SVG geometry                            | **207 presets, 3,105 geometry/scale cases; zero failures**                                                                                                                             | [Matrix](evidence/matrix/dimensions.json)                                                    |
| Persistence and existing regressions            | Conflict/copy recovery, corrupt-record isolation, atomic deletion, prevention of deleted-room resurrection, colors/Undo, locked colors, TV variants, exports and toolbar bounds passed | [Results](evidence/regressions/verified-fixes.json), [log](evidence/regressions-current.log) |
| Touch gestures                                  | Empty-space pan, intentional object drag, and two-finger pinch passed                                                                                                                  | [Measured transforms](evidence/gestures.json)                                                |
| Development gate                                | Authentication, CSRF, gated assets, base paths, forged sessions, per-IP/global limits, existing-session survival passed                                                                | [Smoke test](evidence/deployment-test.log)                                                   |
| Additional request checks                       | Wrong content type 415; oversized form 413; null Origin 403                                                                                                                            | [Results](evidence/deploy-extra.json)                                                        |
| Production client bundle                        | Nine JS chunks: 1,278,077 bytes raw, 392,035 bytes gzip summed; largest chunk 481,646 bytes raw                                                                                        | [Bundle inventory](evidence/bundles.json)                                                    |
| Main-thread import work                         | Accepted 30,000-corner, 806,564-byte file took **3,568.9 ms** to parse/validate once                                                                                                   | [Probe](evidence/final-probes.json)                                                          |
| Sampled editor performance                      | 500 objects: **34.3 ms mean** selection-to-two-animation-frames in the source harness                                                                                                  | [Measurements](evidence/matrix/performance.json)                                             |
| Unit coverage                                   | 79.18% lines, 72.63% branches of modules included by the coverage run; repository persistence only 4.54% lines                                                                         | [Coverage](evidence/coverage.log)                                                            |

Browser production checks used the built Worker locally at `/RoomPlaner`, with isolated browser contexts. They did not touch the user's saved rooms. Source-level probes and the prior geometry/persistence scripts ran against the same current editor source in a temporary Vite harness at port 3011, because normal `npm run dev` served broken asset URLs (finding 13). The harness bypasses Vinext SSR/Worker plumbing and is **not** evidence that the normal development command works. Production-browser results separately cover the compiled application.

The older `verify-mobile.mjs` and the Pan section of `verify-fixes.mjs` reference a control removed from the current application. Their failures are not attributed to a missing required Pan button. The retained adaptation skips that obsolete section and records the skip; the new gesture probe checks current behavior. The 207-preset matrix is a fresh run of the existing SVG-envelope suite, not a fresh manufacturer certification or a rerun of every historical Konva/measurement-field case.

## P1 — fix before consumer release

### 1. Storage access denial prevents the entire editor from opening

**Location:** `features/editor/ui/planner-workspace.tsx:353–358`, `:382–385`; related repository storage access at `features/editor/persistence/local-plan-repository.ts:44`, `:68`, `:118`, `:140`.

The sidebar-shortcut initializer reads `window.localStorage` during render without catching `SecurityError`. In a production-browser context where storage access throws, no canvas appears; the user receives only “This page couldn’t load” and Reload/Back. The persistence recovery path never gets a chance to provide an editable temporary room. [Reproduction data](evidence/adversarial.json), [screenshot](evidence/storage-denied.png).

Writes to the preference/active-room keys are also unguarded. Several happen after an IndexedDB transaction has already committed, so a localStorage write failure can make a successful database mutation look like a failed operation. Optional chaining does not catch a throwing storage getter or method.

**Required behavior:** isolate preference storage failures, open an in-memory editor when persistent storage is unavailable, show a durable unsaved-state message, and keep JSON export usable. Treat IndexedDB commit success separately from active-room preference failure. Verify denied reads and writes, not just missing APIs. Suggested remediation: `$impeccable harden` plus persistence changes.

### 2. Development and production use the same browser database

**Location:** `features/editor/persistence/local-plan-repository.ts:23–32`; `wrangler.jsonc` production/development route and base-path declarations.

Both deployments live on `https://holtsdav.com`, and both open IndexedDB database `room-planner`, version 1, with the same active-room and shortcut keys. Paths `/RoomPlaner` and `/dev/RoomPlaner` do not isolate browser storage. This is a configuration/code finding, supported by the [origin boundary defined for IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Terminology). The browser determines isolation by scheme, host, and port, not application path.

A person visiting both versions can edit or delete their production rooms from the development application. A later experimental migration can affect the same database. Transaction conflict detection protects concurrent revisions; it does not separate environments. The development password does not change this boundary.

**Required behavior:** use a separate development origin, preferably, or explicitly separate database/preference names with a migration that preserves current production rooms. A name prefix prevents accidental mixing; a separate origin provides an actual security boundary. Confirm that editing/deleting/migrating in development leaves production records untouched.

### 3. Recovery controls disappear while a save conflict remains unresolved

**Location:** `features/editor/ui/room-actions.tsx:130–137`, `:582–637`.

Reproduced with two tabs: save a room in tab A, edit it in B, save another revision in A, then save B. B correctly reports a conflict and offers **Save a copy**. After eight seconds, the action disappears while `saveStatus` is still `error` and the conflict remains. The small status label survives, but does not reopen recovery or expose the copy action. [Actual two-tab results](evidence/persistence-touch.json), [post-timeout screenshot](evidence/conflict-after-timeout.png).

This makes preserving unsaved work dependent on noticing and acting within a brief interval. Retrying through the room menu can bring the error back, but that is an undisclosed workaround. The preliminary synthetic error timing in `adversarial.json` was superseded by this actual conflict reproduction.

**Required behavior:** keep unsaved/conflict actions available until resolved or explicitly dismissed, and make a persistent save-status control reopen them. Test a conflict left open for at least 30 seconds and successful copy/export afterward. Suggested remediation: `$impeccable harden`.

### 4. Settings is clipped beyond short and landscape viewports

**Location:** `features/editor/ui/planner-settings-dialog.tsx:147`; shared `components/ui/dialog.tsx:56–63`.

The Settings dialog uses a centered, content-sized popup without maximum height or internal scrolling. At 844×390, the captured opening geometry extends approximately 49 px above and below the viewport; at 390×350 it extends approximately 90 px above and below. The popup has `overflow-y: visible`, while background scrolling is locked. Controls and close actions leave the usable viewport. Room setup already has a bounded scrolling treatment; Settings does not. [Geometry](evidence/layout-edges.json), [landscape screenshot](evidence/settings-844x390.png), [short viewport](evidence/settings-390x350.png).

The 390×350 case is a short layout-viewport stress test, not a claim to reproduce an actual iPhone keyboard. The landscape failure was directly reproduced. This also matters for browser zoom and enlarged text: controls surrounding a two-dimensional canvas still need to remain usable. See [W3C reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).

**Required behavior:** bound popup height to available viewport space, make the content scrollable, and keep close/focused controls reachable. Verify the Settings, export, new-room, rename, and confirmation popups at short heights and with real mobile keyboards. Suggested remediation: `$impeccable adapt`.

### 5. Touch users cannot initiate selection of separate objects together

**Location:** `features/editor/ui/object-footprint.tsx:36–39`; `features/editor/ui/planner-workspace.tsx:98–101`; `features/editor/ui/planner-canvas.tsx:1010–1038`; `features/editor/ui/canvas-touch-controller.ts`.

Both canvas and placed-object selection require Shift for additive selection. Marquee selection is mouse-driven. The touch controller uses one finger to manipulate/pan and two fingers for navigation, with no touch selection mode, checkbox list, or “add to selection” action. Tapping the sofa then the table leaves only the table selected. [Touch selection result](evidence/persistence-touch.json).

The multi-object editor can operate on an existing group or a selection injected by a test, but a phone user cannot create that initial selection using the visible controls. Grouping, bulk color, scale, rotation, and multi-object layout operations are therefore incomplete on mobile.

**Required behavior:** provide an explicit touch multiple-selection action or selectable object list, with clear selected state and an exit action. Verify selecting two previously ungrouped objects, grouping them, editing them, and ungrouping using touch only. Suggested remediation: `$impeccable adapt`.

### 6. Room-corner editing has no keyboard entry point

**Location:** `features/editor/ui/planner-canvas.tsx:1120–1397`, particularly `:1293–1320`; keyboard handler at `:467`.

Corner selection and insertion are initiated through Konva wall/corner handlers. Canvas dots are not DOM controls in the tab order, and the current UI has no keyboard-accessible corner or wall list. Arrow-key movement and Delete work **after** a pointer selects a corner, which does not make the full operation keyboard accessible. The unused `PropertiesPanel` does not solve entry in the shipped workspace.

This blocks reshaping a polygonal room using keyboard-only or assistive input. The prior audit recorded this as excluded work; the present request covers the complete consumer release, so it remains in scope. See [WCAG keyboard guidance](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html).

**Required behavior:** expose named wall/corner controls and keyboard actions to select, insert, move, and remove corners, with invalid-geometry feedback. Include a keyboard-only test starting from a freshly opened room. Suggested remediation: `$impeccable harden`.

## P2 — correctness, resilience, and release-process gaps

### 7. Undo in a text dialog changes the plan behind the dialog

**Location:** `features/editor/ui/planner-canvas.tsx:396–405`.

The global Cmd/Ctrl+Z/Y handler deliberately runs before input/dialog exclusions. Reproduction: move sofa X from 1450 to 1500 mm, open Rename room, type a draft, then press Cmd+Z. Sofa X reverts to 1450 while the typed draft remains unchanged. [Before/after](evidence/adversarial.json).

The code comment makes this an intentional policy, but it is surprising for name/search text and can change a plan the user cannot see. Preserve native text Undo in ordinary text fields and define separate behavior for live geometry fields. Test both empty and nonempty plan history, and Undo/Redo while a modal is open. Suggested remediation: `$impeccable harden`.

### 8. Import validation accepts unbounded main-thread work

**Location:** `features/editor/ui/room-actions.tsx:245–266`; `features/editor/domain/room-files.ts:7–12`; `features/editor/domain/plan-document.ts:52–73`; `features/editor/domain/polygon.ts:66–89`.

All selected files are fully read, parsed and validated without per-file/aggregate byte limits or object/corner/name-count limits. Polygon validation compares nonadjacent edge pairs. A valid 806,564-byte file with 30,000 corners was accepted and took 3.57 seconds in **one** parsing call on this desktop. The UI import path validates again before saving/copying and then renders the accepted document. [Scaling measurements](evidence/import-edges.json), [30,000-corner probe](evidence/final-probes.json).

This is a local file-triggered denial of responsiveness, not a demonstrated remote exploit. A large backup or shared file can freeze the editor, with worse expectations on slower phones. Define supported file size, room count, object count, corner count and string lengths before expensive validation. Provide progress/cancellation for supported large imports; consider a worker for parsing/geometry validation. Suggested remediation: `$impeccable harden`, `$impeccable optimize`.

### 9. Accepted documents can have impossible interior geometry

**Location:** `features/editor/domain/plan-document.ts:48–59`; `features/editor/domain/room-measurements.ts:61–68`; corner commit validation in `features/editor/state/planner-store.ts`.

The schema requires a simple centreline polygon and positive wall thickness, but not a valid usable interior. A starter 4800×3600 mm boundary with 10,000 mm wall thickness is accepted. Its offset “inside” bounds report **5200×6400 mm**, although wall material has consumed the interior. Large coordinates such as a 10¹² mm room are also accepted. [Schema and bounds probe](evidence/adversarial.json).

The Settings thickness input has limits, but imports bypass them; corner edits likewise validate the centreline, not the inset geometry. Put coherent range and interior-validity constraints at the document boundary. Invalid legacy rooms should be preserved for export/recovery, rather than rendered as trustworthy dimensions. Test concave outlines and narrow passages as well as rectangles.

### 10. Automatic placement incorrectly says some fitting objects cannot fit

**Location:** `features/editor/domain/placement.ts:26–39`, `:40–101`; rejection copy in `features/editor/state/planner-store.ts:367–373`.

The test envelope adds 1 mm extra clearance on each side and only tries the preset's unrotated orientation. A 2000 mm-wide object is rejected in a room with exactly 2000 mm inside width. A 1500×800 mm object is rejected in a 1000×2000 mm interior even though a 90° rotation fits. [Exact-fit case](evidence/adversarial.json), [rotated-fit case](evidence/final-probes.json).

The message states that the object does not fit, although the search is conservative and incomplete. Test at least orthogonal rotations and boundary tolerances, or allow placement into a staging area with an honest explanation. Keep any recommended real-world clearance distinct from geometric fit.

### 11. Production responses omit basic document security policies

**Location:** `worker/index.ts:116`; policy currently defined only for login/development responses.

The local production response and a read-only GET to the configured live production URL both lacked Content-Security-Policy, an anti-framing policy, X-Content-Type-Options, and an explicit Referrer-Policy. The development login page includes these protections. [Live production headers](evidence/live-production-headers.txt), [development headers](evidence/live-develop-headers.txt).

No XSS was demonstrated; user strings use React rendering and colors are constrained. This is a defense-in-depth gap, including unwanted framing of an editor with destructive actions. Apply an intentional policy to production HTML and appropriate asset headers; test a compatible CSP against SSR/bootstrap scripts and exports. Keep an explicit embedding policy. Do not copy the login page's `default-src 'none'` directly onto the application. See [Cloudflare Workers guidance](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/).

### 12. CI does not test what the deployment commands actually ship

**Location:** `.github/workflows/ci.yml:53–60`; `vite.config.ts:57–59`; `package.json`; old scripts at `docs/audits/2026-09-05/scripts`.

CI runs `npm run build`, which uses the default local binding configuration. Actual deployment runs `build:production` or `build:develop`, selecting the custom Worker, different base paths, and development gate. CI runs neither the Worker smoke test nor browser interactions. Browser scripts depend on separately installed tooling and include the obsolete Pan-control checks described above.

The audit separately built and exercised both deployment targets, so this is not a claim that they currently fail. It is a regression-detection gap: the checks that would catch environment-specific failures are outside the required pipeline. Add reproducible browser tooling, actual deployment-build checks, and local Worker smoke tests to CI, including mobile sheets, reload persistence, and conflict recovery. Coverage percentages do not substitute for those checks; the reported unit coverage excludes untouched UI/Worker modules.

### 13. The documented development command returns 404 for required assets

**Location:** `package.json` dev script; `vite.config.ts:52–60`; `.openai/hosting.json` and Vinext integration.

Both the initially running server and a fresh restart of `npm run dev` returned HTML referencing `/app/globals.css` and `/@id/__x00__virtual:vite-rsc/entry-browser`, but returned **404** for those URLs. The page remained unhydrated with “Opening local plan”; no canvas rendered. The built production Worker rendered normally. Root cause was not established; the finding is the reproducible command failure, not an assertion that any one plugin is responsible.

Restore the normal development flow and add a hydration/asset smoke check. Source-harness passes must not mask this failure. The temporary harness used in this audit is documented in [reproduction instructions](reproduce.md).

### 14. Measurement fields silently discard invalid text

**Location:** `features/editor/ui/scrubbable-number-input.tsx:50–55`, `:189–216`.

Typing `1,5` into the object width field leaves `aria-invalid` unset. On Enter the value silently reverts to `210`. `Number()` parsing rejects the draft, but the nonnumeric path clears invalid state and the blur path restores the value without explaining why. The same problem applies to arbitrary nonnumeric input, regardless of locale. [Probe](evidence/final-probes.json).

This is particularly confusing with a comma-decimal keyboard, but the core defect is missing validation feedback. Support the intended decimal format explicitly, distinguish incomplete editing from invalid submission, and show a field-associated reason before restoring/rejecting input. Suggested remediation: `$impeccable clarify`, `$impeccable harden`.

### 15. “Saved on this device” is shown before the starter plan exists in storage

**Location:** `features/editor/state/planner-store.ts:283–291`; `features/editor/ui/use-local-plan.ts:91–101`.

In a fresh context, hydration creates a starter plan and marks it saved. `listLocalPlans()` simultaneously returns zero rooms. Nothing writes that starter until an edit or explicit save. [Fresh-state evidence](evidence/persistence-touch.json).

The default scene regenerates on reload, so this test did not demonstrate lost edits. Still, the saved badge and “No saved rooms yet” menu disagree. Save the initial document before displaying success, or distinguish an untouched starter from a saved room.

### 16. Consumers cannot see the provenance and limits behind preset dimensions

**Location:** `features/editor/domain/catalog.ts:16–28`, `:150–190`; `features/editor/ui/blueprint-library.tsx`; `features/editor/ui/object-variant-menu.tsx:45–76`.

Repository research distinguishes generic planning envelopes, reference-product measurements, actual branded models, and operating clearances. The consumer catalog presents names and exact dimensions without those distinctions or source links. Examples: “Monitor · 27″” uses a particular Dell reference; “Apple Laptop · Closed 14″” uses MacBook Pro measurements; Bambu printer footprints exclude accessories and operating space. Those qualifications remain in developer documents.

The fresh geometry matrix establishes rendering containment, not the physical dimensions of every item with a similar name. Show the reference model where applicable, generic/example status, and relevant clearance exclusions near dimensions. Store source/date/model metadata with the preset. Existing researched documents are a useful starting point. A fresh spot check of [Apple HomePod mini specifications](https://www.apple.com/homepod-mini/specs/) supports the documented rounding to 98×98×84 mm; this audit did not reverify every manufacturer model.

### 17. User-facing size language and release documentation have drifted

**Location:** `features/editor/ui/room-actions.tsx:412–413`; `features/editor/domain/plan-document.ts:130–141`; `README.md`; `PRODUCT.md`; `DESIGN.md`.

The new-room dialog advertises a 4.8×3.6 metre outline, while the current consumer dimension controls and wall labels use inside measurements: the default interior is **4.68×3.48 m** with 120 mm walls. README/PRODUCT still describe centreline measurements and 184 presets, while current code has 207 and inside dimension labels. They also retain the earlier Pan-tool description after the touch model changed.

Make inside/centreline terminology explicit, correct the starter-size copy, and derive or verify catalog counts and interaction documentation against the current implementation. Old audit evidence should remain historical, with an obvious current report. Suggested remediation: `$impeccable clarify`, `$impeccable document`.

## Accessibility qualification and remaining release validation

WebKit reported `aria-command-name` on two Base UI focus-guard spans in each sampled touch object sheet. Inspection of `@base-ui/react/utils/FocusGuard.mjs` shows the library deliberately gives these hidden guards a button role for VoiceOver cursor handling. **This is an observed scanner result, not a confirmed user-facing accessibility defect and is not included in the 17 findings.** Validate navigation with real VoiceOver before changing the guards or suppressing the warning. Removing them blindly could break focus containment.

The following were not established by this audit and must not be implied by its passing results:

- Physical iOS Safari and Android Chrome behavior, including real software keyboards, safe areas, browser bars, app backgrounding, OS process termination, and native file-download UX. WebKit automation is not an iPhone test.
- Firefox execution: downloading the required engine failed. WebKit's newer requested download also failed; the already installed WebKit 26.6 build 2336 successfully ran the recorded suite with the installed Playwright client. Record and reproduce that version distinction. [Download logs](evidence/firefox-install.log).
- VoiceOver, TalkBack, NVDA, high-contrast/forced-colors use, and OS text enlargement. Axe cannot establish full WCAG conformance, especially for canvas interactions.
- Real-user Core Web Vitals, slow mobile CPU performance, sustained multi-hour memory use, and low-storage/OS eviction behavior. The 500-object timing is a local source-harness measurement, not field INP or a production performance guarantee.
- Every branded specification or exact silhouette against current manufacturer CAD. The geometry suite checks envelopes/scaling, and historical source audits supply provenance with their original dates.
- Cloudflare dashboard settings, secret strength, branch-protection enforcement, alert routing, capacity/billing limits, deployment rollback, and disaster-recovery operations. The repository configuration and local Worker gate were tested; live checks were limited to read-only public response headers. No live password attempts were made.
- Full offline restart: client-local storage does not by itself provide an offline application shell. No service-worker/offline-start implementation was found. This is a capability limit, not a claim that loaded in-memory editing needs a server.

No account, payment, sharing-link backend, user-upload server, or product-ingestion endpoint is shipped in this revision. SQL injection and server-side upload threats for those future features were therefore not invented as current findings. The existing gate uses parameterized queries, constant-length hash comparison, cryptographic tokens, server-side session hashes, and fail-closed missing configuration. Its deliberate shared login throttle can block new development logins for its window; it does not gate production.

## What to retain and what to do next

Preserve the integer-millimetre model, schema validation, immutable history, conflict-aware transactional saves, copy-on-import semantics, corrupt-record isolation, bounded PNG dimensions, shared SVG/canvas profile model, correctly named controls, touch-sized primary actions, and separated object/room dimensions. Fresh tests support these foundations.

Before release, resolve findings 1–6 and rerun their specific reproductions. Address findings 7–17 with particular attention to importer limits, geometry validity, actual deployment CI, and production response policies. Then complete the physical-device and assistive-technology checks above on the exact release build and verify an operational rollback path.

For interface work, the appropriate sequence is `$impeccable harden` for recovery and accessible controls, `$impeccable adapt` for short viewports and touch multiple selection, `$impeccable clarify` for measurement/validation copy, `$impeccable optimize` for bounded imports, `$impeccable document` for current product truth, and `$impeccable polish` only after functional fixes. These commands do not replace the persistence, security, and CI implementation work. Re-run `$impeccable audit` after remediation. The fixes can be taken individually or together.
