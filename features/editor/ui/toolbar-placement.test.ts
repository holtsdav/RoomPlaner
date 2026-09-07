import { describe, expect, it } from 'vitest';
import { placeSelectionToolbar } from './toolbar-placement';

const canvas = { width: 1200, height: 900 };
const toolbar = { width: 448, height: 180 };

describe('selection toolbar placement', () => {
  it('keeps controls above a selection when there is room', () => {
    expect(
      placeSelectionToolbar(
        { minX: 400, maxX: 600, minY: 400, maxY: 600 },
        canvas,
        toolbar,
      ),
    ).toEqual({ left: 276, top: 196 });
  });

  it('moves below a selection near the top instead of clamping over it', () => {
    expect(
      placeSelectionToolbar(
        { minX: 400, maxX: 600, minY: 80, maxY: 280 },
        canvas,
        toolbar,
      ),
    ).toEqual({ left: 276, top: 304 });
  });

  it('uses the side when neither above nor below fits', () => {
    expect(
      placeSelectionToolbar(
        { minX: 50, maxX: 250, minY: 80, maxY: 700 },
        canvas,
        toolbar,
      ),
    ).toEqual({ left: 274, top: 300 });
  });

  it('falls back to compact editing when the selection fills the canvas', () => {
    expect(
      placeSelectionToolbar(
        { minX: 0, maxX: 1200, minY: 0, maxY: 900 },
        canvas,
        toolbar,
      ),
    ).toBeNull();
  });

  it('never overlaps the selection or escapes the usable canvas across viewport sizes', () => {
    for (const width of [320, 768, 1200]) {
      for (const height of [240, 600, 900]) {
        for (const x of [-500, 0, 200, 700, 1500]) {
          for (const y of [-500, 0, 200, 700, 1500]) {
            const selection = {
              minX: x,
              maxX: x + 200,
              minY: y,
              maxY: y + 200,
            };
            const panel = { width: Math.min(448, width - 16), height: 180 };
            const result = placeSelectionToolbar(
              selection,
              { width, height },
              panel,
            );
            if (!result) continue;
            expect(result.left).toBeGreaterThanOrEqual(8);
            expect(result.left + panel.width).toBeLessThanOrEqual(width - 8);
            expect(result.top).toBeGreaterThanOrEqual(Math.min(72, height / 4));
            expect(result.top + panel.height).toBeLessThanOrEqual(
              height - Math.min(128, height / 3),
            );
            expect(
              result.left + panel.width <= x - 24 ||
                result.left >= x + 224 ||
                result.top + panel.height <= y - 24 ||
                result.top >= y + 224,
            ).toBe(true);
          }
        }
      }
    }
  });
});
