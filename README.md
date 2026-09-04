# Room Planner

A precise, blueprint-style 2D room planner for real furniture and devices. The
first local-only editor kernel supports canvas navigation, exact object
placement, selection, undo/redo and automatic IndexedDB saving. Room creation,
openings, export and the full object catalog are still ahead.

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
  tests once editor behavior lands

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
