import { describe, expect, it } from 'vitest';
import { createStarterPlan } from './plan-document';
import {
  createObjectGroup,
  deleteObjects,
  duplicateObjects,
  mirrorObjects,
  moveObjects,
  positionOverlappingObjects,
  rotateObjects,
  scaleObjects,
} from './commands';

describe('editor commands', () => {
  it('moves selected objects in millimetres without mutating the source', () => {
    const source = createStarterPlan();
    const originalPosition = source.objects[0].positionMm;
    const moved = moveObjects(source, ['sofa-1'], { x: 40, y: -10 });

    expect(moved.objects[0].positionMm).toEqual({ x: 1490, y: 990 });
    expect(source.objects[0].positionMm).toBe(originalPosition);
    expect(source.objects[0].positionMm).toEqual({ x: 1450, y: 1000 });
  });

  it('duplicates selected objects with deterministic new identities', () => {
    const source = createStarterPlan();
    const result = duplicateObjects(source, ['table-1'], () => 'table-copy');

    expect(result.duplicatedIds).toEqual(['table-copy']);
    expect(result.document.objects).toHaveLength(3);
    expect(result.document.objects[2]).toMatchObject({
      id: 'table-copy',
      name: 'Round table copy',
      positionMm: { x: 3550, y: 2450 },
    });
  });

  it('preserves locked objects when deleting a selection', () => {
    const source = createStarterPlan();
    const locked = {
      ...source,
      objects: source.objects.map((object) => ({ ...object, locked: true })),
    };

    expect(deleteObjects(locked, ['sofa-1']).objects).toHaveLength(2);
    expect(deleteObjects(source, ['sofa-1']).objects).toHaveLength(1);
  });

  it('positions an object forward and backward among overlapping objects', () => {
    const source = createStarterPlan();
    const overlapping = {
      ...source,
      objects: source.objects.map((object) =>
        object.id === 'table-1'
          ? { ...object, positionMm: source.objects[0].positionMm }
          : object,
      ),
    };
    const forward = positionOverlappingObjects(
      overlapping,
      ['sofa-1'],
      'bring-forward',
    );

    expect(forward.objects.map((object) => object.id)).toEqual([
      'table-1',
      'sofa-1',
    ]);
    expect(
      positionOverlappingObjects(
        forward,
        ['sofa-1'],
        'send-backward',
      ).objects.map((object) => object.id),
    ).toEqual(['sofa-1', 'table-1']);
  });

  it('moves multiple objects to an extreme without changing their relative order', () => {
    const source = createStarterPlan();
    const thirdObject = {
      ...source.objects[0],
      id: 'chair-1',
      name: 'Chair',
    };
    const withThirdObject = {
      ...source,
      objects: [
        source.objects[0],
        { ...source.objects[1], positionMm: source.objects[0].positionMm },
        thirdObject,
      ],
    };

    const front = positionOverlappingObjects(
      withThirdObject,
      ['sofa-1', 'table-1'],
      'bring-to-front',
    );
    expect(front.objects.map((object) => object.id)).toEqual([
      'chair-1',
      'sofa-1',
      'table-1',
    ]);
    expect(
      positionOverlappingObjects(
        front,
        ['sofa-1', 'table-1'],
        'send-to-back',
      ).objects.map((object) => object.id),
    ).toEqual(['sofa-1', 'table-1', 'chair-1']);
  });

  it('ignores position changes when objects do not overlap', () => {
    const source = createStarterPlan();

    expect(
      positionOverlappingObjects(source, ['sofa-1'], 'bring-to-front'),
    ).toBe(source);
  });

  it('skips unrelated objects when moving to the next overlapping object', () => {
    const source = createStarterPlan();
    const overlappingChair = {
      ...source.objects[0],
      id: 'chair-1',
      name: 'Chair',
    };
    const withUnrelatedObjectBetween = {
      ...source,
      objects: [...source.objects, overlappingChair],
    };

    expect(
      positionOverlappingObjects(
        withUnrelatedObjectBetween,
        ['sofa-1'],
        'bring-forward',
      ).objects.map((object) => object.id),
    ).toEqual(['table-1', 'chair-1', 'sofa-1']);
  });

  it('scales a selection around its shared bounds', () => {
    const scaled = scaleObjects(createStarterPlan(), ['sofa-1', 'table-1'], 2);

    expect(scaled.objects[0]).toMatchObject({
      positionMm: { x: 725, y: 300 },
      widthMm: 4200,
      depthMm: 1800,
    });
    expect(scaled.objects[1].positionMm).toEqual({ x: 4725, y: 3000 });
  });

  it('rotates a selection as a unit around its shared bounds', () => {
    const rotated = rotateObjects(
      createStarterPlan(),
      ['sofa-1', 'table-1'],
      180,
    );

    expect(rotated.objects[0]).toMatchObject({
      positionMm: { x: 2900, y: 2400 },
      rotationDeg: 180,
    });
    expect(rotated.objects[1].positionMm).toEqual({ x: 900, y: 1050 });
  });

  it('mirrors the arrangement and each object across a shared axis', () => {
    const mirrored = mirrorObjects(
      createStarterPlan(),
      ['sofa-1', 'table-1'],
      'horizontal',
    );

    expect(mirrored.objects[0]).toMatchObject({
      positionMm: { x: 2900, y: 1000 },
      rotationDeg: 0,
      mirroredHorizontally: true,
    });
    expect(mirrored.objects[1].positionMm).toEqual({ x: 900, y: 2350 });
  });

  it('persists group membership and carries it into a duplicated group', () => {
    const grouped = createObjectGroup(
      createStarterPlan(),
      ['sofa-1', 'table-1'],
      'group-1',
      'Group 1',
    );
    const duplicated = duplicateObjects(
      grouped,
      ['sofa-1', 'table-1'],
      (object) => `${object.id}-copy`,
      () => 'group-2',
    );

    expect(grouped.groups).toEqual([
      {
        id: 'group-1',
        name: 'Group 1',
        objectIds: ['sofa-1', 'table-1'],
      },
    ]);
    expect(
      createObjectGroup(
        grouped,
        ['sofa-1', 'table-1'],
        'replacement-group',
        'Replacement group',
      ),
    ).toBe(grouped);
    expect(duplicated.document.groups[1]).toEqual({
      id: 'group-2',
      name: 'Group 1 copy',
      objectIds: ['sofa-1-copy', 'table-1-copy'],
    });
  });

  it('removes invalid group remnants when an object is deleted', () => {
    const grouped = createObjectGroup(
      createStarterPlan(),
      ['sofa-1', 'table-1'],
      'group-1',
      'Group 1',
    );

    expect(deleteObjects(grouped, ['sofa-1']).groups).toEqual([]);
  });
});
