# Object library expansion plan

Status: implemented. Bathroom, Kitchen, Living Room and Home Cinema have populated libraries. Dining Room and Gaming Room have been removed from the category navigation. Dining furniture belongs to Living Room. Existing saved objects remain intact.

## Latest catalog changes

The current library keeps only the requested current Sonos range: Arc Ultra, Beam Ultra, Beam Gen 2, Ray; Era 100, Era 300, Five, Move 2, Sonos Play, Roam 2; Sub 4, Sub Mini; Amp, Amp Multi, Port. Era 100 SL/Pro, legacy models, all SYMFONISK products, Playbase and the generic subwoofer are removed. The subwoofer family is named **Sonos Subwoofer**.

Bathroom now offers one floor-standing Toilet, one **Sink**, and **Towel Rail**. Double sinks (including Kitchen), the wall-hung toilet and walk-in shower screen are removed. Cinema Seat has one upright default; the reclined variant is removed. The kettle has a revised top-down handle, spout and lid. Earlier lists below document the original plan and are superseded by this section and the live catalog.

## Shared rules

- One canonical catalog entry per object/model. An object can be placed in any room regardless of its library category. Search can include dining, gaming, front and rear as aliases without adding duplicate cards.
- Use simple top-down blueprints and measured width × floor depth. Height is separate. Show projected supports, feet and wall offsets; never substitute a front elevation for a footprint.
- Ordinary furniture gets one resizable default. Use presets for meaningful forms, standard screen diagonals and named product models only. Size/model selection appears after clicking a card and in the placed-object menu, never as a dropdown on every card.
- Grey palette throughout, except the already approved light-blue windows. Geometry must withstand resizing and match previews, canvas, saved plans and exports.
- Verify manufacturer dimensions before implementation. Generic defaults must be identified as generic. Screen diagonals determine image width from aspect ratio, not the complete product footprint.

## Bathroom

| Object                   | Options / drawing                                                             |
| ------------------------ | ----------------------------------------------------------------------------- |
| Toilet                   | Floor-standing and wall-hung forms; bowl, seat and cistern where present      |
| Washbasin / sink vanity  | Single and double basin forms under one family; countertop outline with bowls |
| Bathtub                  | One resizable tub, rim and drain                                              |
| Shower                   | Rectangular tray; glass edge and door opening clearance                       |
| Walk-in shower screen    | Wall-attached thin glass panel, no tray duplicate                             |
| Bidet                    | One default, basin outline                                                    |
| Bathroom storage cabinet | One tall narrow cabinet footprint                                             |
| Washing machine          | One default; top outline, front edge and optional door clearance              |
| Tumble dryer             | One default; same top-view discipline                                         |
| Heated towel rail        | Wall-attached projection with minimal bars                                    |
| Bath mat                 | Do not create: reuse the existing resizable Rug                               |
| Laundry basket           | Do not create: reuse Bedroom's Laundry Basket                                 |

No freestanding mirror is reintroduced. A later bathroom wall-mirror object would need a separate explicit decision after the earlier mirror removal.

## Kitchen

| Object                 | Options / drawing                                                   |
| ---------------------- | ------------------------------------------------------------------- |
| Base cabinet / worktop | Straight and corner forms, one family                               |
| Wall cabinet           | Wall-attached top projection; distinguish overhead placement        |
| Tall pantry cabinet    | One default                                                         |
| Kitchen island         | One resizable default, plain countertop                             |
| Kitchen sink           | Single and double bowl options, inset footprint; place on a worktop |
| Hob                    | Four simple burner zones; place on a worktop                        |
| Oven                   | One built-in appliance; front edge and optional door clearance      |
| Cooker / range         | Combined hob and oven object; do not auto-add separate components   |
| Refrigerator           | Standard and side-by-side forms, optional door clearance            |
| Dishwasher             | One default, optional door clearance                                |
| Microwave              | One default, top outline                                            |
| Extractor hood         | Overhead footprint with explicit mount height                       |
| Coffee machine         | One default, machine and drip tray envelope                         |
| Kettle                 | One default, body and spout projection                              |
| Toaster                | One default, minimal slot lines                                     |
| Waste bin              | One default; canonical bin for all rooms                            |
| Bar stool              | One default; distinct tall seat, not a duplicate of Bedroom's pouf  |

Dining tables and ordinary chairs are reused from the canonical table/chair entries, not added again to Kitchen. Washing machines and dryers remain under Bathroom even when placed in a kitchen.

## Living Room, including dining

| Object             | Options / drawing                                                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Sofa               | Straight, L-shaped and U-shaped forms; simplify cushions and armrests                                                                          |
| Armchair           | One resizable default                                                                                                                          |
| Coffee table       | Rectangular and round forms within one family                                                                                                  |
| Side table         | One default, distinct from the existing bedside storage table                                                                                  |
| TV                 | Proposed diagonals: 32, 43, 50, 55, 65, 75, 85, 98 and 100 inches; actual top edge and stand footprint; wall-mounted state removes stand depth |
| TV / media cabinet | One default                                                                                                                                    |
| Sideboard          | One default, dining storage                                                                                                                    |
| Bookcase           | One default, top outline                                                                                                                       |
| Display cabinet    | One default, restrained glass/front-edge marking                                                                                               |
| Floor lamp         | One default including shade/base projection                                                                                                    |
| Plant pot          | One default, restrained canopy footprint                                                                                                       |
| Dining table       | Separate dining table family; office tables remain in Home Office                                                                              |
| Dining chair       | Separate dining chair; office chairs remain in Home Office                                                                                     |

