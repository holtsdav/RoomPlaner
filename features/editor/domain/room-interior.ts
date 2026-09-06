import type { PointMm } from './plan-document';
import {
  edgeLength,
  intersectLines,
  signedPolygonArea,
  isSimplePolygon,
} from './polygon';
/** Miter intersections of wall faces. Positive distance offsets into the room. */
export function offsetBoundary(points: PointMm[], distance: number): PointMm[] {
  const sign = signedPolygonArea(points) >= 0 ? 1 : -1;
  const edges = points.map((start, index) => {
    const end = points[(index + 1) % points.length];
    const length = edgeLength(start, end);
    const direction = {
      x: (end.x - start.x) / length,
      y: (end.y - start.y) / length,
    };
    return {
      direction,
      start: {
        x: start.x - direction.y * distance * sign,
        y: start.y + direction.x * distance * sign,
      },
    };
  });
  return edges.map((edge, index) => {
    const previous = edges[(index + edges.length - 1) % edges.length];
    return (
      intersectLines(
        previous.start,
        previous.direction,
        edge.start,
        edge.direction,
      ) ?? edge.start
    );
  });
}

export function hasUsableInterior(room: {
  boundary: PointMm[];
  wallThicknessMm: number;
}): boolean {
  if (!isSimplePolygon(room.boundary)) return false;
  const inner = offsetBoundary(room.boundary, room.wallThicknessMm / 2);
  if (!inner.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)))
    return false;
  // Inside faces may be shorter than the centreline's 100 mm minimum.
  if (!isSimplePolygon(inner, 0.01, 0.01)) return false;
  if (signedPolygonArea(inner) * signedPolygonArea(room.boundary) <= 0)
    return false;
  return inner.every((point, index) => {
    const next = inner[(index + 1) % inner.length];
    const a = room.boundary[index],
      b = room.boundary[(index + 1) % inner.length];
    return (
      (next.x - point.x) * (b.x - a.x) + (next.y - point.y) * (b.y - a.y) > 0
    );
  });
}
