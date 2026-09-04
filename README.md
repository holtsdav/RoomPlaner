# Room Planner

A precise, blueprint-style 2D room planner for real furniture and devices. The
project is in its foundation phase; the repository and visual workbench shell
are ready, but editor interactions and the object catalog are not implemented
yet.

## Technology direction

- React, TypeScript, Vinext and Vite for the web application
- Tailwind CSS and shadcn/Base UI primitives for a custom, accessible interface
- Konva/react-konva for the future interactive 2D editor
- A renderer-independent document model stored in millimetres
- Zustand for editor state and command-based undo/redo
- Zod at data boundaries and Dexie/IndexedDB for local autosave
- Cloudflare Workers for server APIs; D1/R2/Queues can be added when persistence,
  assets and background product ingestion are needed
- Vitest for unit tests and Playwright for interaction and visual regression
  tests once editor behavior lands

The full rationale, boundaries and product-link ingestion approach are recorded
in [the architecture decision](docs/architecture/0001-technology-stack.md).

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
