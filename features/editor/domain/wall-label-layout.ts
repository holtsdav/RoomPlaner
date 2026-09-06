import {
  formatWallMeasurement,
  type PlanDocument,
  type PointMm,
} from './plan-document';
import { getWallMeasurements } from './polygon';
import { insideWallLengths } from './room-measurements';

type Box = { left: number; right: number; top: number; bottom: number };
function overlaps(a: Box, b: Box) {
  return (
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  );
}
function segmentHitsBox(a: PointMm, b: PointMm, box: Box) {
  let low = 0,
    high = 1;
  for (const [start, delta, min, max] of [
    [a.x, b.x - a.x, box.left, box.right],
    [a.y, b.y - a.y, box.top, box.bottom],
  ]) {
    if (Math.abs(delta) < 1e-9) {
      if (start < min || start > max) return false;
    } else {
      const t1 = (min - start) / delta,
        t2 = (max - start) / delta;
      low = Math.max(low, Math.min(t1, t2));
      high = Math.min(high, Math.max(t1, t2));
      if (low > high) return false;
    }
  }
  return true;
}

/** Screen-space collision layout, returned in room coordinates for canvas and export. */
export function layoutWallLabels(
  room: PlanDocument['room'],
  units: PlanDocument['units'],
  scale: number,
) {
  const lengths = insideWallLengths(room);
  const base = getWallMeasurements(
    room.boundary,
    room.wallThicknessMm / 2 + 22 / scale,
  );
  const boxes: Box[] = [];
  return base.map((wall, index) => {
    const a = room.boundary[index],
      b = room.boundary[(index + 1) % base.length];
    const anchor = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const normalLength = Math.hypot(
      wall.center.x - anchor.x,
      wall.center.y - anchor.y,
    );
    const normal = {
      x: (wall.center.x - anchor.x) / normalLength,
      y: (wall.center.y - anchor.y) / normalLength,
    };
    const width = Math.max(
      64,
      formatWallMeasurement(lengths[index], units).length * 8 + 8,
    );
    const short = wall.lengthMm * scale < width + 16;
    const angleDeg = short ? 0 : wall.angleDeg;
    const radians = (angleDeg * Math.PI) / 180;
    const halfW =
      (Math.abs(Math.cos(radians)) * width + Math.abs(Math.sin(radians)) * 28) /
      2;
    const halfH =
      (Math.abs(Math.sin(radians)) * width + Math.abs(Math.cos(radians)) * 28) /
      2;
    let center = wall.center;
    let box: Box;
    let moved = short;
    for (let lane = 0; ; lane++) {
      center = {
        x: wall.center.x + (normal.x * lane * 32) / scale,
        y: wall.center.y + (normal.y * lane * 32) / scale,
      };
      box = {
        left: center.x * scale - halfW - 4,
        right: center.x * scale + halfW + 4,
        top: center.y * scale - halfH - 4,
        bottom: center.y * scale + halfH + 4,
      };
      const padding = (room.wallThicknessMm * scale) / 2;
      const wallBox = {
        left: box.left - padding,
        right: box.right + padding,
        top: box.top - padding,
        bottom: box.bottom + padding,
      };
      const hitsWall = room.boundary.some((point, i) => {
        const next = room.boundary[(i + 1) % base.length];
        return segmentHitsBox(
          { x: point.x * scale, y: point.y * scale },
          { x: next.x * scale, y: next.y * scale },
          wallBox,
        );
      });
      if (
        (!hitsWall && !boxes.some((other) => overlaps(box, other))) ||
        lane === 100
      ) {
        moved ||= lane > 0;
        break;
      }
    }
    boxes.push(box);
    return {
      lengthMm: lengths[index],
      center,
      angleDeg,
      widthPx: width,
      anchor: moved ? anchor : null,
      box,
    };
  });
}
