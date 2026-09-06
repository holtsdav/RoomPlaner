# Room Planner

A precise, blueprint-style 2D room planner for real furniture and devices. The
local editor supports polygonal rooms, 207 object presets, openings, exact
2D footprint dimensions, groups, object colors, undo/redo, and multiple
rooms saved in IndexedDB. Standing and wall-mounted TVs have separate library
entries. PNG exports include an optional grid and wall dimensions plus a scale
legend; JSON backups remain editable.

Geometry is stored in integer millimetres. Room boundaries store wall centrelines; wall labels measure
inside wall faces; furniture retains its real dimensions even when it cannot fit.
Metric labels retain millimetre precision and imperial labels use decimal inches.
Competing tab writes are detected; “Save a copy” preserves conflicting edits.
The canvas supports keyboard navigation, touch panning on empty canvas, and responsive object
controls. Room setup provides keyboard-accessible corner selection, coordinates,
addition and removal. In Placed in room, Select multiple works with touch or keyboard.

## Technology direction

- React, TypeScript, Vinext and Vite for the web application
- Tailwind CSS and shadcn/Base UI primitives for a custom, accessible interface
- A small Libraries.dev visual toolkit: Border Beam for the homepage transition;
  Liquid Gooey, Image FX, Thinking Orbs and Metal FX reserved for matching future
  interactions and loaded only where they are used
- Konva/react-konva for the interactive 2D editor
- A renderer-independent document model stored in millimetres
- Zustand for editor state and command-based undo/redo
- Zod at data boundaries and Dexie/IndexedDB for local autosave
- Cloudflare Workers for server APIs; D1/R2/Queues can be added when persistence,
  assets and background product ingestion are needed
- Vitest for unit tests and Playwright for interaction and visual regression
  checks in `docs/audits/2026-09-05/scripts`

The full rationale, boundaries and product-link ingestion approach are recorded
in [the architecture decision](docs/architecture/0001-technology-stack.md).
The intended editor behavior and its incremental delivery plan are described in
the [workspace product plan](docs/product/workspace-plan.md).

## Local development

Prerequisites: Node.js 22 and npm 11.

```sh
npm ci
npm run dev
```

Before opening a pull request:

```sh
npm run check
```

## Branch workflow

`main` is production and `develop` is integration. Start work from the latest
`develop` and open a pull request back into `develop`:

```sh
git switch develop
git pull --ff-only
git switch -c feature/short-description
```

Use `feature/`, `fix/`, `chore/`, `docs/`, or `refactor/` prefixes. Production
releases are pull requests from `develop` to `main`. Both long-lived branches
are protected and require the CI check; direct and force pushes are disabled.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the complete workflow.

## Planning limits and dimension references

Imports accept up to 5 MB and 20 rooms per operation, with at most 500 objects,
250 groups and 256 corners per room. Names are limited to 120 characters; geometry
uses finite integer millimetres within ±1,000,000 mm. Unsupported saved records are
preserved rather than deleted. Export backups before leaving if saving is unavailable.

Library entries expose **About dimensions**; selected-object details also show
manufacturer references or generic planning-size information. Reference dimensions
are editable, schematic silhouettes are not CAD models, and operating/access/cable
clearances are excluded. Check actual products and available clearance when planning.
