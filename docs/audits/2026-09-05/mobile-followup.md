# Mobile and HomePod follow-up

Implemented on 5 September 2026; local app remains at http://localhost:3000.

- Touch selection uses a 60 px compact bar with name, size and Edit. The full object editor opens in a scrollable bottom sheet, including group/multiple-selection colors, dimensions, rotation, locking and other existing actions.
- Finger swipes pan by default, including when starting over an object. Taps select. Turn off Pan to drag objects. Mouse input retains selection and object dragging, including in a narrow portrait window; switching between mouse and touch on a hybrid device follows the actual pointer. Orientation does not decide the interaction mode.
- Apple HomePod (2nd generation) and HomePod mini are separate Home Cinema objects. See [Apple specifications and integer-millimetre rounding](../../product/homepod-dimensions.md).
- The obsolete centreline badge is replaced with a room-measurement help entry. Concurrent room-geometry work in the same workspace subsequently changed labels and Room setup to inside measurements. The verified final help and settings reflect that behavior: enter tape-measured inside dimensions; wall thickness is handled automatically.
- Room-corner keyboard entry remains outside this change, as requested.

## Verification

Final `npm run check` passed: formatting, lint, TypeScript, 131 tests in 20 files, and production build. [Check output](mobile-followup/check.log).

[Browser results](mobile-followup/verification.json) cover touch swipes over objects, tap selection, intentional touch object movement, single/multiple/group colors, 320 px phones, landscape, portrait mouse dragging, hybrid pointer switching, room help, both library entries and exact rendered native HomePod bounds. No browser runtime errors occurred. The existing catalog geometry tests also include both new objects at native dimensions and extreme aspect ratios.

The browser suite uses disposable storage and Chromium touch emulation; physical iOS/Android hardware was not available. Run [the script](scripts/verify-mobile.mjs) with Playwright installed; `AUDIT_URL`, `AUDIT_BROWSER` and `AUDIT_OUTPUT` can override local defaults.

Screenshots: [compact phone bar](mobile-followup/phone-compact.png), [object editor](mobile-followup/phone-editor.png), [320 px group editor](mobile-followup/touch-sheet-320.png), [landscape](mobile-followup/touch-sheet-844.png), [portrait mouse](mobile-followup/portrait-mouse.png), [room measurements](mobile-followup/room-measurements.png).
