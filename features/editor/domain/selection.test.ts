import { describe, expect, it } from 'vitest';
import { createStarterPlan } from './plan-document';
import {
  boundsFromPoints,
  getObjectSelectionBounds,
  getObjectsSelectionBounds,
  objectsOverlap,
  objectsIntersectingBounds,
} from './selection';

describe('marquee selection geometry', () => {
  it('normalizes a selection dragged in any direction', () => {
    expect(boundsFromPoints({ x: 500, y: 300 }, { x: 100, y: 700 })).toEqual({
      minX: 100,
      minY: 300,
      maxX: 500,
      maxY: 700,
    });
  });

  it('accounts for object rotation when finding its bounds', () => {
    const object = {
      ...createStarterPlan().objects[0],
      widthMm: 1000,
      depthMm: 400,
      positionMm: { x: 1000, y: 1000 },
      rotationDeg: 90,
    };

    expect(getObjectSelectionBounds(object)).toEqual({
      minX: 800,
      minY: 500,
      maxX: 1200,
      maxY: 1500,
    });
  });

  it('selects every object touched by the marquee', () => {
    const objects = createStarterPlan().objects;

    expect(
      objectsIntersectingBounds(objects, {
        minX: 300,
        minY: 300,
        maxX: 4000,
        maxY: 3000,
      }),
    ).toEqual(['sofa-1', 'table-1']);
  });

  it('combines object bounds into one selection outline', () => {
    expect(getObjectsSelectionBounds(createStarterPlan().objects)).toEqual({
      minX: 400,
      minY: 550,
      maxX: 3950,
      maxY: 2850,
    });
  });

  it('detects visual footprint overlap without treating touching edges as overlap', () => {
    const source = createStarterPlan().objects[0];
    const overlapping = {
      ...createStarterPlan().objects[1],
      positionMm: { x: source.positionMm.x + 1200, y: source.positionMm.y },
    };
    const touching = {
      ...overlapping,
      positionMm: { x: source.positionMm.x + 1550, y: source.positionMm.y },
    };

    expect(objectsOverlap(source, overlapping)).toBe(true);
    expect(objectsOverlap(source, touching)).toBe(false);
  });
});
