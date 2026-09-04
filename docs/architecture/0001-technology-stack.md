# ADR 0001: Initial technology stack

- Status: Accepted
- Date: 2026-09-04

## Context

Room Planner is primarily an interaction-heavy 2D editor, not a content site.
It must stay visually crisp, preserve exact real-world dimensions, support
snapping and undo/redo, and eventually host a large catalog of real furniture
and devices. Product links may later seed catalog entries, but dimensions alone
cannot describe an object's exact top-down shape.

## Decision

### Application and interface

Use React and strict TypeScript on Vite. Vinext currently supplies the app and
server routing layer for the Cloudflare-compatible scaffold; product modules
must not depend on Vinext-specific APIs so this beta adapter remains replaceable.
Use Tailwind CSS and the installed shadcn/Base UI primitives for controls, with
Lucide icons. The visual direction is precise and architectural: cool neutral
surfaces, restrained blue accents, clear hierarchy and dense but calm controls.

The approved Libraries.dev effects are intentionally scoped. Border Beam marks
the homepage's primary transition into the planner. Thinking Orbs and Image FX
are reserved for product-extraction progress and generated product imagery.
Liquid Gooey may support direct-manipulation feedback, while Metal FX may support
a future device-focused showcase surface. These packages must be lazily imported
when their feature arrives and must never determine canonical canvas geometry.

### Document model

The canonical plan is plain, versioned TypeScript data. Store all lengths and
coordinates as integer millimetres, angles in degrees and object geometry in a
local coordinate system. Never store canvas pixels in the plan. Stable IDs,
schema versions and explicit migrations are required before persisted plans ship.

The model owns rooms, walls, openings, placed objects, layers and constraints.
It must not contain Konva nodes, React state or database records. This separation
lets one plan render interactively with Konva and export independently to SVG or
PDF without losing measurement accuracy.

### 2D editing

Use Konva through react-konva for viewport rendering, hit testing, selection,
dragging and transforms. Implement snapping, alignment guides, constraints and
multi-selection in the editor domain because they are product rules, not canvas
state. Keep layers few and cull off-screen objects as catalogs and plans grow.

Use Zustand for transient editor state. Changes to the canonical plan pass
through commands with inverse operations so undo/redo is deterministic. React
state remains appropriate for isolated controls.

### Persistence and server state

Start local-first: Dexie/IndexedDB provides autosave and an offline-friendly
draft store. Use Zod to validate imported and persisted documents. When accounts
and sharing arrive, synchronize through a Worker API and add TanStack Query for
server state. Add D1 for relational plan/catalog metadata, R2 for owned assets,
and Queues for background ingestion only when those capabilities are built.

### Quality

Use Vitest for geometry, commands, serialization and migration tests. Add
Testing Library for complex UI components and Playwright for critical editor
journeys and stable visual regression fixtures. CI runs formatting, linting,
type checking, unit tests, a production build and a production dependency audit.

## Product-link ingestion

Product ingestion is a server-side, reviewable pipeline rather than a browser
scraper:

1. Normalize the URL and allow safe HTTP(S) destinations.
2. Fetch in an isolated worker with timeouts, size limits and SSRF protection.
3. Prefer structured Product/JSON-LD metadata, then manufacturer specifications
   or manuals; record the source for every extracted value.
4. Normalize dimensions to millimetres and assign a confidence score.
5. Propose a category template and dimensions in an admin review queue.
6. Publish only after validation and duplicate/licensing checks.

Width and depth can always produce an exact bounding rectangle. They cannot
recover curves, cut-outs, stands, doors, cables or required clearance. The
catalog therefore supports three footprint levels:

- `box`: exact width and depth only;
- `template`: a category shape scaled to the exact bounding box;
- `curated`: a reviewed top-down SVG path with anchors and clearance zones.

This gives every accepted product a useful exact-size representation while
allowing popular products such as soundbars, computers and 3D printers to gain
better silhouettes over time. Manufacturer CAD or dimension drawings are the
preferred source for curated geometry when licensing permits.

## Consequences

- The first editor can ship without a backend and remain easy to migrate.
- Export and rendering require separate adapters, but the plan data stays stable.
- Konva accelerates interaction work, while domain-owned geometry prevents
  framework lock-in.
- Automatic product ingestion remains assistive; exact shape claims require
  curated geometry and source provenance.
