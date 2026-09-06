import type { FootprintShape, PointMm } from './plan-document';

/** Polygon vertices centered on the same bounding box as all other footprints. */
export function shapePoints(
  shape: FootprintShape,
  width: number,
  depth: number,
): PointMm[] {
  const coordinates =
    shape === 'triangle'
      ? [
          [0, -0.5],
          [0.5, 0.5],
          [-0.5, 0.5],
        ]
      : [
          [-0.25, -0.5],
          [0.25, -0.5],
          [0.5, 0],
          [0.25, 0.5],
          [-0.25, 0.5],
          [-0.5, 0],
        ];
  return coordinates.map(([x, y]) => ({ x: x * width, y: y * depth }));
}
