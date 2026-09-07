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

it('keeps notched-room labels near exterior rails and consistently oriented throughout zoom', () => {
  const room = createStarterPlan().room;
  room.boundary = [
    { x: 0, y: 0 },
    { x: 5540, y: 0 },
    { x: 5540, y: 200 },
    { x: 5760, y: 200 },
    { x: 5760, y: 1890 },
    { x: 5575, y: 1890 },
    { x: 5575, y: 3150 },
    { x: 5290, y: 3150 },
    { x: 5290, y: 3350 },
    { x: 0, y: 3350 },
  ];
  for (const units of ['m', 'ft-in'] as const) {
    const reference = layoutWallLabels(room, units, 0.12);
    for (const scale of [0.02, 0.04, 0.08, 0.12, 0.2, 0.4, 0.8, 1.5]) {
      const labels = layoutWallLabels(room, units, scale);
      labels.forEach((label, index) => {
        expect(label.angleDeg).toBe(reference[index].angleDeg);
        expect(label.widthPx).toBe(reference[index].widthPx);
        if (label.anchor) {
          expect(
            Math.hypot(
              label.center.x - label.anchor.x,
              label.center.y - label.anchor.y,
            ) * scale,
          ).toBeLessThan(
            // Exterior rails clear the room envelope, including recessed walls.
            Math.min(
              Math.abs(
                Math.min(...room.boundary.map((p) => p.x)) -
                  room.wallThicknessMm / 2 -
                  label.anchor.x,
              ),
              Math.abs(
                Math.max(...room.boundary.map((p) => p.x)) +
                  room.wallThicknessMm / 2 -
                  label.anchor.x,
              ),
              Math.abs(
                Math.min(...room.boundary.map((p) => p.y)) -
                  room.wallThicknessMm / 2 -
                  label.anchor.y,
              ),
              Math.abs(
                Math.max(...room.boundary.map((p) => p.y)) +
                  room.wallThicknessMm / 2 -
                  label.anchor.y,
              ),
            ) *
              scale +
              200,
          );
        }
        for (const other of labels.slice(index + 1)) {
          expect(
            label.box.left < other.box.right &&
              label.box.right > other.box.left &&
              label.box.top < other.box.bottom &&
              label.box.bottom > other.box.top,
          ).toBe(false);
        }
      });
    }
  }
});

// This correctness sweep evaluates 6,000 layouts; it is not a wall-clock benchmark.
it(
  'moves continuously through collision thresholds without changing wall anchors',
  { timeout: 30_000 },
  () => {
    const room = createStarterPlan().room;
    room.boundary = [
      { x: 0, y: 0 },
      { x: 5540, y: 0 },
      { x: 5540, y: 200 },
      { x: 5760, y: 200 },
      { x: 5760, y: 1890 },
      { x: 5575, y: 1890 },
      { x: 5575, y: 3150 },
      { x: 5290, y: 3150 },
      { x: 5290, y: 3350 },
      { x: 0, y: 3350 },
    ];
    for (const units of ['m', 'ft-in'] as const) {
      for (let step = 0; step < 1500; step++) {
        const scale = 0.02 + step * 0.001;
        const nextScale = scale + 0.000001;
        const before = layoutWallLabels(room, units, scale);
        const after = layoutWallLabels(room, units, nextScale);
        before.forEach((label, index) => {
          const next = after[index];
          expect(
            Math.hypot(
              next.center.x * nextScale - label.center.x * scale,
              next.center.y * nextScale - label.center.y * scale,
            ),
          ).toBeLessThan(0.1);
          expect(next.anchor).toEqual(label.anchor);
          for (const other of before.slice(index + 1)) {
            expect(
              label.box.left < other.box.right &&
                label.box.right > other.box.left &&
                label.box.top < other.box.bottom &&
                label.box.bottom > other.box.top,
            ).toBe(false);
          }
        });
      }
    }
  },
);
