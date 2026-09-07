import {
  bathroomCatalog,
  kitchenCatalog,
  livingFurnitureCatalog,
  cinemaFurnitureCatalog,
  roomPreset,
} from './room-catalog';
import { homepodCatalog } from './homepod-catalog';
import { sonosCatalog } from './sonos-catalog';
import { profileForPreset, type BlueprintProfile } from './blueprint-profile';
import type { OfficeKind, BlueprintKind } from './office-blueprints';
import type {
  FootprintShape,
  ObjectCategory,
  PlanObject,
} from './plan-document';

export type CatalogPreset = {
  id: string;
  name: string;
  category: ObjectCategory;
  shape: FootprintShape;
  widthMm: number;
  depthMm: number;
  blueprint?: BlueprintKind;
  blueprintProfile?: BlueprintProfile;
};

export type LibraryCategory = {
  id: string;
  name: string;
  presets?: readonly CatalogPreset[];
};

export const basicShapeCatalog: CatalogPreset[] = [
  {
    id: 'square',
    name: 'Square',
    category: 'custom',
    shape: 'rectangle',
    widthMm: 1000,
    depthMm: 1000,
  },
  {
    id: 'triangle',
    name: 'Triangle',
    category: 'custom',
    shape: 'triangle',
    widthMm: 1000,
    depthMm: 1000,
  },
  {
    id: 'rectangle',
    name: 'Rectangle',
    category: 'custom',
    shape: 'rectangle',
    widthMm: 1200,
    depthMm: 800,
  },
  {
    id: 'circle',
    name: 'Circle',
    category: 'custom',
    shape: 'ellipse',
    widthMm: 1000,
    depthMm: 1000,
  },
  {
    id: 'oval',
    name: 'Oval',
    category: 'custom',
    shape: 'ellipse',
    widthMm: 1200,
    depthMm: 800,
  },
  {
    id: 'polygon',
    name: 'Polygon',
    category: 'custom',
    shape: 'polygon',
    widthMm: 1000,
    depthMm: 1000,
  },
];

// Generic presets are representative outer footprints, not manufacturer specifications.
// Monitor depth includes the stand; diagonals describe the screen, never its top view.
const officePreset = (
  blueprint: OfficeKind,
  name: string,
  widthMm: number,
  depthMm: number,
): CatalogPreset => ({
  id: `office-${blueprint}-${widthMm}-${depthMm}`,
  name,
  blueprint,
  blueprintProfile: profileForPreset(name, widthMm, depthMm),
  category:
    blueprint === 'table'
      ? 'table'
      : blueprint === 'chair' || blueprint === 'ergonomic-chair'
        ? 'seating'
        : 'device',
  shape: 'rectangle',
  widthMm,
  depthMm,
});

// Manufacturer machine envelopes; accessories and operating clearance are excluded.
// Sources: docs/product/bambu-lab-dimensions.md.
const bambuPrinter = (
  model: string,
  widthMm: number,
  depthMm: number,
  form = 'enclosed',
): CatalogPreset => {
  const id = `office-bambu-lab-${model.toLowerCase().replaceAll(' ', '-')}`;
  return {
    ...officePreset(
      '3d-printer',
      `Bambu Lab 3D Printer · ${model}`,
      widthMm,
      depthMm,
    ),
    id,
    blueprintProfile: {
      presetId: id,
      form,
      referenceWidthMm: widthMm,
      referenceDepthMm: depthMm,
    },
  };
};

