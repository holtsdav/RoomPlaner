# Room Planner

A precise, blueprint-style 2D room planner for real furniture and devices. The
local editor supports polygonal rooms, 184 object presets, openings, exact
footprint dimensions and height, groups, object colors, undo/redo, and multiple
rooms saved in IndexedDB. Standing and wall-mounted TVs have separate library
entries. PNG exports include an optional grid and wall dimensions plus a scale
legend; JSON backups remain editable.

Geometry is stored in integer millimetres. Room boundaries and wall labels use
wall centrelines; furniture retains its real dimensions even when it cannot fit.
Metric labels retain millimetre precision and imperial labels use decimal inches.
Competing tab writes are detected; “Save a copy” preserves conflicting edits.
The canvas supports keyboard navigation, a touch pan tool, and responsive object
controls. Room-corner editing still starts on the canvas.

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
