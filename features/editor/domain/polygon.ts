import type { PointMm } from './plan-document';

const MIN_EDGE_LENGTH_MM = 100;
const MIN_AREA_SQUARE_MM = 10_000;

function orientation(a: PointMm, b: PointMm, c: PointMm) {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  if (value === 0) return 0;
  return value > 0 ? 1 : 2;
}

function onSegment(a: PointMm, b: PointMm, c: PointMm) {
  return (
    b.x <= Math.max(a.x, c.x) &&
    b.x >= Math.min(a.x, c.x) &&
    b.y <= Math.max(a.y, c.y) &&
    b.y >= Math.min(a.y, c.y)
  );
}

function segmentsIntersect(a1: PointMm, a2: PointMm, b1: PointMm, b2: PointMm) {
  const o1 = orientation(a1, a2, b1);
  const o2 = orientation(a1, a2, b2);
  const o3 = orientation(b1, b2, a1);
  const o4 = orientation(b1, b2, a2);

  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(a1, b1, a2)) return true;
  if (o2 === 0 && onSegment(a1, b2, a2)) return true;
  if (o3 === 0 && onSegment(b1, a1, b2)) return true;
  return o4 === 0 && onSegment(b1, a2, b2);
}

export function polygonArea(points: PointMm[]) {
  return (
    Math.abs(
      points.reduce((sum, point, index) => {
        const next = points[(index + 1) % points.length];
        return sum + point.x * next.y - next.x * point.y;
      }, 0),
    ) / 2
  );
}

export function edgeLength(a: PointMm, b: PointMm) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function isSimplePolygon(points: PointMm[]) {
  if (points.length < 3) return false;

  for (let index = 0; index < points.length; index += 1) {
    const nextIndex = (index + 1) % points.length;
    if (edgeLength(points[index], points[nextIndex]) < MIN_EDGE_LENGTH_MM) {
      return false;
    }

    for (
      let otherIndex = index + 1;
      otherIndex < points.length;
      otherIndex += 1
    ) {
      const otherNextIndex = (otherIndex + 1) % points.length;
      const adjacent =
        index === otherIndex ||
        nextIndex === otherIndex ||
        otherNextIndex === index;
      if (adjacent) continue;

      if (
        segmentsIntersect(
          points[index],
          points[nextIndex],
          points[otherIndex],
          points[otherNextIndex],
        )
      ) {
        return false;
      }
    }
  }

  return polygonArea(points) >= MIN_AREA_SQUARE_MM;
}

export function midpoint(a: PointMm, b: PointMm): PointMm {
  return {
    x: Math.round((a.x + b.x) / 2),
    y: Math.round((a.y + b.y) / 2),
  };
}
