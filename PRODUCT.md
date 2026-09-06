# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary users are tech enthusiasts and everyday people who want to rearrange a room or home before moving real furniture and devices. This includes gamers and other detail-oriented users planning setups where fit and placement matter.

## Product Purpose

The product is a free online room planner for answering a practical question: “Will these things fit in this room, and where should they go?” It lets people model a room with real measurements, place dimensionally accurate objects, try arrangements, and return to a locally saved plan without account or workflow overhead.

Success means a first-time user can quickly create a useful plan, trust its measurements, and make a real-world layout decision with less uncertainty.

## Positioning

A precise, no-bloat room planner that combines the approachability of a lightweight online tool with dimension-faithful, blueprint-style placement for real furniture and devices. The immediate product does not depend on accounts, a branded catalog, or product-link importing.

## Operating Context

- Users plan bedrooms, gaming setups, living spaces, workspaces, and other rooms before or during rearrangement.
- They work from room measurements and the physical dimensions of furniture, computers, speakers, and other devices.
- The first release is local-first and supports multiple local rooms, preset and custom objects, exact placement, and automatic on-device saving.
- Desktop, tablet, and phone layouts support editing, with touch panning on empty canvas and responsive contextual controls.

## Capabilities and Constraints

- The canonical plan stores integer millimetres and remains independent of canvas pixels, viewport zoom, and rendering technology.
- Current editor capabilities include a polygonal room, generic object footprints, exact object and room properties, canvas navigation, selection, movement, rotation, duplication, deletion, mirroring, corner editing, undo/redo, configurable grid and snapping, and IndexedDB autosave.
- Metric and imperial presentation are supported while canonical geometry remains in millimetres. Room coordinates store wall centrelines; displayed room dimensions measure the inside wall faces. Wall mounting preserves physical dimensions and reports when an object cannot fit. Height and elevation are metadata in this top-down editor; they do not imply vertical collision simulation.
- PNG and JSON export, doors/windows, and 207 selectable presets are implemented. Object height, mounting elevation, separate TV mounting families, group transformations, and object colors are available. PDF export, accounts, live collaboration, and cloud persistence remain future capabilities.
- Product-link importing is only a possible future direction and is not part of the core product focus or positioning.
- The current implementation uses React, TypeScript, Vinext/Vite, Tailwind CSS, shadcn/Base UI primitives, Konva, Zustand, Zod, Dexie/IndexedDB, Vitest, and a Cloudflare-compatible deployment scaffold. These are implementation facts, not permanent product commitments.
- The working product name is “Room Planner”; the final name is undecided.

## Evidence on Hand

- A runnable local editor implementation exists in `app/planner` and `features/editor`.
- `docs/product/workspace-plan.md` records the intended editor behavior and incremental delivery plan.
- `docs/architecture/0001-technology-stack.md` records the current technical architecture and rationale.
- `README.md` describes the implemented editor kernel and clearly distinguishes future capabilities.
- Catalog dimensions include generic examples and explicitly branded Sonos/Apple presets; sourced dimensions and verification limits are documented in `docs/audits/2026-09-05/sources.md`. No testimonials, customer logos, or production usage claims are available.

## Product Principles

1. Keep the path from measurements to a useful layout fast and free of unnecessary setup.
2. Preserve real-world dimensional accuracy across editing, saving, and eventual export.
3. Make direct manipulation approachable without hiding precise controls.
4. Keep the core planner useful locally and independently of accounts, catalogs, or network services.
5. Treat future product data and exact silhouettes as evidence-backed information, never guesses.

## Accessibility & Inclusion

The current product plan calls for keyboard equivalents for editor actions, meaningful accessible names, a logical focus order, touch targets of at least 44 CSS pixels, and reduced-motion support. These are current quality goals rather than immutable commitments.
