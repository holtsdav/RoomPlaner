# Room Planner workspace plan

## Product intent

The workspace is a precise, blueprint-style editor for answering a practical
question: "Will these things fit in this room, and where should they go?" It
should feel approachable to a first-time user while keeping dimensions exact
enough for real furniture, speakers and devices.

The first useful version is intentionally smaller than the long-term product.
It supports one room, generic objects and local saving. Accounts, collaboration,
real-product catalogs and product-link extraction come after the editor model is
stable.

## Primary user flow

1. Create a rectangular room by entering its inside width and depth.
2. Add a generic object from the library or create a custom rectangle/circle.
3. Enter the object's exact dimensions and place it on the plan.
4. Move, rotate, duplicate or delete it with snapping and visible clearances.
5. Reopen the locally saved plan and export a clean blueprint image or PDF.

This path defines the first release. Free-form room drawing is an extension of
it, not a prerequisite for a useful planner.

## Workspace anatomy

### Header

- Editable project name and units indicator.
- Home navigation with an unsaved-changes safeguard.
- Undo, redo, save status and export.
- Later: account, sharing and collaboration controls.

### Left library

- Search, category navigation and draggable object cards.
- "Basic shapes" and "Custom object" appear before branded products exist.
- Cards show a top-down preview, name and physical dimensions.
- A collapsed drawer replaces the panel on narrower screens.

### Canvas

- Infinite-feeling working surface with a finite room plan in world space.
- Blueprint grid, rulers, dimensions, selection outlines and snap guides.
- Compact tools for select, pan, room, opening, measure and annotation.
- Zoom controls, fit-to-room, grid size and pointer coordinates in the footer.

### Right inspector

- Room settings when no object is selected.
- Position, width, depth, rotation, elevation metadata, lock and visibility for
  one selected object.
- Shared transforms and alignment actions for multiple selected objects.
- Validation is inline and never silently changes a real-world dimension.

## Interaction model

### Navigation

- Wheel or trackpad pinch zooms around the pointer.
- Space + drag or middle mouse drag moves the viewport on desktop; dragging empty canvas pans on touch screens.
- `0` fits the room in view; `+` and `-` step the zoom level.
- Zoom is clamped to a useful range and does not modify document geometry.

### Selection and transforms

- Click selects the topmost item; Shift + click adds or removes items.
- Drag on empty canvas creates a selection marquee.
- Drag moves the selection with grid and edge snapping.
- A rotation handle and the inspector support exact rotation.
- Arrow keys nudge by 10 mm; Shift + arrow nudges by 100 mm.
- Escape cancels the active gesture and restores its starting state.
- Delete removes selected items; Command/Ctrl + D duplicates them.

### Editing guarantees

- A drag or resize is one undoable action, committed on pointer release.
- Typing a dimension is one undoable action, committed on blur or Enter.
- Locked items can be selected and inspected but not transformed.
- Invalid dimensions remain visible with an error and are not committed.
- Snapping can be temporarily bypassed with Alt/Option.

### Touch and accessibility

- Pointer Events provide one interaction path for mouse, pen and touch.
- Interactive handles are at least 44 CSS pixels even when their visible mark
  is smaller.
- All inspector actions and object transforms have keyboard equivalents.
- Tooltips expose shortcuts; focus order follows header, library, canvas and
  inspector.
- Reduced-motion settings disable non-essential effects and animated viewport
  transitions.

The editor is desktop-first. Tablet editing is supported through drawers and
larger handles. Phones initially get a view/inspect experience; full phone
editing is deferred until the core workflows are proven.

## Geometry and document model

World-space values are stored as integer millimetres. Rendering converts world
coordinates to screen pixels through a viewport transform; zooming never
rounds or rewrites the source data.

```ts
type PlanDocument = {
  schemaVersion: number;
  id: string;
  name: string;
  units: 'mm' | 'cm' | 'm' | 'in' | 'ft-in';
  room: Room;
  objects: PlanObject[];
  createdAt: string;
  updatedAt: string;
};

type Room = {
  id: string;
  wallThicknessMm: number;
  boundary: PointMm[];
  openings: Opening[];
};

type PlanObject = {
  id: string;
  catalogItemId?: string;
  name: string;
  shape: FootprintShape;
  positionMm: PointMm;
  rotationDeg: number;
  widthMm: number;
  depthMm: number;
  heightMm?: number;
  locked: boolean;
};
```

The saved document contains only product and geometry data. Selection,
hovering, open panels, zoom and pointer gestures are transient editor state and
must not leak into exported plans or persistence migrations.

