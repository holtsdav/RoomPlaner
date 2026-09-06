import type { PlanDocument, PointMm } from './plan-document';
import { insideWallLengths } from './room-measurements';

/** Short walls use millimetres; walls of at least one metre use centimetres. */
export function snapWallMillimetres(value: number): number {
  const step = Math.abs(value) < 1000 ? 1 : 10;
  return Math.round(value / step) * step;
}

export function snapWallCorner(
  room: PlanDocument['room'],
  index: number,
  point: PointMm,
): PointMm {
  const boundary = room.boundary.map((corner, i) =>
    i === index ? point : corner,
  );
  const lengths = insideWallLengths({ ...room, boundary });
  // A shared corner needs the finer precision if either adjoining face is short.
  const short = [
    lengths[index],
    lengths[(index + lengths.length - 1) % lengths.length],
  ].some((length) => length > 0 && length < 1000);
  const step = short ? 1 : 10;
  return {
    x: Math.round(point.x / step) * step,
    y: Math.round(point.y / step) * step,
  };
}
