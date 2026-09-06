import type { CatalogPreset } from './catalog';
import type { BlueprintKind } from './office-blueprints';
import type { BlueprintProfile } from './blueprint-profile';

export function roomPreset(
  kind: BlueprintKind,
  name: string,
  widthMm: number,
  depthMm: number,
  heightMm: number,
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
    heightMm: Math.round(heightMm),
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
  { ...p('toilet', 'Toilet · Floor-standing', 380, 670, 780), name: 'Toilet' },
  {
    ...p('basin-vanity', 'Washbasin Vanity · Single', 800, 500, 850),
    name: 'Sink',
  },
  p('bathtub', 'Bathtub', 750, 1700, 600),
  p('shower', 'Shower', 900, 900, 2100),
  p('bidet', 'Bidet', 360, 550, 400),
  p('bathroom-cabinet', 'Bathroom Storage Cabinet', 400, 350, 1800),
  p('washing-machine', 'Washing Machine', 600, 600, 850),
  p('dryer', 'Tumble Dryer', 600, 650, 850),
  p('towel-rail', 'Towel Rail', 500, 100, 1200, {
    mounting: 'wall',
    mountingHeightMm: 600,
  }),
];
export const kitchenCatalog = [
  p('kitchen-cabinet', 'Base Cabinet / Worktop · Straight', 600, 600, 900),
  p('kitchen-cabinet', 'Base Cabinet / Worktop · Corner', 1000, 1000, 900, {
    form: 'corner',
  }),
  p('wall-cabinet', 'Wall Cabinet', 600, 350, 700, {
    mounting: 'wall',
    mountingHeightMm: 1450,
  }),
  p('pantry', 'Tall Pantry Cabinet', 600, 600, 2100),
  p('kitchen-island', 'Kitchen Island', 1800, 900, 900),
  p('kitchen-sink', 'Kitchen Sink', 600, 500, 200, {
    mounting: 'surface',
    mountingHeightMm: 900,
  }),
  p('oven', 'Oven', 600, 550, 600, {
    mounting: 'surface',
    mountingHeightMm: 150,
  }),
  p('cooker', 'Cooker / Range', 600, 600, 900),
  p('fridge', 'Refrigerator · Standard', 600, 650, 1850),
  p('fridge', 'Refrigerator · Side-by-side', 910, 720, 1780, {
    form: 'side-by-side',
  }),
  p('dishwasher', 'Dishwasher', 600, 600, 850),
  p('microwave', 'Microwave', 490, 380, 290, {
    mounting: 'surface',
    mountingHeightMm: 900,
  }),
  p('coffee-machine', 'Coffee Machine', 250, 400, 350, {
    mounting: 'surface',
    mountingHeightMm: 900,
  }),
  p('kettle', 'Kettle', 220, 240, 260, {
    mounting: 'surface',
    mountingHeightMm: 900,
  }),
  p('toaster', 'Toaster', 300, 180, 200, {
    mounting: 'surface',
    mountingHeightMm: 900,
  }),
  p('waste-bin', 'Waste Bin', 300, 350, 600),
  p('bar-stool', 'Bar Stool', 420, 420, 750),
];

