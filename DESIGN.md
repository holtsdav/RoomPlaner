---
name: 'Room Planner'
description: 'A restrained drafting workbench for precise, dimension-faithful room planning.'
colors:
  functional-blue: 'oklch(0.49 0.19 257)'
  functional-blue-soft: '#e6efff'
  selection-blue: '#1d4ed8'
  blueprint-navy: '#10233f'
  drafting-ink: 'oklch(0.22 0.045 255)'
  muted-ink: 'oklch(0.49 0.045 255)'
  canvas-field: '#eaf1f6'
  object-tray: '#f6f8fb'
  work-surface: '#fcfdff'
  control-white: '#ffffff'
  divider: 'oklch(0.88 0.025 250)'
  destructive: 'oklch(0.577 0.245 27.325)'
typography:
  title:
    fontFamily: 'Geist, Arial, Helvetica, sans-serif'
    fontSize: '14px'
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: '-0.01em'
  body:
    fontFamily: 'Geist, Arial, Helvetica, sans-serif'
    fontSize: '14px'
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: 'normal'
  label:
    fontFamily: 'Geist, Arial, Helvetica, sans-serif'
    fontSize: '12px'
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: 'normal'
  measurement:
    fontFamily: 'Geist Mono, monospace'
    fontSize: '11px'
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: 'normal'
    fontFeature: 'tnum'
rounded:
  control: '0.55rem'
  tool: '10px'
  popover: '12px'
  floating-toolbar: '14px'
  pill: '9999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '20px'
components:
  button-primary:
    backgroundColor: '{colors.functional-blue}'
    textColor: '{colors.control-white}'
    typography: '{typography.body}'
    rounded: '{rounded.control}'
    padding: '0 10px'
    height: '32px'
  button-ghost:
    backgroundColor: 'transparent'
    textColor: '{colors.drafting-ink}'
    typography: '{typography.body}'
    rounded: '{rounded.control}'
    padding: '0 10px'
    height: '32px'
  button-destructive:
    backgroundColor: 'oklch(0.577 0.245 27.325 / 0.1)'
    textColor: '{colors.destructive}'
    typography: '{typography.body}'
    rounded: '{rounded.control}'
    padding: '0 10px'
    height: '32px'
  input-default:
    backgroundColor: '{colors.control-white}'
    textColor: '{colors.drafting-ink}'
    typography: '{typography.body}'
    rounded: '{rounded.tool}'
    padding: '0 10px'
    height: '40px'
  canvas-control-cluster:
    backgroundColor: '{colors.control-white}'
    textColor: '{colors.muted-ink}'
    rounded: '{rounded.tool}'
    padding: '4px'
  object-list-item:
    backgroundColor: 'transparent'
    textColor: '{colors.drafting-ink}'
    typography: '{typography.body}'
    rounded: '{rounded.tool}'
    padding: '8px 10px'
    height: '44px'
  brand-rail:
    backgroundColor: '{colors.control-white}'
    textColor: '{colors.drafting-ink}'
    typography: '{typography.title}'
    padding: '0 20px'
    height: '64px'
    width: '288px'
  floating-object-toolbar:
    backgroundColor: '{colors.control-white}'
    textColor: '{colors.drafting-ink}'
    rounded: '{rounded.floating-toolbar}'
    padding: '8px'
    width: '448px'
---

# Design System: Room Planner

## Overview

**Creative North Star: "The Drafting Workbench"**

Room Planner should feel like a precise drafting instrument made approachable for everyday spatial decisions. A quiet white brand and command header frame a pale object tray, while the blueprint canvas remains the dominant working surface rather than another card inside an app shell.

The visual language is restrained, technical, and direct: crisp labels, tabular measurements, solid controls, fine dividers, and cool functional blue reserved for interaction and selection. Depth is ambient and offset, never glassy or decorative; every surface should help users locate tools, trust dimensions, and return attention to the plan.

**Key Characteristics:**

- Blueprint canvas as the visual and interaction focal point.
- White command header with a blue ruler mark and pale neutral work surfaces.
- Compact Geist interface text paired with Geist Mono measurements.
- Solid white controls with restrained borders and ambient offset shadows.
- Functional blue used for action, focus, and selection rather than decoration.
- Desktop object tray that consolidates into a left-side mobile sheet.

## Colors

The palette combines drafting navy, cool paper-like neutrals, and one clear functional blue so geometry and measurements stay legible without making the shell visually competitive.

### Primary

- **Functional Blueprint Blue** (`{colors.functional-blue}`): The main action and focus color. Use it for primary controls, active tool marks, and focus rings.
- **Soft Instrument Blue** (`{colors.functional-blue-soft}`): A pale supporting tint for icon wells, selected list rows, and quiet active-state backgrounds.
- **Selection Blue** (`{colors.selection-blue}`): The stronger stroke for selected geometry and directly manipulated canvas points.

