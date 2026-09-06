import { Path } from 'konva/lib/shapes/Path';
import { officeBlueprint } from './office-blueprints';
import { expect, it } from 'vitest';
import {
  catalogFamilyKey,
  instrumentsCatalog,
  pictureCatalog,
  objectFromPreset,
} from './catalog';
import { createStarterPlan, planObjectSchema } from './plan-document';
import { findWallAttachment, isWallAttached } from './wall-attachment';

it('keeps the five instruments separate and preserves their profiles through saving', () => {
  expect(new Set(instrumentsCatalog.map(catalogFamilyKey)).size).toBe(5);
  for (const preset of [...instrumentsCatalog, ...pictureCatalog]) {
    const object = objectFromPreset(preset, preset.id, { x: 2000, y: 2000 });
    expect(planObjectSchema.parse(JSON.parse(JSON.stringify(object)))).toEqual(
      object,
    );
  }
});

it('mounts pictures and the wall guitar without changing their physical dimensions', () => {
  const room = createStarterPlan().room;
  const wallGuitar = instrumentsCatalog.find(
    (p) => p.blueprint === 'guitar-wall',
  )!;
  for (const preset of [...pictureCatalog, wallGuitar]) {
    const object = objectFromPreset(preset, preset.id, { x: 2000, y: 2000 });
    expect(isWallAttached(object)).toBe(true);
    const mounted = findWallAttachment(object, room);
    expect(mounted).not.toBeNull();
    expect(mounted?.widthMm).toBe(preset.widthMm);
    expect(mounted?.depthMm).toBe(preset.depthMm);
    expect(mounted?.positionMm).not.toEqual(object.positionMm);
  }
  const stand = instrumentsCatalog.find((p) => p.blueprint === 'guitar-stand')!;
  expect(isWallAttached(stand)).toBe(false);
});

it('uses frame width and thickness for the footprint', () => {
  expect(pictureCatalog).toHaveLength(8);
  for (const picture of pictureCatalog) {
    expect(picture.depthMm).toBe(30);
    expect(picture.widthMm).toBeGreaterThan(picture.depthMm);
  }
});

it('draws the same 412 × 118 mm guitar body inside both mounting envelopes', () => {
  for (const preset of instrumentsCatalog.filter((p) =>
    p.blueprint?.startsWith('guitar-'),
  )) {
    const body = officeBlueprint(
      preset.blueprint!,
      preset.widthMm,
      preset.depthMm,
      preset.blueprintProfile,
    ).find((p) => p.part === 'guitar-body')!;
    const path = new Path({ data: body.d });
    const bounds = path.getSelfRect();
    path.destroy();
    expect(bounds.width).toBeCloseTo(412);
    expect(bounds.height).toBeCloseTo(118);
  }
});
