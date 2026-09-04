import { describe, expect, it } from 'vitest';
import { createStarterPlan } from './plan-document';
import { deleteObjects, duplicateObjects, moveObjects } from './commands';

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
});
