import { describe, expect, it } from 'vitest';
import {
  starterCatalog,
  basicShapeCatalog,
  objectFromPreset,
  getObjectDefaultSize,
} from './catalog';
import { updateObject, duplicateObjects } from './commands';
import { createStarterPlan, planDocumentSchema } from './plan-document';
import { findPresetPosition, pointInRoom } from './placement';

describe('bounded object placement', () => {
  it('keeps repeated additions inside the room', () => {
    const plan = createStarterPlan();
    for (let index = 0; index < 50; index++) {
      const preset = starterCatalog[index % starterCatalog.length];
      const position = findPresetPosition(plan, preset);
      expect(position).not.toBeNull();
      expect(position!.x - preset.widthMm / 2).toBeGreaterThan(0);
      expect(position!.x + preset.widthMm / 2).toBeLessThan(4800);
      expect(position!.y - preset.depthMm / 2).toBeGreaterThan(0);
      expect(position!.y + preset.depthMm / 2).toBeLessThan(3600);
      plan.objects.push(objectFromPreset(preset, `item-${index}`, position!));
    }
  });
  it('places furniture in an L-shaped room and rejects oversized objects', () => {
    const plan = createStarterPlan();
    plan.room.boundary = [
      { x: 0, y: 0 },
      { x: 4000, y: 0 },
      { x: 4000, y: 1500 },
      { x: 1500, y: 1500 },
      { x: 1500, y: 4000 },
      { x: 0, y: 4000 },
    ];
    const preset = starterCatalog[3];
    const position = findPresetPosition(plan, preset)!;
    expect(position).not.toBeNull();
    expect(pointInRoom(position, plan.room.boundary)).toBe(true);
    expect(findPresetPosition(plan, { ...preset, widthMm: 5000 })).toBeNull();
    expect(
      findPresetPosition(plan, { ...preset, widthMm: 2000, depthMm: 2000 }),
    ).toBeNull();
  });
});

describe('object reset dimensions', () => {
  it.each(basicShapeCatalog)(
    'retains $name defaults after editing, copying and saving',
    (preset) => {
      const plan = createStarterPlan();
      plan.objects = [objectFromPreset(preset, 'shape', { x: 1500, y: 1500 })];
      const edited = updateObject(plan, 'shape', {
        name: 'Renamed',
        widthMm: 450,
        depthMm: 650,
      });
      const copied = duplicateObjects(edited, ['shape'], () => 'copy').document;
      const restored = planDocumentSchema.parse(
        JSON.parse(JSON.stringify(copied)),
      );
      for (const object of restored.objects) {
        expect(getObjectDefaultSize(object)).toEqual({
          widthMm: preset.widthMm,
          depthMm: preset.depthMm,
        });
      }
    },
  );

  it('recovers defaults for previously saved resized shapes', () => {
    const object = objectFromPreset(basicShapeCatalog[2], 'old', {
      x: 0,
      y: 0,
    });
    delete object.defaultSizeMm;
    object.widthMm = 2000;
    object.depthMm = 400;
    object.name += ' copy';
    expect(getObjectDefaultSize(object)).toEqual({
      widthMm: 1200,
      depthMm: 800,
    });
  });
});
