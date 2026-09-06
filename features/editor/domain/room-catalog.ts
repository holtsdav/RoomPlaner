import type { CatalogPreset } from './catalog';
import type { BlueprintKind } from './office-blueprints';
import type { BlueprintProfile } from './blueprint-profile';

export function roomPreset(
  kind: BlueprintKind,
  name: string,
  widthMm: number,
  depthMm: number,
  options: Partial<BlueprintProfile> = {},
): CatalogPreset {
  const id = `${kind}-${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-$/, '')}`;
  return {
    id,
    name,
    blueprint: kind,
    category: 'custom',
    shape: 'rectangle',
    widthMm: Math.round(widthMm),
    depthMm: Math.round(depthMm),
    blueprintProfile: {
      referenceWidthMm: widthMm,
      referenceDepthMm: depthMm,
      presetId: id,
      ...options,
    },
  };
}
const p = roomPreset;
export const bathroomCatalog = [
  { ...p('toilet', 'Toilet · Floor-standing', 380, 670), name: 'Toilet' },
  {
    ...p('basin-vanity', 'Washbasin Vanity · Single', 800, 500),
    name: 'Sink',
  },
  p('bathtub', 'Bathtub', 750, 1700),
  p('shower', 'Shower', 900, 900),
  p('bidet', 'Bidet', 360, 550),
  p('bathroom-cabinet', 'Bathroom Storage Cabinet', 400, 350),
  p('washing-machine', 'Washing Machine', 600, 600),
  p('dryer', 'Tumble Dryer', 600, 650),
  p('towel-rail', 'Towel Rail', 500, 100, {
    mounting: 'wall',
  }),
];
export const kitchenCatalog = [
  p('kitchen-cabinet', 'Base Cabinet / Worktop · Straight', 600, 600),
  p('kitchen-cabinet', 'Base Cabinet / Worktop · Corner', 1000, 1000, {
    form: 'corner',
  }),
  p('wall-cabinet', 'Wall Cabinet', 600, 350, {
    mounting: 'wall',
  }),
  p('pantry', 'Tall Pantry Cabinet', 600, 600),
  p('kitchen-island', 'Kitchen Island', 1800, 900),
  p('kitchen-sink', 'Kitchen Sink', 600, 500, {
    mounting: 'surface',
  }),
  p('oven', 'Oven', 600, 550, {
    mounting: 'surface',
  }),
  p('cooker', 'Cooker / Range', 600, 600),
  p('fridge', 'Refrigerator · Standard', 600, 650),
  p('fridge', 'Refrigerator · Side-by-side', 910, 720, {
    form: 'side-by-side',
  }),
  p('dishwasher', 'Dishwasher', 600, 600),
  p('microwave', 'Microwave', 490, 380, {
    mounting: 'surface',
  }),
  p('coffee-machine', 'Coffee Machine', 250, 400, {
    mounting: 'surface',
  }),
  p('kettle', 'Kettle', 220, 240, {
    mounting: 'surface',
  }),
  p('toaster', 'Toaster', 300, 180, {
    mounting: 'surface',
  }),
  p('waste-bin', 'Waste Bin', 300, 350),
  p('bar-stool', 'Bar Stool', 420, 420),
];

