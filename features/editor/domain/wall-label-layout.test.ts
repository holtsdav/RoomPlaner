import { expect, it } from 'vitest';
import { createStarterPlan } from './plan-document';
import { layoutWallLabels } from './wall-label-layout';

it('separates short-corner labels at multiple zoom levels and unit systems', () => {
  const room = createStarterPlan().room;
  room.boundary = [
    { x: 0, y: 0 },
    { x: 4000, y: 0 },
    { x: 4000, y: 148 },
    { x: 4180, y: 148 },
    { x: 4180, y: 3000 },
    { x: 0, y: 3000 },
  ];
  for (const scale of [0.04, 0.12, 0.8]) {
    for (const units of ['m', 'ft-in'] as const) {
      const labels = layoutWallLabels(room, units, scale);
      expect(labels).toHaveLength(6);
      expect(labels.some((label) => label.anchor !== null)).toBe(true);
      labels.forEach((label, index) => {
        expect(Number.isFinite(label.center.x + label.center.y)).toBe(true);
        for (const other of labels.slice(index + 1)) {
          const a = label.box,
            b = other.box;
          expect(
            a.left < b.right &&
              a.right > b.left &&
              a.top < b.bottom &&
              a.bottom > b.top,
          ).toBe(false);
        }
      });
    }
  }
});
