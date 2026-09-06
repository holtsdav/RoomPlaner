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
  heightMm?: number;
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
  heightMm: number,
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
  heightMm,
});

// Manufacturer machine envelopes; accessories and operating clearance are excluded.
// Sources: docs/product/bambu-lab-dimensions.md.
const bambuPrinter = (
  model: string,
  widthMm: number,
  depthMm: number,
  heightMm: number,
  form = 'enclosed',
): CatalogPreset => {
  const id = `office-bambu-lab-${model.toLowerCase().replaceAll(' ', '-')}`;
  return {
    ...officePreset(
      '3d-printer',
      `Bambu Lab 3D Printer · ${model}`,
      widthMm,
      depthMm,
      heightMm,
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
  officePreset('table', 'Table · 120 × 60 cm', 1200, 600, 750),
  officePreset('table', 'Table · 140 × 70 cm', 1400, 700, 750),
  officePreset('table', 'Table · 160 × 80 cm', 1600, 800, 750),
  officePreset('table', 'Table · 180 × 80 cm', 1800, 800, 750),
  officePreset('table', 'Table · 200 × 80 cm', 2000, 800, 750),
  officePreset('ergonomic-chair', 'Ergonomic Chair', 700, 700, 1200),
  officePreset('chair', 'Normal Chair', 390, 470, 770),
  officePreset('desk-lamp', 'Desk Lamp', 180, 280, 450),
  officePreset('keyboard', 'Keyboard · Compact 60%', 293, 103, 40),
  officePreset('keyboard', 'Keyboard · 75%', 313, 123, 40),
  officePreset('keyboard', 'Keyboard · Tenkeyless', 359, 127, 42),
  officePreset('keyboard', 'Keyboard · Full size', 436, 130, 40),
  officePreset('monitor', 'Monitor · 19″', 445, 171, 360),
  officePreset('monitor', 'Monitor · 22″', 487, 180, 482),
  officePreset('monitor', 'Monitor · 24″', 538, 180, 496),
  officePreset('monitor', 'Monitor · 25″', 568, 185, 513),
  officePreset('monitor', 'Monitor · 27″', 610, 190, 537),
  officePreset('monitor', 'Monitor · 28″', 639, 251, 479),
  officePreset('monitor', 'Monitor · 32″', 713, 233, 619),
  officePreset('monitor', 'Monitor · 43″', 967, 256, 655),
  officePreset('ultrawide-monitor', 'Ultrawide Monitor · 29″', 689, 224, 407),
  officePreset('ultrawide-monitor', 'Ultrawide Monitor · 30″', 703, 287, 512),
  officePreset('ultrawide-monitor', 'Ultrawide Monitor · 34″', 808, 238, 527),
  officePreset('ultrawide-monitor', 'Ultrawide Monitor · 35″', 832, 251, 573),
  officePreset('ultrawide-monitor', 'Ultrawide Monitor · 38″', 894, 251, 564),
  officePreset('ultrawide-monitor', 'Ultrawide Monitor · 39″', 888, 310, 611),
  officePreset('ultrawide-monitor', 'Ultrawide Monitor · 40″', 947, 253, 622),
  officePreset('ultrawide-monitor', 'Ultrawide Monitor · 45″', 993, 335, 658),
  officePreset('ultrawide-monitor', 'Ultrawide Monitor · 49″', 1148, 421, 568),
  officePreset('ultrawide-monitor', 'Ultrawide Monitor · 57″', 1328, 500, 601),
  officePreset('mouse', 'Mouse', 60, 99, 39),
  officePreset('deskmat', 'Deskmat · Small', 300, 250, 3),
  officePreset('deskmat', 'Deskmat · Medium', 450, 400, 3),
  officePreset('deskmat', 'Deskmat · Large', 800, 300, 3),
  officePreset('deskmat', 'Deskmat · XL', 900, 400, 3),
  officePreset('deskmat', 'Deskmat · XXL', 1000, 500, 3),
  officePreset('deskmat', 'Deskmat · Full desk', 1200, 600, 3),
  officePreset('desktop-pc', 'Desktop PC · SFF / Mini-ITX', 185, 376, 292),
  officePreset('desktop-pc', 'Desktop PC · Mini tower / mATX', 215, 432, 393),
  officePreset('desktop-pc', 'Desktop PC · Mid tower / ATX', 215, 474, 454),
  officePreset('desktop-pc', 'Desktop PC · Full tower', 240, 600, 566),
  officePreset('speaker', 'Desktop Speaker · Small', 85, 105, 175),
  officePreset('speaker', 'Desktop Speaker · Bookshelf', 146, 196, 234),
  officePreset('speaker', 'Desktop Speaker · Studio 5″', 170, 222, 285),
  officePreset('speaker', 'Desktop Speaker · Studio 6.5″', 210, 284, 332),
  officePreset('speaker', 'Desktop Speaker · Studio 8″', 250, 334, 390),
  officePreset('laptop', 'Apple Laptop · Closed 14″', 313, 221, 16),
  officePreset('laptop', 'Apple Laptop · Closed 16″', 356, 248, 17),
  officePreset('mac-mini', 'Apple Mac mini', 127, 127, 50),
  bambuPrinter('A1 mini', 347, 315, 365, 'cantilever'),
  bambuPrinter('A1', 465, 410, 430, 'bed-slinger'),
  bambuPrinter('P1P', 386, 389, 458, 'open-corexy'),
  bambuPrinter('P1S', 389, 389, 458),
  bambuPrinter('P2S', 392, 406, 478),
  bambuPrinter('X1 Carbon', 389, 389, 457),
  bambuPrinter('H2S', 492, 514, 626),
  bambuPrinter('H2D', 492, 514, 626),
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
    heightMm: 1000,
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
  heightMm: number,
  category: ObjectCategory = 'custom',
): CatalogPreset => ({
  id: `bedroom-${blueprint}`,
  blueprint,
  name,
  widthMm,
  depthMm,
  heightMm,
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
  bedroomObject('bedside-table', 'Bedside Table', 400, 480, 550, 'table'),
  bedroomObject('wardrobe', 'Wardrobe', 1170, 550, 1760),
  bedroomObject('chest-of-drawers', 'Chest of Drawers', 800, 480, 780),
  bedroomObject('vanity', 'Dresser / Vanity', 1000, 500, 1590, 'table'),
  bedroomObject('pouf', 'Stool / Pouf', 450, 450, 450, 'seating'),
  bedroomObject('bedroom-bench', 'Bedroom Bench', 1200, 400, 450, 'seating'),
  bedroomObject('bedside-lamp', 'Bedside Lamp', 250, 250, 400, 'device'),
  bedroomObject('rug', 'Rug', 1600, 2300, 10),
  bedroomObject('laundry-basket', 'Laundry Basket', 400, 300, 600),
  bedroomObject('clothes-rail', 'Clothes Rail', 990, 460, 1520),
];
export const structuralCatalog: CatalogPreset[] = [
  bedroomObject('stairs-straight', 'Straight Stairs', 1000, 3000, 2800),
  bedroomObject('stairs-landing', 'Corner Stairs', 2500, 2500, 2800),
  bedroomObject('stairs-return', 'U-shaped Stairs', 2200, 3200, 2800),
  bedroomObject('door', 'Door', 900, 900, 2100),
  bedroomObject('double-door', 'Double Door', 1600, 800, 2100),
  bedroomObject('window', 'Window', 1200, 120, 1200),
].map((preset) => ({ ...preset, id: `structural-${preset.blueprint}` }));
// Generic outer envelopes, including stands/mounts; not manufacturer specifications.
export const instrumentsCatalog: CatalogPreset[] = [
  roomPreset('grand-piano', 'Full-size Grand Piano', 1600, 2750, 1000),
  roomPreset(
    'electric-piano',
    'Electric Piano · 88 keys with stand',
    1400,
    400,
    850,
  ),
  roomPreset('acoustic-drums', 'Full-size Acoustic Drum Set', 2000, 1500, 1400),
  roomPreset('guitar-stand', 'Guitar on a Stand', 500, 450, 1150),
  roomPreset('guitar-wall', 'Guitar on a Wall Mount', 412, 200, 1038, {
    mounting: 'wall',
    mountingHeightMm: 900,
  }),
];

// Labels describe the outer frame width × height. Top-down depth is frame thickness.
export const pictureCatalog: CatalogPreset[] = [
  [100, 150],
  [130, 180],
  [210, 297],
  [300, 400],
  [400, 500],
  [500, 700],
  [600, 900],
  [700, 1000],
].map(([widthMm, heightMm]) =>
  roomPreset(
    'framed-picture',
    `Picture in a Frame (Wall-mounted) · ${widthMm / 10} × ${heightMm / 10} cm`,
    widthMm,
    30,
    heightMm,
    { mounting: 'wall', mountingHeightMm: 1500 - heightMm / 2 },
  ),
);

export const livingRoomCatalog: CatalogPreset[] = [
  ...livingFurnitureCatalog,
  ...pictureCatalog,
  roomPreset('dining-table', 'Dining Table · Rectangular', 1800, 900, 750),
  roomPreset('dining-table', 'Dining Table · Round', 1200, 1200, 750, {
    form: 'round',
  }),
  roomPreset('dining-chair', 'Dining Chair', 480, 540, 850),
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
    heightMm: 820,
  },
  {
    id: 'desk',
    name: 'Desk',
    category: 'table',
    shape: 'rectangle',
    widthMm: 1600,
    depthMm: 800,
    heightMm: 750,
  },
  {
    id: 'round-table',
    name: 'Round table',
    category: 'table',
    shape: 'ellipse',
    widthMm: 1000,
    depthMm: 1000,
    heightMm: 740,
  },
  {
    id: 'device',
    name: 'Custom device',
    category: 'device',
    shape: 'rectangle',
    widthMm: 600,
    depthMm: 300,
    heightMm: 100,
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
    blueprintProfile: preset.blueprintProfile,
    positionMm,
    rotationDeg: 0,
    widthMm: preset.widthMm,
    depthMm: preset.depthMm,
    heightMm: preset.heightMm,
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