export const homeOfficeCatalog: CatalogPreset[] = [
  officePreset('table', 'Table · 120 × 60 cm', 1200, 600),
  officePreset('table', 'Table · 140 × 70 cm', 1400, 700),
  officePreset('table', 'Table · 160 × 80 cm', 1600, 800),
  officePreset('table', 'Table · 180 × 80 cm', 1800, 800),
  officePreset('table', 'Table · 200 × 80 cm', 2000, 800),
  officePreset('ergonomic-chair', 'Ergonomic Chair', 700, 700),
  officePreset('chair', 'Normal Chair', 390, 470),
  officePreset('desk-lamp', 'Desk Lamp', 180, 280),
  officePreset('keyboard', 'Keyboard · Compact 60%', 293, 103),
  officePreset('keyboard', 'Keyboard · 75%', 313, 123),
  officePreset('keyboard', 'Keyboard · Tenkeyless', 359, 127),
  officePreset('keyboard', 'Keyboard · Full size', 436, 130),
  officePreset('monitor', 'Monitor · 19″', 445, 171),
  officePreset('monitor', 'Monitor · 22″', 487, 180),
  officePreset('monitor', 'Monitor · 24″', 538, 180),
  officePreset('monitor', 'Monitor · 25″', 568, 185),
  officePreset('monitor', 'Monitor · 27″', 610, 190),
  officePreset('monitor', 'Monitor · 28″', 639, 251),
  officePreset('monitor', 'Monitor · 32″', 713, 233),
  officePreset('monitor', 'Monitor · 43″', 967, 256),
  officePreset('ultrawide-monitor', 'Ultrawide Monitor · 29″', 689, 224),
  officePreset('ultrawide-monitor', 'Ultrawide Monitor · 30″', 703, 287),
  officePreset('ultrawide-monitor', 'Ultrawide Monitor · 34″', 808, 238),
  officePreset('ultrawide-monitor', 'Ultrawide Monitor · 35″', 832, 251),
  officePreset('ultrawide-monitor', 'Ultrawide Monitor · 38″', 894, 251),
  officePreset('ultrawide-monitor', 'Ultrawide Monitor · 39″', 888, 310),
  officePreset('ultrawide-monitor', 'Ultrawide Monitor · 40″', 947, 253),
  officePreset('ultrawide-monitor', 'Ultrawide Monitor · 45″', 993, 335),
  officePreset('ultrawide-monitor', 'Ultrawide Monitor · 49″', 1148, 421),
  officePreset('ultrawide-monitor', 'Ultrawide Monitor · 57″', 1328, 500),
  officePreset('mouse', 'Mouse', 60, 99),
  officePreset('deskmat', 'Deskmat · Small', 300, 250),
  officePreset('deskmat', 'Deskmat · Medium', 450, 400),
  officePreset('deskmat', 'Deskmat · Large', 800, 300),
  officePreset('deskmat', 'Deskmat · XL', 900, 400),
  officePreset('deskmat', 'Deskmat · XXL', 1000, 500),
  officePreset('deskmat', 'Deskmat · Full desk', 1200, 600),
  officePreset('desktop-pc', 'Desktop PC · SFF / Mini-ITX', 185, 376),
  officePreset('desktop-pc', 'Desktop PC · Mini tower / mATX', 215, 432),
  officePreset('desktop-pc', 'Desktop PC · Mid tower / ATX', 215, 474),
  officePreset('desktop-pc', 'Desktop PC · Full tower', 240, 600),
  officePreset('speaker', 'Desktop Speaker · Small', 85, 105),
  officePreset('speaker', 'Desktop Speaker · Bookshelf', 146, 196),
  officePreset('speaker', 'Desktop Speaker · Studio 5″', 170, 222),
  officePreset('speaker', 'Desktop Speaker · Studio 6.5″', 210, 284),
  officePreset('speaker', 'Desktop Speaker · Studio 8″', 250, 334),
  officePreset('laptop', 'Apple Laptop · Closed 14″', 313, 221),
  officePreset('laptop', 'Apple Laptop · Closed 16″', 356, 248),
  officePreset('mac-mini', 'Apple Mac mini', 127, 127),
  bambuPrinter('A1 mini', 347, 315, 'cantilever'),
  bambuPrinter('A1', 465, 410, 'bed-slinger'),
  bambuPrinter('P1P', 386, 389, 'open-corexy'),
  bambuPrinter('P1S', 389, 389),
  bambuPrinter('P2S', 392, 406),
  bambuPrinter('X1 Carbon', 389, 389),
  bambuPrinter('H2S', 492, 514),
  bambuPrinter('H2D', 492, 514),
];