// Generic screen chassis envelopes. Image width uses 16:9 diagonal geometry;
// casing/feet are representative, not dimensions attributed to a named TV.
const tvSizes = [32, 43, 50, 55, 65, 75, 85, 98, 100];
export const livingFurnitureCatalog: CatalogPreset[] = [
  { ...p('sofa', 'Sofa · Straight', 2100, 900, 820), id: 'sofa' },
  p('sofa', 'Sofa · L-shaped', 2800, 1800, 850, { form: 'l' }),
  p('sofa', 'Sofa · U-shaped', 3400, 2000, 850, { form: 'u' }),
  p('armchair', 'Armchair', 850, 900, 900),
  p('coffee-table', 'Coffee Table · Rectangular', 1100, 600, 450),
  {
    ...p('coffee-table', 'Coffee Table · Round', 1000, 1000, 450, {
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
  p('side-table', 'Side Table', 450, 450, 500),
  ...tvSizes.flatMap((size) => {
    const imageWidthMm = Math.round((size * 25.4 * 16) / Math.hypot(16, 9));
    const imageHeightMm = Math.round((size * 25.4 * 9) / Math.hypot(16, 9));
    return ['Stand', 'Wall-mounted'].map((mode) =>
      (() => {
        const preset = p(
          'tv',
          `TV · ${size}″ ${mode}`,
          imageWidthMm + 20,
          mode === 'Stand' ? Math.round(180 + size * 2) : 70,
          imageHeightMm + 20,
          {
            panelDepthMm: 60,
            imageDiagonalIn: size,
            imageWidthMm,
            imageHeightMm,
            mounting: mode === 'Stand' ? 'surface' : 'wall',
            mountingHeightMm: mode === 'Stand' ? 500 : 1100,
          },
        );
        return {
          ...preset,
          name: `${mode === 'Stand' ? 'TV with Stand' : 'Wall-mounted TV'} · ${size}″`,
        };
      })(),
    );
  }),
  p('media-cabinet', 'TV / Media Cabinet', 1800, 400, 500),
  p('sideboard', 'Sideboard', 1600, 450, 800),
  p('bookcase', 'Bookcase', 800, 300, 2000),
  p('display-cabinet', 'Display Cabinet', 800, 400, 1800),
  p('floor-lamp', 'Floor Lamp', 450, 450, 1600),
  p('plant', 'Plant · Desk Succulent', 160, 160, 200, {
    form: 'succulent',
    mounting: 'surface',
  }),
  p('plant', 'Plant · Small Desk Plant', 240, 240, 350, {
    form: 'desk-plant',
    mounting: 'surface',
  }),
  p('plant', 'Plant · Compact Floor Plant', 400, 400, 800, {
    form: 'compact-floor',
  }),
  p('plant', 'Plant · Large Leafy Plant', 600, 600, 1300, {
    form: 'broadleaf',
  }),
  p('plant', 'Plant · Small Palm', 800, 800, 1700, { form: 'small-palm' }),
  p('plant', 'Plant · Large Palm', 1200, 1200, 2400, {
    form: 'large-palm',
  }),
];

export const cinemaFurnitureCatalog = [
  ...[80, 92, 100, 110, 120, 135, 150, 180, 200].flatMap((size) => {
    const imageWidthMm = Math.round((size * 25.4 * 16) / Math.hypot(16, 9));
    const imageHeightMm = Math.round((size * 25.4 * 9) / Math.hypot(16, 9));
    return ['Fixed frame', 'Retractable'].map((mode) =>
      p(
        'projector-screen',
        `Projector Screen · ${size}″ ${mode}`,
        imageWidthMm + (mode === 'Fixed frame' ? 100 : 160),
        mode === 'Fixed frame' ? 50 : 110,
        imageHeightMm + 100,
        {
          form: mode === 'Fixed frame' ? 'fixed' : 'retractable',
          mounting: 'wall',
          mountingHeightMm: 800,
          imageDiagonalIn: size,
          imageWidthMm,
          imageHeightMm,
        },
      ),
    );
  }),
  p('projector', 'Projector · Standard throw', 410, 310, 160, {
    mounting: 'ceiling',
    mountingHeightMm: 2300,
  }),
  p('projector', 'Projector · Ultra-short throw', 550, 350, 150, {
    form: 'ust',
    mounting: 'surface',
    mountingHeightMm: 500,
  }),
  p('tower-speaker', 'Floorstanding Speaker', 250, 350, 1000),
  p('centre-speaker', 'Centre Speaker', 500, 250, 180),
  p('av-receiver', 'AV Receiver', 435, 380, 170, {
    mounting: 'surface',
    mountingHeightMm: 200,
  }),
  p('speaker-stand', 'Speaker Stand', 300, 300, 838),
  {
    ...p('cinema-seat', 'Cinema Seat · Upright', 950, 1000, 1100),
    name: 'Cinema Seat',
  },
  p('acoustic-panel', 'Acoustic Wall Panel', 600, 100, 1200, {
    mounting: 'wall',
    mountingHeightMm: 600,
  }),
  p('bass-trap', 'Corner Bass Trap', 400, 400, 1200, { mounting: 'corner' }),
];
