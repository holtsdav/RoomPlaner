import { describe, expect, it } from 'vitest';
import { getWallMeasurements, isSimplePolygon, polygonArea } from './polygon';

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

  it('places one readable measurement outside the centre of every wall', () => {
    const room = [
      { x: 0, y: 0 },
      { x: 4800, y: 0 },
      { x: 4800, y: 3600 },
      { x: 0, y: 3600 },
    ];

    expect(getWallMeasurements(room, 200)).toEqual([
      { lengthMm: 4800, center: { x: 2400, y: -200 }, angleDeg: 0 },
      { lengthMm: 3600, center: { x: 5000, y: 1800 }, angleDeg: -90 },
      { lengthMm: 4800, center: { x: 2400, y: 3800 }, angleDeg: 0 },
      { lengthMm: 3600, center: { x: -200, y: 1800 }, angleDeg: -90 },
    ]);
  });

  it('measures every segment after a corner creates an angled wall', () => {
    const measurements = getWallMeasurements(
      [
        { x: 0, y: 0 },
        { x: 3000, y: 0 },
        { x: 4000, y: 2000 },
        { x: 4000, y: 3000 },
        { x: 0, y: 3000 },
      ],
      0,
    );

    expect(measurements).toHaveLength(5);
    expect(measurements.map((wall) => wall.center)).toEqual([
      { x: 1500, y: 0 },
      { x: 3500, y: 1000 },
      { x: 4000, y: 2500 },
      { x: 2000, y: 3000 },
      { x: 0, y: 1500 },
    ]);
    expect(measurements[0].lengthMm).toBe(3000);
    expect(measurements[1].lengthMm).toBeCloseTo(2236.07, 2);
    expect(measurements[2].lengthMm).toBe(1000);
    expect(measurements[3].lengthMm).toBe(4000);
    expect(measurements[4].lengthMm).toBe(3000);
    expect(measurements[1].angleDeg).toBeCloseTo(63.43, 2);
  });
});
