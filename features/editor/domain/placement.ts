import type { CatalogPreset } from './catalog';
import {
  getRoomBounds,
  type PlanDocument,
  type PointMm,
} from './plan-document';

export function pointInRoom(point: PointMm, boundary: PointMm[]): boolean {
  let inside = false;
  for (let i = 0, j = boundary.length - 1; i < boundary.length; j = i++) {
    const a = boundary[i];
    const b = boundary[j];
    const cross = (point.x - a.x) * (b.y - a.y) - (point.y - a.y) * (b.x - a.x);
    if (
      Math.abs(cross) < 1e-7 &&
      point.x >= Math.min(a.x, b.x) &&
      point.x <= Math.max(a.x, b.x) &&
      point.y >= Math.min(a.y, b.y) &&
      point.y <= Math.max(a.y, b.y)
    )
      return true;
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}

/** A conservative rectangular envelope also safely contains elliptical presets. */
export function findPresetPosition(
  plan: PlanDocument,
  preset: CatalogPreset,
): PointMm | null {
  const bounds = getRoomBounds(plan.room);
  const clearance = plan.room.wallThicknessMm / 2;
  const halfWidth = preset.widthMm / 2 + clearance;
  const halfDepth = preset.depthMm / 2 + clearance;
  const minX = Math.ceil(bounds.minX + halfWidth);
  const maxX = Math.floor(bounds.maxX - halfWidth);
  const minY = Math.ceil(bounds.minY + halfDepth);
  const maxY = Math.floor(bounds.maxY - halfDepth);
  if (minX > maxX || minY > maxY) return null;
  const candidates: PointMm[] = [];
  for (let y = 0; y <= 24; y++) {
    for (let x = 0; x <= 24; x++) {
      candidates.push({
        x: Math.round(minX + ((maxX - minX) * x) / 24),
        y: Math.round(minY + ((maxY - minY) * y) / 24),
      });
    }
  }
  const centre = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  const score = (point: PointMm) => {
    const overlapping = plan.objects.filter(
      (object) =>
        Math.abs(object.positionMm.x - point.x) <
          (Math.hypot(object.widthMm, object.depthMm) + preset.widthMm) / 2 &&
        Math.abs(object.positionMm.y - point.y) <
          (Math.hypot(object.widthMm, object.depthMm) + preset.depthMm) / 2,
    ).length;
    return (
      overlapping * (bounds.width + bounds.height) +
      Math.hypot(point.x - centre.x, point.y - centre.y)
    );
  };
  return (
    candidates
      .map((point) => ({ point, score: score(point) }))
      .sort((a, b) => a.score - b.score)
      .find(({ point }) => {
        const left = point.x - halfWidth,
          right = point.x + halfWidth;
        const top = point.y - halfDepth,
          bottom = point.y + halfDepth;
        if (
          ![
            { x: left, y: top },
            { x: right, y: top },
            { x: right, y: bottom },
            { x: left, y: bottom },
          ].every((corner) => pointInRoom(corner, plan.room.boundary))
        )
          return false;
        // Reject any wall entering the envelope, including concave notches.
        return !plan.room.boundary.some((a, index) => {
          const b = plan.room.boundary[(index + 1) % plan.room.boundary.length];
          let low = 0,
            high = 1;
          for (const [start, delta, min, max] of [
            [a.x, b.x - a.x, left, right],
            [a.y, b.y - a.y, top, bottom],
          ]) {
            if (delta === 0) {
              if (start <= min || start >= max) return false;
            } else {
              low = Math.max(
                low,
                Math.min((min - start) / delta, (max - start) / delta),
              );
              high = Math.min(
                high,
                Math.max((min - start) / delta, (max - start) / delta),
              );
            }
          }
          return low < high;
        });
      })?.point ?? null
  );
}