Walls eventually use connected segments and explicit thickness. The first
room wizard produces the same polygon representation as the later free-form
wall tool, so rectangular rooms do not become a dead-end data format.

Object footprints start with rectangles, circles and simple polygons. A future
product extractor can create an accurate bounding footprint from verified
dimensions even when an exact silhouette is unavailable. Exact top-down shapes
should come from a reviewed asset pipeline, not be guessed from a product URL.

## State and rendering boundaries

- **Document state:** serializable room and object data, validated at load and
  save boundaries.
- **Editor state:** tool, selection, snapping, viewport and active gesture.
- **Command history:** reversible document operations with drag updates grouped
  into one transaction.
- **Catalog state:** product metadata and immutable footprint definitions.
- **Persistence:** schema-versioned repositories so IndexedDB can later be
  replaced or supplemented by cloud storage without changing editor commands.

Konva should own the canvas scene and pointer hit testing, but not the canonical
document. React owns panels and accessible controls. Geometry functions remain
renderer-independent TypeScript so they can be unit tested and reused for SVG,
PDF and server-side exports.

Suggested feature boundaries:

```text
features/
  editor/
    domain/       document types, units, geometry and validation
    commands/     undoable mutations
    state/        document and transient editor stores
    rendering/    Konva scene, overlays and viewport transforms
    ui/           toolbar, status bar and inspector
  catalog/        categories, search and footprint assets
  persistence/    local repositories, migrations and recovery
  export/         SVG, PNG and PDF output
```

## Delivery slices

### Slice 1 — editor kernel

- Add the typed, versioned document model and a sample rectangular room.
- Render the room, grid and two generic objects from document state.
- Implement pan, pointer-centred zoom, fit-to-room and coordinate conversion.
- Implement select, multi-select, move, delete, duplicate and keyboard nudging.
- Add command-based undo/redo and keep one drag as one history entry.

Done when a user can precisely arrange the sample objects using mouse or
keyboard, undo every document mutation and refresh without console errors.

### Slice 2 — room setup and exact editing

- Add a new-room dialog for width, depth, units and wall thickness.
- Let users add, move and remove validated polygon corners for non-rectangular
  rooms.
- Make the inspector edit position, dimensions and rotation with validation.
- Add configurable grid, object-edge and room-edge snapping with visible guides.
- Add local autosave, recovery and document migrations.

Done when a new plan can be created, edited to exact measurements and restored
after a reload without loss of precision.

### Slice 3 — openings and generic library

- Add doors and windows constrained to wall segments.
- Add categorized generic furniture and device footprints.
- Support library search, drag-to-place and a custom-object workflow.
- Add lock, hide, layer ordering and selection alignment.

Done when a representative room can be modeled without branded products.

### Slice 4 — export and release hardening

- Export SVG first, then high-resolution PNG and printable PDF.
- Add unsaved-change protection, recovery states and destructive-action
  confirmations.
- Cover geometry and commands with unit tests and critical workflows with
  browser tests.
- Establish performance budgets and test representative large plans.

Done when plans can be reliably saved, reopened and shared as a clean blueprint.

### Later — real products and extraction

- Curated catalog entries for real devices and furniture, with source and
  verification timestamps for every physical dimension.
- Product URL ingestion through a server-side job: fetch, extract candidates,
  show source evidence, require user confirmation, then create a draft object.
- Reviewed top-down silhouettes or manufacturer assets where licensing allows;
  a dimensionally exact bounding footprint remains the safe fallback.
- Thinking Orbs may communicate the multi-step extraction state, Image FX can
  assist image review, and Metal FX can be reserved for suitable device visuals.
  These remain lazy-loaded and are not part of the core editor bundle.

## Quality bar

- Geometry and unit conversion have deterministic unit tests.
- Core workflows work without a mouse and expose meaningful accessible names.
- No network request is required to use an already loaded local plan.
- Autosave never blocks pointer interaction and has a visible status.
- Continuous gestures target 60 frames per second on a representative laptop;
  large-plan tests begin at 500 objects.
- Exported dimensions match document values exactly, independent of viewport
  zoom or device pixel ratio.

## Decisions to validate with the first prototype

- Whether 10 mm is the best default grid and nudge increment for the target
  audience.
- Whether the right inspector should remain fixed or become a contextual panel
  near the selection on tablets.
- Whether free-form walls are needed before the first public release, based on
  usage of the rectangular room wizard.
- The practical object count at which scene virtualization or layer caching is
  necessary.

Unless testing contradicts them, the implementation should use the defaults in
this document rather than blocking on these decisions.
