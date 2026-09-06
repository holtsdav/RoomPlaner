# Bedroom object library — implementation

Status: implemented. The library contains all 11 object types below.

One library card per object type. **Only beds get size presets.** Clicking a bed asks for its named size; a placed bed can change that size in its menu. Every other object places immediately with one sensible default footprint and can be resized with the normal dimension controls. Do not add size pickers or variant menus to the other Bedroom objects.

## First implementation

| Object           | Size behaviour                                                                                                        | Blueprint / measurement rule                                                                                                                                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Bed              | Named presets: Twin, Twin XL, Full / Double, Queen, King, California King. Show mattress dimensions beside each name. | Outline the **outer frame**, with a separate mattress inset, one/two pillows and one duvet line. Mattress size is a label, not the overall footprint. US mattress sizes; generic frame adds 5 cm on each side, 10 cm at the head and 5 cm at the foot. |
| Bedside table    | One default, freely resizable                                                                                         | Top surface and one front-edge line; no front-view drawers.                                                                                                                                                                                            |
| Wardrobe         | One default, freely resizable                                                                                         | Top outline with door divisions at the front edge. No door-style picker. Any future door-swing clearance must be a separate overlay.                                                                                                                   |
| Chest of drawers | One default, freely resizable                                                                                         | Top rectangle and front edge. Drawer count does not change top-view geometry.                                                                                                                                                                          |
| Dresser / vanity | One default, freely resizable                                                                                         | Tabletop with a thin mirror edge at the rear; stool separate.                                                                                                                                                                                          |
| Stool / pouf     | One default, freely resizable                                                                                         | Simple rounded seat with an optional upholstery seam.                                                                                                                                                                                                  |
| Bedroom bench    | One default, freely resizable                                                                                         | Long seat outline with a restrained cushion line.                                                                                                                                                                                                      |
| Bedside lamp     | One default, freely resizable                                                                                         | Shade footprint from above; largest projection determines bounds.                                                                                                                                                                                      |
| Rug              | One default, freely resizable                                                                                         | Rectangular outline with a thin border.                                                                                                                                                                                                                |
| Laundry basket   | One default, freely resizable                                                                                         | Simple rim outline.                                                                                                                                                                                                                                    |
| Clothes rail     | One default, freely resizable                                                                                         | Top rail and two supports; footprint includes projecting feet.                                                                                                                                                                                         |

## Later additions

- Bunk bed / loft bed: distinguish mattress and outer frame, including ladder projection. Lower furniture beneath a loft needs explicit elevation behaviour.
- Storage bed / daybed: closed footprint first; extension/drawer clearance as an optional state.
- Bedroom armchair and ottoman.
- Crib: one default with separately measured mattress and outer frame.
- Wall shelf, bedside shelf and under-bed storage box, once elevation semantics are clear.
- Fan, radiator and plant pot, ideally shared across room categories.

These are separate potential object types, not a reason to introduce size presets for ordinary furniture.

## Sizing and acceptance

Use the requested familiar bed names, with a consistent regional convention and visible mattress dimensions so the names are unambiguous. Twin/Queen/King naming follows the US convention. Beds use accurate nominal mattress sizes inside a generic frame; frame margins are a design assumption, not a claim about a particular bed product.

Verify that each silhouette fits its bounds, incidental details withstand resizing, orientation is consistent, resize/rotate/mirror works, and exports match the canvas. Bed variants must survive save/load and undo; changing bed width should update pillow count rather than stretch pillows across the bed. All other objects must insert in one click without a size-selection step.

## Implemented dimensions

Bed mattress presets use the [Casper US size guide](https://casper.com/pages/mattress-size-comparison-guide): Twin 38 × 75 in, Twin XL 38 × 80 in, Full 53 × 75 in, Queen 60 × 80 in, King 76 × 80 in, California King 72 × 84 in. Millimetres are rounded to the nearest whole unit. The picker shows mattress and outer frame dimensions separately. Generic headboard height is 100 cm and does not affect the top-down footprint.

Default footprints below are width × depth in centimetres. Furniture heights never substitute for floor depth.

| Object           | Footprint | Basis                                                                                                             |
| ---------------- | --------- | ----------------------------------------------------------------------------------------------------------------- |
| Bedside table    | 40 × 48   | [IKEA MALM assembled dimensions](https://www.ikea.com/in/en/files/pdf/68/71/6871a0bc/malm_buying_guide_na_a4.pdf) |
| Wardrobe         | 117 × 55  | [IKEA KLEPPSTAD](https://www.ikea.com/ca/en/p/kleppstad-wardrobe-with-3-doors-white-20441757/)                    |
| Chest of drawers | 80 × 48   | IKEA MALM guide above                                                                                             |
| Dresser / vanity | 100 × 50  | [IKEA HEMNES guide](https://www.ikea.com/es/en/files/pdf/25/9d/259de4c7/hemnes21hfb04eng_r1_004-1.pdf)            |
| Stool / pouf     | 45 × 45   | Generic default                                                                                                   |
| Bedroom bench    | 120 × 40  | Generic default                                                                                                   |
| Bedside lamp     | 25 × 25   | Generic shade envelope                                                                                            |
| Rug              | 160 × 230 | Generic standard rug size                                                                                         |
| Laundry basket   | 40 × 30   | Generic default                                                                                                   |
| Clothes rail     | 99 × 46   | [IKEA MULIG](https://www.ikea.com/de/de/p/mulig-garderobenstaender-weiss-60179434/)                               |

All defaults remain freely resizable. Product references establish footprint sizes; drawings are simplified blueprints, not detailed product replicas. Shared paths drive library previews, the canvas and image exports. Automated checks cover every preset's save/load compatibility and path bounds at default and extreme aspect ratios.