Reuse Bedroom's Rug, Stool / Pouf and Bedroom Bench for rugs, ottomans and dining benches. Reuse the existing starter sofa/round-table models when expanding those families instead of shipping an additional legacy card. Home Office retains its specialized ergonomic chair, desk lamp and equipment. TV and Sofa exist here only, never in Home Cinema.

## Home Cinema

| Object                | Presets / behaviour                                                                                                                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Projector screen      | Proposed 16:9 image diagonals: 80, 92, 100, 110, 120, 135, 150, 180, 200 inches. Fixed-frame and retractable mounting states under one family. Top view shows the frame/case thickness and wall offset, not the image height |
| Projector             | Standard/long-throw and ultra-short-throw forms; actual housing plus optional separate throw-direction/clearance overlay                                                                                                     |
| Soundbar              | Sonos model selector, list below; one object per unit                                                                                                                                                                        |
| Speaker               | One Sonos model selector shared by front/rear placements; no duplicate Front Era 100 and Rear Era 100 entries                                                                                                                |
| Floorstanding speaker | One generic tower, placed individually; for systems outside the Sonos range                                                                                                                                                  |
| Centre speaker        | One generic horizontal cabinet                                                                                                                                                                                               |
| Subwoofer             | Sonos model selector plus one generic option                                                                                                                                                                                 |
| AV receiver           | One generic default                                                                                                                                                                                                          |
| Amplifier / streamer  | Sonos component models below; each physical unit separately placeable                                                                                                                                                        |
| Speaker stand         | One default; separate support, not a second speaker object                                                                                                                                                                   |
| Cinema seat           | One recliner with closed/reclined state and opening clearance; rows assembled from individual seats                                                                                                                          |
| Acoustic wall panel   | Wall-attached absorber footprint with adjustable width and wall projection                                                                                                                                                   |
| Bass trap             | Corner-mounted acoustic treatment footprint                                                                                                                                                                                  |

No TV, couch, rug, side table or media cabinet copies. No all-in-one “sound system” footprint: place the actual components. Future system templates may instantiate references to existing items, not create duplicate catalog models.

“Soundproof wallmounts” is interpreted here as wall-mounted acoustic treatment. Label these Acoustic Wall Panels: absorption treatment is not a claim that the room becomes soundproof.

## Sonos model coverage

Include current and legacy physical models because users may be planning around equipment they already own. Colour editions and bundles are not additional variants. Model generations may share geometry only after their dimensions are verified.

- Soundbars: Arc Ultra, Arc, Arc SL, Beam Ultra, Beam Gen 2, Beam Gen 1, Ray, Playbar.
- TV speaker base: Playbase, a separate form rather than a narrow soundbar drawing.
- Stationary speakers: Era 100, Era 100 SL, Era 100 Pro, Era 300, Five, One Gen 1/2, One SL, Play:1, Play:3, Play:5 Gen 1/2.
- Subwoofers: Sub Gen 1/2/3, Sub 4, Sub Mini.
- Components: Amp, Amp Multi, Port, Connect, Connect:Amp, ZP100.
- Additional speaker forms for complete speaker coverage: Move, Move 2, Sonos Play, Roam, Roam SL, Roam 2; SYMFONISK bookshelf Gen 1/2, table lamp Gen 1/2, floor lamp and picture frame. These have one entry each, not duplicates in Living Room.

Sources checked 5 September 2026: [Sonos product index](https://support.sonos.com/en-us/products) and [soundbar catalog](https://www.sonos.com/en-us/shop/soundbars). Beam Ultra is listed for preorder; do not label it already shipping.

Front/rear describes placement, not universal connectivity. Check the chosen model and home-theater host before exposing a compatible surround role; do not promise every standalone speaker can act as an extra front channel beside a soundbar. Sonos also documents an Amp-based front/rear configuration. [Sonos surround guidance](https://support.sonos.com/en-us/article/surround-sound-guidelines-and-limitations)

Architectural in-wall/in-ceiling products require explicit wall/ceiling attachment and cutout measurements before adding them. They belong to this same audio catalog if implemented; no duplication under Structural.

## Implementation order

1. Bathroom core fixtures, then Kitchen cabinets/appliances.
2. Living Room furniture and TV, keeping the office table and chairs in Home Office and adding distinct dining furniture.
3. Home Cinema screens/projectors, Sonos component families, seats and wall-mounted acoustic treatment.
4. Remaining small appliances, legacy audio models and specialized mounted speaker forms.

Acceptance: unique catalog IDs and model ownership; correct plan-view proportions; meaningful size/model menus only; resize/rotate/mirror, undo and save/load; wall mounting where required; distinguish actual objects from optional swing/throw/recline clearance; exported geometry matches the canvas.

## Implementation notes

The user's later instruction keeps office tables and chairs in Home Office and adds separate Dining Table and Dining Chair objects in Living Room. These are distinct use-specific families, not repeated catalog entries. All other reuse rules above remain in effect.

Every listed object family is available. Model selection lives behind the card and in the object menu; ordinary objects insert directly. TV presets include stand and wall-mounted forms, projector screens include fixed and retractable forms, and cinema seats include upright/reclined forms. Shared Sonos models can be used for front/rear layout planning without claiming electronic compatibility. Mounted objects expose height above floor.

Fixture/appliance door-clearance and projector throw overlays listed as optional above are not added. Door blueprints retain their existing swing areas; Shower includes an opening arc. Reclining is represented by the actual extended seat footprint. Architectural ceiling/in-wall speakers remain the explicitly future item above.

See [dimension sources and generic envelope assumptions](room-object-dimensions.md). Tests cover unique ownership, every new preset's schema round-trip and geometry bounds, screen proportions, mounted placement, and same-size model changes with undo.
