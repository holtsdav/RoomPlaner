import { describe, expect, it } from 'vitest';
import { Path } from 'konva/lib/shapes/Path';
import {
  getBlueprintProfile,
  homeOfficeCatalog,
  objectFromPreset,
} from './catalog';
import { planObjectSchema } from './plan-document';
import { officeBlueprint, officeKinds } from './office-blueprints';

describe('Home Office footprints', () => {
  it('preserves every blueprint and its exact defaults through saved object validation', () => {
    expect(new Set(homeOfficeCatalog.map((preset) => preset.id)).size).toBe(
      homeOfficeCatalog.length,
    );
    for (const preset of homeOfficeCatalog) {
      const object = objectFromPreset(preset, preset.id, { x: 0, y: 0 });
      const restored = planObjectSchema.parse(
        JSON.parse(JSON.stringify(object)),
      );
      expect(restored.blueprint).toBe(preset.blueprint);
      expect(restored.defaultSizeMm).toEqual({
        widthMm: preset.widthMm,
        depthMm: preset.depthMm,
      });
    }
    expect(
      homeOfficeCatalog.find((preset) => preset.blueprint === 'mac-mini'),
    ).toMatchObject({ widthMm: 127, depthMm: 127, heightMm: 50 });
  });

  it('keeps all path geometry finite and inside the footprint at extreme resize ratios', () => {
    for (const kind of officeKinds) {
      for (const [width, depth] of [
        [1, 1],
        [1, 10000],
        [10000, 1],
        [127, 127],
        [1600, 800],
      ]) {
        for (const part of officeBlueprint(kind, width, depth)) {
          const path = new Path({ data: part.d });
          const bounds = path.getSelfRect();
          expect(
            Number.isFinite(bounds.x + bounds.y + bounds.width + bounds.height),
          ).toBe(true);
          expect(bounds.x).toBeGreaterThanOrEqual(-width / 2 - 0.01);
          expect(bounds.y).toBeGreaterThanOrEqual(-depth / 2 - 0.01);
          expect(bounds.x + bounds.width).toBeLessThanOrEqual(width / 2 + 0.01);
          expect(bounds.y + bounds.height).toBeLessThanOrEqual(
            depth / 2 + 0.01,
          );
          path.destroy();
        }
      }
    }
  });
});

it('uses separate 34 and 57 inch monitor profiles without increasing panel thickness', () => {
  const monitors = ['34', '57'].map((size) =>
    homeOfficeCatalog.find(
      (preset) => preset.name === `Ultrawide Monitor · ${size}″`,
    )!,
  );
  expect(monitors.map(({ widthMm, depthMm }) => [widthMm, depthMm])).toEqual([
    [808, 238],
    [1328, 500],
  ]);
  expect(
    monitors.map((preset) => preset.blueprintProfile?.curveRadiusMm),
  ).toEqual([1800, 1000]);
  for (const preset of monitors) {
    const parts = officeBlueprint(
      preset.blueprint!,
      preset.widthMm,
      preset.depthMm,
      preset.blueprintProfile,
    );
    const screen = new Path({
      data: parts.find((part) => part.part === 'screen')!.d,
    });
    // The thin edge is 18 mm, not a fixed percentage of total stand depth.
    const commands = screen.dataArray;
    expect(commands[41].points[1] - commands[40].points[1]).toBeCloseTo(18);
    screen.destroy();
  }
});

it('keeps every variant inside its footprint after resizing and preserves profile in saved plans', () => {
  for (const preset of homeOfficeCatalog) {
    const restored = planObjectSchema.parse(
      objectFromPreset(preset, preset.id, { x: 0, y: 0 }),
    );
    expect(restored.blueprintProfile).toEqual(preset.blueprintProfile);
    for (const [width, depth] of [
      [preset.widthMm, preset.depthMm],
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
        const bounds = path.getSelfRect();
        expect(bounds.x).toBeGreaterThanOrEqual(-width / 2 - 0.01);
        expect(bounds.y).toBeGreaterThanOrEqual(-depth / 2 - 0.01);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width / 2 + 0.01);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(depth / 2 + 0.01);
        path.destroy();
      }
    }
  }
});

it('keeps Apple marks undistorted when only one object axis is resized', () => {
  for (const kind of ['laptop', 'mac-mini'] as const) {
    const boxes = [
      [300, 200],
      [1000, 200],
    ].map(([width, depth]) => {
      const logo = officeBlueprint(kind, width, depth).find(
        (part) => part.part === 'apple-logo',
      )!;
      expect(logo.solid).toBe(true);
      const path = new Path({ data: logo.d });
      const bounds = path.getSelfRect();
      path.destroy();
      return bounds;
    });
    expect(boxes[0].width).toBeCloseTo(boxes[1].width);
    expect(boxes[0].height).toBeCloseTo(boxes[1].height);
  }
});

it('recovers old preset geometry without changing saved dimensions', () => {
  const preset = homeOfficeCatalog.find(
    (item) => item.name === 'Ultrawide Monitor · 57″',
  )!;
  const old = {
    ...objectFromPreset(preset, 'saved-monitor', { x: 100, y: 200 }),
    blueprintProfile: undefined,
    widthMm: 1330,
    depthMm: 500,
  };
  expect(getBlueprintProfile(old)).toEqual(preset.blueprintProfile);
  expect(getBlueprintProfile({ ...old, name: old.name + ' copy' })).toEqual(
    preset.blueprintProfile,
  );
  expect(old.widthMm).toBe(1330);
});