### Secondary

- **Blueprint Navy** (`{colors.blueprint-navy}`): The room outline and strongest structural ink. It anchors the shell and gives drafted geometry authority.

### Tertiary

- **Destructive Red** (`{colors.destructive}`): A localized warning treatment for irreversible or high-risk actions.

### Neutral

- **Drafting Ink** (`{colors.drafting-ink}`): Primary interface text and strong labels on light surfaces.
- **Muted Ink** (`{colors.muted-ink}`): Secondary labels, metadata, status copy, and low-emphasis measurements.
- **Canvas Field** (`{colors.canvas-field}`): The cool blue-grey field beneath the grid and plan.
- **Object Tray** (`{colors.object-tray}`): The subtly lifted cool neutral used for the object library on desktop and mobile.
- **Work Surface** (`{colors.work-surface}`): The near-white interior of the room footprint.
- **Control White** (`{colors.control-white}`): Command clusters, inputs, and floating tool surfaces.
- **Divider** (`{colors.divider}`): Fine borders, separators, and input strokes that organize without becoming a frame-heavy grid.

### Named Rules

**The Blueprint Restraint Rule.** Blue identifies action, focus, and selection; it does not wash entire panels or become ambient decoration.

## Typography

**Display Font:** Geist (with Arial, Helvetica, and sans-serif fallbacks)  
**Body Font:** Geist (with Arial, Helvetica, and sans-serif fallbacks)  
**Label/Mono Font:** Geist Mono (with monospace fallback)

**Character:** Geist keeps the interface neutral and sharply readable at compact sizes. Geist Mono and tabular numerals give dimensions, counts, zoom levels, and grid values the consistent cadence of a technical instrument.

### Hierarchy

- **Title** (600, 14px, 1.25 line-height): Plan names, panel names, object names, and the brand label; use slight negative tracking only for these compact anchors.
- **Body** (400, 14px, 1.43 line-height): Control labels and explanatory interface copy.
- **Label** (600, 12px, 1.33 line-height): Library sections, toolbar labels, and small structural headings.
- **Measurement** (400, 11px, 1.45 line-height): Dimensions, counts, coordinate-like values, and other data that benefits from a monospace rhythm and tabular numerals.

### Named Rules

**The Measurement Voice Rule.** Any value users compare spatially or numerically uses the mono face and tabular numerals; prose and action labels stay in the sans face.

## Layout

The editor occupies the full dynamic viewport with a fixed 64px command header above a two-part workspace. On large screens, the object tray is a 288px column beside a fluid canvas and may collapse to zero; the canvas always takes the remaining width and height. The brand segment aligns to the tray width, connecting the header and navigation into one restrained shell.

Spacing follows a compact 4px-based rhythm, with 8px internal tool padding, 12px control spacing, and 16px panel or viewport insets recurring most often. Floating canvas commands sit near the canvas edges and leave the centre clear for the plan. Toolbars may overlay the canvas when they are anchored to a current selection, but permanent application chrome must not reduce the canvas to a card-sized preview.

Below the large-screen breakpoint (1024px), the persistent object tray disappears and its library plus navigation actions move into a left sheet capped at 340px or 88vw. The command header condenses labels before hiding essential actions, and interactive targets exposed on mobile are at least 44px high or wide. Canvas controls remain reachable without obscuring the room.

**The Canvas First Rule.** Shell regions frame the work; they never compete with the blueprint canvas for area, contrast, or visual emphasis.

## Elevation & Depth

The system is mostly tonal and bordered, with ambient navy-tinted shadows reserved for controls that float above the canvas. Small command clusters use a low offset shadow, editors use a medium offset shadow, and the selected-object toolbar receives the strongest lift. The brand icon may carry a blue glow-like offset, but broad panels remain flat.

### Shadow Vocabulary

- **Brand Mark** (`0 5px 16px rgb(21 96 208 / 0.3)`): Gives the small blue identity mark a confident anchor inside the navy rail.
- **Canvas Control** (`0 5px 18px rgb(31 55 81 / 0.1)`): Separates persistent white command clusters from the gridded field.
- **Inline Editor** (`0 10px 28px rgb(20 45 72 / 0.14)`): Lifts temporary value editors above their parent controls.
- **Selection Toolbar** (`0 12px 32px rgb(15 35 60 / 0.16)`): Establishes the contextual object toolbar as the highest editor control layer.

### Named Rules

**The Ambient Lift Rule.** Shadows explain canvas-layer elevation through soft navy-tinted offset; they never create glossy, glassy, or decorative cards.

## Shapes

Controls use gently rounded corners rather than capsules: the recurring tool radius is 10px, popovers may increase to 12px, and the contextual object toolbar reaches 14px. Pills are reserved for compact counts and circular icon affordances. Borders are thin and cool; room walls and object outlines provide the deliberately stronger geometry.

