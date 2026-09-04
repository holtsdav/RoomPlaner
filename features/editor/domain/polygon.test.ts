import { describe, expect, it } from 'vitest';
import { isSimplePolygon, polygonArea } from './polygon';

describe('room polygons', () => {
  it('accepts a concave room with an inset corner', () => {
    const room = [
      { x: 0, y: 0 },
      { x: 4000, y: 0 },
      { x: 4000, y: 3000 },
      { x: 2200, y: 3000 },
      { x: 2200, y: 1800 },
      { x: 0, y: 1800 },
    ];

    expect(isSimplePolygon(room)).toBe(true);
    expect(polygonArea(room)).toBe(9_360_000);
  });

  it('rejects walls that cross each other', () => {
    expect(
      isSimplePolygon([
        { x: 0, y: 0 },
        { x: 3000, y: 3000 },
        { x: 0, y: 3000 },
        { x: 3000, y: 0 },
      ]),
    ).toBe(false);
  });

  it('rejects corners that create an impractically short wall', () => {
    expect(
      isSimplePolygon([
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 1000, y: 1000 },
        { x: 0, y: 1000 },
      ]),
    ).toBe(false);
  });
});
