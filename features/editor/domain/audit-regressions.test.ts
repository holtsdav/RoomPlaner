import { createPopulatedPlan } from '../../../tests/fixtures/populated-plan';
import { describe, expect, it } from 'vitest';
import { Path } from 'konva/lib/shapes/Path';
import {
  objectCatalog,
  objectFromPreset,
  catalogFamilyKey,
  libraryCategories,
  getBlueprintProfile,
  nameForObjectVariant,
} from './catalog';
import { officeBlueprint } from './office-blueprints';
import {
  formatMeasurement,
  formatWallMeasurement,
  planDocumentSchema,
} from './plan-document';
import { attachWindow, findWallAttachment } from './wall-attachment';
import { mirrorObjects, scaleObjects } from './commands';
import { exportGridSpacing } from '../ui/room-image-export';

describe('audit regressions', () => {
  it('retains precise object measurements while rounding walls to centimetres', () => {
    expect([1, 3, 10, 313].map((mm) => formatMeasurement(mm, 'ft-in'))).toEqual(
      ['0.04″', '0.12″', '0.39″', '1′0.32″'],
    );
    expect(formatWallMeasurement(1005, 'm')).toBe('1.01 m');
  });
  it('keeps all catalog envelopes inside declared bounds at normal and extreme aspect ratios', () => {
    for (const preset of libraryCategories.flatMap(
      (category) => category.presets ?? [],
    )) {
      if (!preset.blueprint) continue;
      for (const [w, d] of [
        [preset.widthMm, preset.depthMm],
        [1, 1],
        [10, 5000],
        [5000, 10],
      ]) {
        for (const path of officeBlueprint(
          preset.blueprint,
          w,
          d,
          preset.blueprintProfile,
        )) {
          const rect = new Path({ data: path.d }).getSelfRect();
          expect(rect.x, `${preset.name} left`).toBeGreaterThanOrEqual(
            -w / 2 - 0.01,
          );
          expect(rect.y, `${preset.name} top`).toBeGreaterThanOrEqual(
            -d / 2 - 0.01,
          );
          expect(
            rect.x + rect.width,
            `${preset.name} right`,
          ).toBeLessThanOrEqual(w / 2 + 0.01);
          expect(
            rect.y + rect.height,
            `${preset.name} bottom`,
          ).toBeLessThanOrEqual(d / 2 + 0.01);
        }
      }
    }
  });
  it('fills the physical Era 300, foliage and TV envelope without changing catalog sizes', () => {
    for (const preset of objectCatalog.filter(
      (p) =>
        p.blueprint === 'plant' ||
        p.blueprint === 'tv' ||
        p.blueprintProfile?.form === 'era300',
    )) {
      const bounds = officeBlueprint(
        preset.blueprint!,
        preset.widthMm,
        preset.depthMm,
        preset.blueprintProfile,
      )
        .filter((p) => !p.detail)
        .map((p) => new Path({ data: p.d }).getSelfRect());
      const width =
        Math.max(...bounds.map((b) => b.x + b.width)) -
        Math.min(...bounds.map((b) => b.x));
      const depth =
        Math.max(...bounds.map((b) => b.y + b.height)) -
        Math.min(...bounds.map((b) => b.y));
      expect(width, preset.name).toBeCloseTo(preset.widthMm, 1);
      expect(depth, preset.name).toBeCloseTo(preset.depthMm, 1);
    }
  });
  it('has two TV families while recovering old TV profiles and retaining IDs', () => {
    const tvs = objectCatalog.filter((p) => p.blueprint === 'tv');
    expect(new Set(tvs.map(catalogFamilyKey)).size).toBe(2);
    expect(tvs.filter((p) => catalogFamilyKey(p) === 'tv-wall')).toHaveLength(
      9,
    );
    expect(
      getBlueprintProfile({ name: 'TV · 100″ Wall-mounted' }),
    ).toMatchObject({ mounting: 'wall', imageDiagonalIn: 100 });
  });
  it('updates automatic legacy TV names when changing size and preserves custom labels', () => {
    const preset = objectCatalog.find(
      (p) => p.blueprint === 'tv' && p.blueprintProfile?.mounting === 'wall',
    )!;
    const object = {
      ...objectFromPreset(preset, 'old-tv', { x: 0, y: 0 }),
      name: 'TV · 100″ Wall-mounted copy',
      blueprintProfile: undefined,
    };
    expect(nameForObjectVariant(object, preset)).toBe(`${preset.name} copy`);
    expect(
      nameForObjectVariant({ ...object, name: 'Cinema screen' }, preset),
    ).toBe('Cinema screen');
  });
  it('preserves a TV too large for a wall and respects adjacent interior faces', () => {
    const plan = createPopulatedPlan();
    const tv = objectFromPreset(
      objectCatalog.find(
        (p) =>
          p.blueprint === 'tv' &&
          p.blueprintProfile?.mounting === 'wall' &&
          p.blueprintProfile?.imageDiagonalIn === 100,
      )!,
      'tv',
      { x: 0, y: 0 },
    );
    const room = {
      ...plan.room,
      boundary: [
        { x: 0, y: 0 },
        { x: 1000, y: 0 },
        { x: 1000, y: 1000 },
        { x: 0, y: 1000 },
      ],
    };
    expect(findWallAttachment(tv, room)).toBeNull();
    expect(attachWindow(tv, room).widthMm).toBe(tv.widthMm);
    const panel = objectFromPreset(
      objectCatalog.find((p) => p.blueprint === 'acoustic-panel')!,
      'panel',
      { x: 0, y: 0 },
    );
    const mounted = findWallAttachment(panel, plan.room)!;
    expect(mounted.positionMm.x - mounted.widthMm / 2).toBeGreaterThanOrEqual(
      plan.room.wallThicknessMm / 2,
    );
  });
  it('mounts near a concave inside corner in either boundary direction', () => {
    const plan = createPopulatedPlan();
    const panel = objectFromPreset(
      objectCatalog.find((p) => p.blueprint === 'acoustic-panel')!,
      'panel',
      { x: 2050, y: 2050 },
    );
    const boundary = [
      { x: 0, y: 0 },
      { x: 4000, y: 0 },
      { x: 4000, y: 2000 },
      { x: 2000, y: 2000 },
      { x: 2000, y: 4000 },
      { x: 0, y: 4000 },
    ];
    for (const points of [boundary, [...boundary].reverse()]) {
      const attached = findWallAttachment(panel, {
        ...plan.room,
        boundary: points,
      });
      expect(attached).not.toBeNull();
      expect(
        Math.hypot(
          attached!.positionMm.x - 2050,
          attached!.positionMm.y - 2050,
        ),
      ).toBeLessThan(400);
      expect(attached!.widthMm).toBe(600);
      expect(attached!.depthMm).toBe(100);
    }
  });
  it('preserves physical sizes on diagonal walls with acute and obtuse corners', () => {
    const plan = createPopulatedPlan();
    const panel = objectFromPreset(
      objectCatalog.find((p) => p.blueprint === 'acoustic-panel')!,
      'panel',
      { x: 1000, y: 400 },
    );
    for (const boundary of [
      [
        { x: 0, y: 0 },
        { x: 5000, y: 2000 },
        { x: 4000, y: 5000 },
        { x: -1000, y: 3000 },
      ],
      [
        { x: 0, y: 0 },
        { x: 5000, y: 0 },
        { x: 3000, y: 4000 },
      ],
    ]) {
      const attached = findWallAttachment(panel, { ...plan.room, boundary });
      expect(attached).not.toBeNull();
      expect(attached!.widthMm).toBe(panel.widthMm);
      expect(attached!.depthMm).toBe(panel.depthMm);
    }
  });
  it('restores tiny scaled objects exactly and mirrors an asymmetric local point correctly', () => {
    const plan = createPopulatedPlan();
    plan.objects[0].widthMm = 127;
    plan.objects[0].rotationDeg = 31;
    const ids = plan.objects.map((o) => o.id);
    const tiny = scaleObjects(plan, ids, 0.01);
    const restored = scaleObjects(tiny, ids, 1, plan.objects);
    expect(restored.objects).toEqual(plan.objects);
    const mirrored = mirrorObjects(plan, ids, 'horizontal');
    expect(mirrored.objects[0].rotationDeg).toBe(-31);
    const twice = mirrorObjects(mirrored, ids, 'horizontal');
    expect(twice.objects).toEqual(plan.objects);
  });
  it('validates colors and persists them through the document schema', () => {
    const plan = createPopulatedPlan();
    plan.objects[0].color = '#93c5fd';
    expect(planDocumentSchema.parse(plan).objects[0].color).toBe('#93c5fd');
    plan.objects[0].color = 'url(https://example.com)';
    expect(planDocumentSchema.safeParse(plan).success).toBe(false);
  });
  it('exports only whole grid multiples for unusual plan sizes', () => {
    expect(exportGridSpacing(73, 27555, 41321) % 73).toBe(0);
  });
});
