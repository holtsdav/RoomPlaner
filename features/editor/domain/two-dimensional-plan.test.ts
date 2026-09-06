import { expect, it } from 'vitest';
import { objectCatalog, objectFromPreset, pictureCatalog } from './catalog';
import { createStarterPlan, planDocumentSchema } from './plan-document';
import { parseRoomFile, serializeRoom } from './room-files';
import { catalogProvenance } from './catalog-provenance';

it('drops legacy vertical dimensions on load, import, and export without changing the footprint', () => {
  const preset = objectCatalog.find((preset) => preset.blueprint === 'tv')!;
  const object = objectFromPreset(preset, 'tv', { x: 1500, y: 1800 });
  const expected = { ...createStarterPlan(), objects: [object] };
  const legacy = {
    ...expected,
    objects: [
      {
        ...object,
        heightMm: 820,
        blueprintProfile: {
          ...object.blueprintProfile!,
          mountingHeightMm: 1100,
          imageHeightMm: 800,
        },
      },
    ],
  };
  expect(planDocumentSchema.parse(legacy)).toEqual(expected);
  expect(parseRoomFile(JSON.stringify(legacy))).toEqual([expected]);
  expect(JSON.parse(serializeRoom(legacy))).toEqual(expected);
});

it('creates only two-dimensional catalog objects', () => {
  for (const preset of objectCatalog) {
    const object = objectFromPreset(preset, preset.id, { x: 0, y: 0 });
    expect(JSON.stringify({ preset, object })).not.toMatch(
      /heightMm|mountingHeightMm|imageHeightMm/i,
    );
  }
});

it('preserves picture identities while displaying only footprint measurements', () => {
  expect(pictureCatalog[0].id).toBe(
    'framed-picture-picture-in-a-frame-wall-mounted-10-15-cm',
  );
  expect(pictureCatalog[2].id).toBe(
    'framed-picture-picture-in-a-frame-wall-mounted-21-29-7-cm',
  );
  for (const preset of pictureCatalog) {
    expect(preset.name).toBe(
      `Picture in a Frame (Wall-mounted) · ${preset.widthMm / 10} cm wide`,
    );
    expect(preset.blueprintProfile?.presetId).toBe(preset.id);
  }
});

it('keeps manufacturer references distinct for models with the same footprint', () => {
  for (const model of ['P1S', 'X1 Carbon', 'H2S', 'H2D']) {
    const preset = objectCatalog.find(
      (preset) => preset.name === `Bambu Lab 3D Printer · ${model}`,
    )!;
    expect(catalogProvenance(preset).model).toBe(`Bambu Lab ${model}`);
  }
});
