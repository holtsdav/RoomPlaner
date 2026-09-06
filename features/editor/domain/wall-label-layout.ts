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

const candidates = Array.from({ length: 161 }, (_, lane) =>
  Array.from({ length: 21 }, (_, index) =>
    index % 2 === 0 ? index / 2 : -(index + 1) / 2,
  ).map((shift) => ({
    outward: lane * 4,
    along: shift * 16,
  })),
)
  .flat()
  .sort(
    (a, b) => Math.hypot(a.outward, a.along) - Math.hypot(b.outward, b.along),
  );

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
  const leaders: { start: PointMm; end: PointMm }[] = [];
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
      44,
      formatWallMeasurement(lengths[index], units).length * 7.25 + 16,
    );
    const short = wall.lengthMm * scale < width + 16;
    // Keep orientation independent of zoom so short returns never flip.
    const angleDeg = wall.angleDeg;
    const radians = (angleDeg * Math.PI) / 180;
    const halfW =
      (Math.abs(Math.cos(radians)) * width + Math.abs(Math.sin(radians)) * 28) /
      2;
    const halfH =
      (Math.abs(Math.sin(radians)) * width + Math.abs(Math.cos(radians)) * 28) /
      2;
    const edgeAnchor = {
      x: anchor.x + (normal.x * room.wallThicknessMm) / 2,
      y: anchor.y + (normal.y * room.wallThicknessMm) / 2,
    };
    const leaderStart = { x: edgeAnchor.x * scale, y: edgeAnchor.y * scale };
    let center = wall.center;
    let box!: Box;
    let moved = short;
    let best: { center: PointMm; box: Box; moved: boolean } | undefined;
    let bestScore = Infinity;
    for (let lane = 0; lane < candidates.length; lane++) {
      const { outward, along } = candidates[lane];
      const distance = Math.hypot(outward, along);
      if (distance > bestScore) break;
      center = {
        x: wall.center.x + (normal.x * outward - normal.y * along) / scale,
        y: wall.center.y + (normal.y * outward + normal.x * along) / scale,
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
      if (hitsWall || boxes.some((other) => overlaps(box, other))) continue;
      // Prefer clear leaders, but never exile a label when a dense corner
      // makes a crossing unavoidable. Opaque labels mask lines behind them.
      const crossings =
        leaders.filter((leader) =>
          segmentHitsBox(leader.start, leader.end, box),
        ).length +
        boxes.filter((other) =>
          segmentHitsBox(
            leaderStart,
            { x: center.x * scale, y: center.y * scale },
            other,
          ),
        ).length;
      const score = distance + crossings * 80;
      if (score < bestScore) {
        bestScore = score;
        best = { center, box, moved: short || lane > 0 };
      }
    }
    if (best) ({ center, box, moved } = best);
    boxes.push(box);
    if (moved)
      leaders.push({
        start: leaderStart,
        end: { x: center.x * scale, y: center.y * scale },
      });
    return {
      lengthMm: lengths[index],
      center,
      angleDeg,
      widthPx: width,
      anchor: moved ? edgeAnchor : null,
      box,
    };
  });
}
