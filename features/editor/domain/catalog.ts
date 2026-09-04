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
};

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
    positionMm,
    rotationDeg: 0,
    widthMm: preset.widthMm,
    depthMm: preset.depthMm,
    heightMm: preset.heightMm,
    locked: false,
  };
}
