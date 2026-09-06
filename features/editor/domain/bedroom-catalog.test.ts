import { describe, expect, it } from 'vitest';
import { Path } from 'konva/lib/shapes/Path';
import { bedroomCatalog, objectFromPreset } from './catalog';
import { officeBlueprint, bedroomKinds } from './office-blueprints';
import { planObjectSchema } from './plan-document';

describe('Bedroom library', () => {
  it('has exactly six named bed sizes and one object for each other type', () => {
    expect(
      bedroomCatalog
        .filter((preset) => preset.blueprint === 'bed')
        .map((preset) => preset.name),
    ).toEqual([
      'Bed · Twin',
      'Bed · Twin XL',
      'Bed · Full / Double',
      'Bed · Queen',
      'Bed · King',
      'Bed · California King',
    ]);
    for (const kind of bedroomKinds.filter((kind) => kind !== 'bed'))
      expect(
        bedroomCatalog.filter((preset) => preset.blueprint === kind),
      ).toHaveLength(1);
    expect(new Set(bedroomCatalog.map((preset) => preset.id)).size).toBe(
      bedroomCatalog.length,
    );
  });

  it('distinguishes mattress measurements from the enclosing frame and saves both', () => {
    const queen = bedroomCatalog.find(
      (preset) => preset.name === 'Bed · Queen',
    )!;
    expect(queen).toMatchObject({
      widthMm: 1624,
      depthMm: 2182,
      blueprintProfile: { mattressWidthMm: 1524, mattressDepthMm: 2032 },
    });
    for (const preset of bedroomCatalog) {
      const object = objectFromPreset(preset, preset.id, { x: 500, y: 300 });
      expect(
        planObjectSchema.parse(JSON.parse(JSON.stringify(object))),
      ).toEqual(object);
      if (preset.blueprint === 'bed') {
        expect(preset.widthMm - preset.blueprintProfile!.mattressWidthMm!).toBe(
          100,
        );
        expect(preset.depthMm - preset.blueprintProfile!.mattressDepthMm!).toBe(
          150,
        );
      }
    }
  });

  it('keeps all shapes and details within bounds at native and extreme resized proportions', () => {
    for (const preset of bedroomCatalog)
      for (const [width, depth] of [
        [preset.widthMm, preset.depthMm],
        [1, 1],
        [1, 10000],
        [10000, 1],
      ]) {
        for (const part of officeBlueprint(
          preset.blueprint!,
          width,
          depth,
          preset.blueprintProfile,
        )) {
          const path = new Path({ data: part.d });
          const b = path.getSelfRect();
          expect(Number.isFinite(b.x + b.y + b.width + b.height)).toBe(true);
          expect(b.x).toBeGreaterThanOrEqual(-width / 2 - 0.01);
          expect(b.y).toBeGreaterThanOrEqual(-depth / 2 - 0.01);
          expect(b.x + b.width).toBeLessThanOrEqual(width / 2 + 0.01);
          expect(b.y + b.height).toBeLessThanOrEqual(depth / 2 + 0.01);
          path.destroy();
        }
      }
  });

  it('uses one pillow for narrow beds and two for wide beds, including resized beds', () => {
    const count = (width: number, depth: number) =>
      officeBlueprint('bed', width, depth).filter(
        (part) => part.part === 'pillow',
      ).length;
    expect(count(1065, 2055)).toBe(1);
    expect(count(1624, 2182)).toBe(2);
    expect(count(2030, 2182)).toBe(2);
    expect(count(1000, 2182)).toBe(1);
    expect(count(50, 100)).toBe(1);
    expect(count(80, 100)).toBe(2);
  });
});
