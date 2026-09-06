import { expect, it } from 'vitest';
import { resizeViewport } from './viewport';

it('preserves the visible world centre when shrinking to a phone', () => {
  const before = { x: 100, y: 80, scale: 0.15 };
  const previous = { width: 1000, height: 800 };
  const next = { width: 390, height: 720 };
  const after = resizeViewport(before, previous, next, 0.01);
  expect((next.width / 2 - after.x) / after.scale).toBeCloseTo(
    (previous.width / 2 - before.x) / before.scale,
  );
  expect((next.height / 2 - after.y) / after.scale).toBeCloseTo(
    (previous.height / 2 - before.y) / before.scale,
  );
  expect(after.scale).toBeLessThan(before.scale);
});