// US mattress convention. The generic frame adds 50 mm per side, a
// 100 mm headboard and a 50 mm foot rail; these are separate from mattress size.
const bedPreset = (
  size: string,
  widthIn: number,
  lengthIn: number,
): CatalogPreset => {
  const mattressWidthMm = Math.round(widthIn * 25.4);
  const mattressDepthMm = Math.round(lengthIn * 25.4);
  const widthMm = mattressWidthMm + 100,
    depthMm = mattressDepthMm + 150;
  return {
    id: `bed-${size.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: `Bed · ${size}`,
    category: 'seating',
    shape: 'rectangle',
    blueprint: 'bed',
    widthMm,
    depthMm,
    blueprintProfile: {
      referenceWidthMm: widthMm,
      referenceDepthMm: depthMm,
      mattressWidthMm,
      mattressDepthMm,
    },
  };
};
const bedroomObject = (
  blueprint: BlueprintKind,
  name: string,
  widthMm: number,
  depthMm: number,
  category: ObjectCategory = 'custom',
): CatalogPreset => ({
  id: `bedroom-${blueprint}`,
  blueprint,
  name,
  widthMm,
  depthMm,
  category,
  shape: blueprint === 'bedside-lamp' ? 'ellipse' : 'rectangle',
});
export const bedroomCatalog: CatalogPreset[] = [
  bedPreset('Twin', 38, 75),
  bedPreset('Twin XL', 38, 80),
  bedPreset('Full / Double', 53, 75),
  bedPreset('Queen', 60, 80),
  bedPreset('King', 76, 80),
  bedPreset('California King', 72, 84),
  bedroomObject('bedside-table', 'Bedside Table', 400, 480, 'table'),
  bedroomObject('wardrobe', 'Wardrobe', 1170, 550),
  bedroomObject('chest-of-drawers', 'Chest of Drawers', 800, 480),
  bedroomObject('vanity', 'Dresser / Vanity', 1000, 500, 'table'),
  bedroomObject('pouf', 'Stool / Pouf', 450, 450, 'seating'),
  bedroomObject('bedroom-bench', 'Bedroom Bench', 1200, 400, 'seating'),
  bedroomObject('bedside-lamp', 'Bedside Lamp', 250, 250, 'device'),
  bedroomObject('rug', 'Rug', 1600, 2300),
  bedroomObject('laundry-basket', 'Laundry Basket', 400, 300),
  bedroomObject('clothes-rail', 'Clothes Rail', 990, 460),
];
export const structuralCatalog: CatalogPreset[] = [
  bedroomObject('stairs-straight', 'Straight Stairs', 1000, 3000),
  bedroomObject('stairs-landing', 'Corner Stairs', 2500, 2500),
  bedroomObject('stairs-return', 'U-shaped Stairs', 2200, 3200),
  bedroomObject('door', 'Door', 900, 900),
  bedroomObject('double-door', 'Double Door', 1600, 800),
  bedroomObject('window', 'Window', 1200, 120),
].map((preset) => ({ ...preset, id: `structural-${preset.blueprint}` }));
// Generic outer envelopes, including stands/mounts; not manufacturer specifications.
export const instrumentsCatalog: CatalogPreset[] = [
  roomPreset('grand-piano', 'Full-size Grand Piano', 1600, 2750),
  roomPreset(
    'electric-piano',
    'Electric Piano · 88 keys with stand',
    1400,
    400,
  ),
  roomPreset('acoustic-drums', 'Full-size Acoustic Drum Set', 2000, 1500),
  roomPreset('guitar-stand', 'Guitar on a Stand', 500, 450),
  roomPreset('guitar-wall', 'Guitar on a Wall Mount', 412, 200, {
    mounting: 'wall',
  }),
];

// Top-down frame footprints: width and frame thickness only. Keep saved preset IDs stable.
export const pictureCatalog: CatalogPreset[] = [
  [100, '10-15'],
  [130, '13-18'],
  [210, '21-29-7'],
  [300, '30-40'],
  [400, '40-50'],
  [500, '50-70'],
  [600, '60-90'],
  [700, '70-100'],
].map(([width, legacySize]) => {
  const widthMm = Number(width);
  const id = `framed-picture-picture-in-a-frame-wall-mounted-${legacySize}-cm`;
  const preset = roomPreset(
    'framed-picture',
    `Picture in a Frame (Wall-mounted) · ${widthMm / 10} cm wide`,
    widthMm,
    30,
    { mounting: 'wall' },
  );
  return {
    ...preset,
    id,
    blueprintProfile: { ...preset.blueprintProfile!, presetId: id },
  };
});

export const livingRoomCatalog: CatalogPreset[] = [
  ...livingFurnitureCatalog,
  ...pictureCatalog,
  roomPreset('dining-table', 'Dining Table · Rectangular', 1800, 900),
  roomPreset('dining-table', 'Dining Table · Round', 1200, 1200, {
    form: 'round',
  }),
  roomPreset('dining-chair', 'Dining Chair', 480, 540),
];
export const homeCinemaCatalog = [
  ...cinemaFurnitureCatalog,
  ...sonosCatalog,
  ...homepodCatalog,
];

export const objectCatalog = [
  ...homeOfficeCatalog,
  ...instrumentsCatalog,
  ...bedroomCatalog,
  ...structuralCatalog,
  ...bathroomCatalog,
  ...kitchenCatalog,
  ...livingRoomCatalog,
  ...homeCinemaCatalog,
];

export const libraryCategories: readonly LibraryCategory[] = [
  {
    id: 'basic-shapes',
    name: 'Basic Shapes',
    presets: basicShapeCatalog,
  },
  { id: 'structural', name: 'Structural', presets: structuralCatalog },
  { id: 'kitchen', name: 'Kitchen', presets: kitchenCatalog },
  { id: 'bathroom', name: 'Bathroom', presets: bathroomCatalog },
  { id: 'living-room', name: 'Living Room', presets: livingRoomCatalog },
  { id: 'bedroom', name: 'Bedroom', presets: bedroomCatalog },
  { id: 'home-office', name: 'Home Office', presets: homeOfficeCatalog },
  { id: 'instruments', name: 'Instruments', presets: instrumentsCatalog },
  { id: 'home-cinema', name: 'Home Cinema', presets: homeCinemaCatalog },
];

export const starterCatalog: CatalogPreset[] = [
  {
    id: 'sofa',
    name: 'Three-seat sofa',
    category: 'seating',
    shape: 'rectangle',
    widthMm: 2100,
    depthMm: 900,
  },
  {
    id: 'desk',
    name: 'Desk',
    category: 'table',
    shape: 'rectangle',
    widthMm: 1600,
    depthMm: 800,
  },
  {
    id: 'round-table',
    name: 'Round table',
    category: 'table',
    shape: 'ellipse',
    widthMm: 1000,
    depthMm: 1000,
  },
  {
    id: 'device',
    name: 'Custom device',
    category: 'device',
    shape: 'rectangle',
    widthMm: 600,
    depthMm: 300,
  },
];

export function getObjectDefaultSize(object: PlanObject): {
  widthMm: number;
  depthMm: number;
} {
  if (object.defaultSizeMm) return object.defaultSizeMm;
  // Older saved objects predate stored defaults, including duplicated presets.
  const originalName = object.name.replace(/(?: copy)+$/, '');
  const presetId = getBlueprintProfile(object)?.presetId;
  const preset = [
    ...libraryCategories.flatMap((category) => category.presets ?? []),
    ...starterCatalog,
  ].find(
    (candidate) =>
      (candidate.name === originalName || candidate.id === presetId) &&
      candidate.category === object.category &&
      candidate.shape === object.shape,
  );
  return {
    widthMm: preset?.widthMm ?? object.widthMm,
    depthMm: preset?.depthMm ?? object.depthMm,
  };
}

export function objectFromPreset(
  preset: CatalogPreset,
  id: string,
  positionMm: PlanObject['positionMm'],
): PlanObject {
  return {
    id,
    name: preset.name,
    category: preset.category,
    shape: preset.shape,
    blueprint: preset.blueprint,
    blueprintProfile: {
      referenceWidthMm: preset.widthMm,
      referenceDepthMm: preset.depthMm,
      ...preset.blueprintProfile,
      presetId: preset.id,
    },
    positionMm,
    rotationDeg: 0,
    widthMm: preset.widthMm,
    depthMm: preset.depthMm,
    defaultSizeMm: { widthMm: preset.widthMm, depthMm: preset.depthMm },
    locked: false,
    mirroredHorizontally: false,
    mirroredVertically: false,
  };
}

// Old plans have no stored profile. Recover it by preset name without changing
// their saved dimensions or the user's arrangement. Renames retain new profiles.
export function getBlueprintProfile(
  object: Pick<PlanObject, 'name' | 'blueprintProfile'>,
) {
  return (
    object.blueprintProfile ??
    objectCatalog.find(
      (preset) =>
        preset.name === object.name.replace(/(?: copy)+$/, '') ||
        (preset.blueprint === 'tv' &&
          `TV · ${preset.blueprintProfile?.imageDiagonalIn}″ ${preset.blueprintProfile?.mounting === 'wall' ? 'Wall-mounted' : 'Stand'}` ===
            object.name.replace(/(?: copy)+$/, '')),
    )?.blueprintProfile
  );
}

export function catalogSearchText(preset: CatalogPreset): string {
  const aliases: Record<string, string> = {
    'grand-piano':
      'instrument music acoustic concert grand wing full size 88 keys',
    'upright-piano': 'instrument music acoustic upright full size 88 keys',
    'electric-piano': 'instrument music digital electrical keyboard',
    'acoustic-drums': 'instrument music acoustic drums drum kit cymbals stool',
    'guitar-stand': 'instrument music acoustic guitar floor stand',
    'guitar-wall': 'instrument music acoustic guitar wall mounted hanger',
    'framed-picture': 'picture photo photograph art poster frame wall mounted',
    homepod: 'apple smart speaker audio siri airplay',
    'sonos-speaker': 'front rear surround audio',
    soundbar: 'front audio',
    subwoofer: 'bass audio',
    sofa: 'couch sectional',
    'dining-table': 'dining dinner',
    'dining-chair': 'normal chair dining',
    rug: 'bath mat carpet',
    pouf: 'ottoman stool',
    'bedroom-bench': 'dining bench',
    'acoustic-panel': 'soundproof wallmount absorber',
  };
  return `${preset.name} ${aliases[preset.blueprint ?? ''] ?? ''}`.toLowerCase();
}

/** Mounting changes a TV's footprint and interaction, so these are separate objects. */
export function catalogFamilyKey(
  object: Pick<PlanObject, 'blueprint' | 'blueprintProfile' | 'name'>,
): string {
  return object.blueprint === 'tv'
    ? `tv-${getBlueprintProfile(object)?.mounting === 'wall' ? 'wall' : 'stand'}`
    : object.blueprint === 'homepod'
      ? `homepod-${object.blueprintProfile?.form ?? 'full'}`
      : (object.blueprint ?? object.name);
}

/** Preserve custom names, but update automatic preset names (including old TV names). */
export function nameForObjectVariant(
  object: PlanObject,
  preset: CatalogPreset,
): string {
  const baseName = object.name.replace(/(?: copy)+$/, '');
  const automatic = objectCatalog.some(
    (candidate) =>
      catalogFamilyKey(candidate) === catalogFamilyKey(object) &&
      (candidate.name === baseName ||
        (candidate.blueprint === 'tv' &&
          `TV · ${candidate.blueprintProfile?.imageDiagonalIn}″ ${candidate.blueprintProfile?.mounting === 'wall' ? 'Wall-mounted' : 'Stand'}` ===
            baseName)),
  );
  return automatic
    ? `${preset.name}${object.name.slice(baseName.length)}`
    : object.name;
}