// Generic screen chassis envelopes. Image width uses 16:9 diagonal geometry;
// casing/feet are representative, not dimensions attributed to a named TV.
const tvSizes = [32, 43, 50, 55, 65, 75, 85, 98, 100];
export const livingFurnitureCatalog: CatalogPreset[] = [
  { ...p('sofa', 'Sofa · Straight', 2100, 900), id: 'sofa' },
  p('sofa', 'Sofa · L-shaped', 2800, 1800, { form: 'l' }),
  p('sofa', 'Sofa · U-shaped', 3400, 2000, { form: 'u' }),
  p('armchair', 'Armchair', 850, 900),
  p('coffee-table', 'Coffee Table · Rectangular', 1100, 600),
  {
    ...p('coffee-table', 'Coffee Table · Round', 1000, 1000, {
      form: 'round',
    }),
    id: 'round-table',
    blueprintProfile: {
      referenceWidthMm: 1000,
      referenceDepthMm: 1000,
      presetId: 'round-table',
      form: 'round',
    },
    shape: 'ellipse',
  },
  p('side-table', 'Side Table', 450, 450),
  ...tvSizes.flatMap((size) => {
    const imageWidthMm = Math.round((size * 25.4 * 16) / Math.hypot(16, 9));
    return ['Stand', 'Wall-mounted'].map((mode) =>
      (() => {
        const preset = p(
          'tv',
          `TV · ${size}″ ${mode}`,
          imageWidthMm + 20,
          mode === 'Stand' ? Math.round(180 + size * 2) : 70,
          {
            panelDepthMm: 60,
            imageDiagonalIn: size,
            imageWidthMm,
            mounting: mode === 'Stand' ? 'surface' : 'wall',
          },
        );
        return {
          ...preset,
          name: `${mode === 'Stand' ? 'TV with Stand' : 'Wall-mounted TV'} · ${size}″`,
        };
      })(),
    );
  }),
  p('media-cabinet', 'TV / Media Cabinet', 1800, 400),
  p('sideboard', 'Sideboard', 1600, 450),
  p('bookcase', 'Bookcase', 800, 300),
  p('display-cabinet', 'Display Cabinet', 800, 400),
  p('floor-lamp', 'Floor Lamp', 450, 450),
  p('plant', 'Plant · Desk Succulent', 160, 160, {
    form: 'succulent',
    mounting: 'surface',
  }),
  p('plant', 'Plant · Small Desk Plant', 240, 240, {
    form: 'desk-plant',
    mounting: 'surface',
  }),
  p('plant', 'Plant · Compact Floor Plant', 400, 400, {
    form: 'compact-floor',
  }),
  p('plant', 'Plant · Large Leafy Plant', 600, 600, {
    form: 'broadleaf',
  }),
  p('plant', 'Plant · Small Palm', 800, 800, { form: 'small-palm' }),
  p('plant', 'Plant · Large Palm', 1200, 1200, {
    form: 'large-palm',
  }),
];

export const cinemaFurnitureCatalog = [
  ...[80, 92, 100, 110, 120, 135, 150, 180, 200].flatMap((size) => {
    const imageWidthMm = Math.round((size * 25.4 * 16) / Math.hypot(16, 9));
    return ['Fixed frame', 'Retractable'].map((mode) =>
      p(
        'projector-screen',
        `Projector Screen · ${size}″ ${mode}`,
        imageWidthMm + (mode === 'Fixed frame' ? 100 : 160),
        mode === 'Fixed frame' ? 50 : 110,
        {
          form: mode === 'Fixed frame' ? 'fixed' : 'retractable',
          mounting: 'wall',
          imageDiagonalIn: size,
          imageWidthMm,
        },
      ),
    );
  }),
  p('projector', 'Projector · Standard throw', 410, 310, {
    mounting: 'ceiling',
  }),
  p('projector', 'Projector · Ultra-short throw', 550, 350, {
    form: 'ust',
    mounting: 'surface',
  }),
  p('tower-speaker', 'Floorstanding Speaker', 250, 350),
  p('centre-speaker', 'Centre Speaker', 500, 250),
  p('av-receiver', 'AV Receiver', 435, 380, {
    mounting: 'surface',
  }),
  p('speaker-stand', 'Speaker Stand', 300, 300),
  {
    ...p('cinema-seat', 'Cinema Seat · Upright', 950, 1000),
    name: 'Cinema Seat',
  },
  p('acoustic-panel', 'Acoustic Wall Panel', 600, 100, {
    mounting: 'wall',
  }),
  p('bass-trap', 'Corner Bass Trap', 400, 400, { mounting: 'corner' }),
];
