import { expect, it } from 'vitest';
import {
  catalogFamilyKey,
  homeCinemaCatalog,
  objectFromPreset,
} from './catalog';
import { homepodCatalog } from './homepod-catalog';
import { planObjectSchema } from './plan-document';

it('offers both Apple speakers separately at their physical size, rounded to whole millimetres', () => {
  expect(homepodCatalog.map((p) => [p.widthMm, p.depthMm])).toEqual([
    [142, 142],
    [98, 98],
  ]);
  expect(new Set(homepodCatalog.map(catalogFamilyKey)).size).toBe(2);
  for (const preset of homepodCatalog) {
    expect(homeCinemaCatalog).toContain(preset);
    expect(
      planObjectSchema.parse(
        objectFromPreset(preset, preset.id, { x: 0, y: 0 }),
      ).shape,
    ).toBe('ellipse');
  }
});