Footprints may reflect their real shape, but editor chrome stays rectilinear and compact. Dashed inner lines communicate object detail or empty states, not decoration.

**The Tool, Not Card Rule.** Group controls because they operate together; do not wrap routine content in rounded decorative containers.

## Components

### Buttons

Buttons are compact, solid, and instrument-like.

- **Shape:** Gently rounded controls using the shared control radius, with small icon-only variants for dense desktop commands.
- **Primary:** Functional blue with white text; reserve for the clearest forward or affirmative action.
- **Hover / Focus:** Hover changes the surface tone; keyboard focus uses a visible blue border and three-pixel translucent ring. Active press may shift down one pixel.
- **Secondary / Ghost:** Secondary buttons use a cool blue-grey fill; ghost buttons are transparent until hover and dominate command bars where several actions share priority.
- **Destructive:** A restrained red tint and red icon/text keep dangerous actions visible without making them visually louder than the canvas.
- **Responsive:** Mobile command buttons and icon targets expand to at least 44px even when their desktop equivalents are 28–32px.

### Cards / Containers

Containers are working surfaces, not decorative cards.

- **Corner Style:** 10px for command clusters, 12px for small editors, and 14px for the selection toolbar.
- **Background:** Solid white for floating tools, near-white for the room surface, and pale cool neutral for the object tray.
- **Shadow Strategy:** Flat in the shell; use the documented ambient shadows only when a control visibly floats over the canvas.
- **Border:** One-pixel cool dividers and strokes establish edges without nested outlines.
- **Internal Padding:** 4px in compact command clusters, 8px in floating tools, and 16px in primary side-panel sections.

### Inputs / Fields

Inputs are clean white drafting fields with an explicit stroke.

- **Style:** White background, cool one-pixel border, 10px corners in the object tray, and compact 32px fields inside technical toolbars.
- **Focus:** Shift the border to functional blue and add a translucent three-pixel focus ring.
- **Error / Disabled:** Errors adopt destructive red border and ring; disabled fields reduce opacity and block pointer interaction without changing layout.
- **Numeric Fields:** Measurements use Geist Mono, tabular numerals, and aligned unit suffixes; scrubbing may use an east-west resize cursor and a quiet active tint.

### Navigation

The white command header shares the shell with a pale object tray, the primary desktop navigation and insertion surface. Library rows are full-width 44px targets with 10px corners, compact icon wells, a clear text hierarchy, and blue-tinted selected states. On phones, the same object and navigation content moves into a left-side sheet; it is consolidation, not a second navigation system.

### Canvas Command Cluster

Persistent canvas actions group into solid white, one-pixel-bordered clusters with 10px corners and the low ambient shadow. Keep their footprints small, use icons plus terse values, and place them near canvas edges so the plan remains central.

### Floating Object Toolbar

The selection toolbar is a 448px contextual surface when space allows, capped to the canvas width with an 8px edge inset. It combines a compact action row with three aligned mono measurement fields and carries the strongest editor shadow. Its position follows the selected object, but its geometry is a component behavior rather than a general page-layout rule.

## Do's and Don'ts

### Do:

- **Do** keep the blueprint canvas visually dominant and let shell surfaces recede around it.
- **Do** use functional blue for interactive meaning: action, keyboard focus, active tools, and selection.
- **Do** set dimensions, counts, zoom, and grid values in mono type with tabular numerals.
- **Do** preserve 44px targets for commands and library rows exposed on mobile.
- **Do** consolidate object browsing and secondary navigation into the left mobile sheet.
- **Do** use solid white floating controls with cool borders and restrained navy-tinted offset shadows.

### Don't:

- **Don't** introduce glassmorphism, translucent decorative cards, or ornamental blur into the editor shell.
- **Don't** turn routine controls or content groups into a collection of rounded cards.
- **Don't** use accent blue as broad panel decoration or allow it to compete with the plan.
- **Don't** style measurements in proportional type when users need to scan or compare them.
- **Don't** promote a particular room shape, object arrangement, or toolbar coordinate into a reusable design-system rule.
- **Don't** keep the desktop object tray persistently visible on narrow screens; use the established sheet treatment.

## Measurement and object conventions

Room walls are measured along their centrelines, explicitly labelled in the canvas,
room setup, and PNG legend. Wall labels use a 12px screen font across zoom levels.
Selected objects show their full physical envelope. Height and mounting elevation
use the active measurement system and remain separate from top-down depth.

Color choices are optional per object. One shared palette supplies canvas, SVG
previews, and PNG exports; group and multiple-selection changes skip locked objects.
Interactive control ink uses the semantic primary token. Drafting geometry and
user colors retain explicit light-canvas inks; this editor does not claim a dark theme.
Closed library sections mount their contents on expansion, and the collapsed tray
is inert. Touch users can select the pan tool; floating controls remain within the
canvas and scroll on unusually short viewports.
