import { pointInRoom } from './placement';
import type { PlanDocument, PlanObject, PointMm } from './plan-document';

type Room = PlanDocument['room'];

export function isWallAttached(
  object: Pick<PlanObject, 'blueprint' | 'blueprintProfile'>,
): boolean {
  return (
    object.blueprint === 'window' ||
    ['wall', 'wall-perpendicular', 'corner'].includes(
      object.blueprintProfile?.mounting ?? '',
    )
  );
}

/** Check the full rotated envelope against wall strokes, including concave notches. */
function envelopeFits(object: PlanObject, room: Room): boolean {
  const angle = (object.rotationDeg * Math.PI) / 180;
  const corners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([x, y]) => ({
    x:
      object.positionMm.x +
      ((x * object.widthMm) / 2) * Math.cos(angle) -
      ((y * object.depthMm) / 2) * Math.sin(angle),
    y:
      object.positionMm.y +
      ((x * object.widthMm) / 2) * Math.sin(angle) +
      ((y * object.depthMm) / 2) * Math.cos(angle),
  }));
  if (!corners.every((point) => pointInRoom(point, room.boundary)))
    return false;
  const distance = (p: PointMm, a: PointMm, b: PointMm) => {
    const dx = b.x - a.x,
      dy = b.y - a.y;
    const t = Math.max(
      0,
      Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)),
    );
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
  };
  const cross = (a: PointMm, b: PointMm, c: PointMm) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  return room.boundary.every((a, i) => {
    const b = room.boundary[(i + 1) % room.boundary.length];
    return corners.every((c, j) => {
      const d = corners[(j + 1) % 4];
      if (
        cross(a, b, c) * cross(a, b, d) < 0 &&
        cross(c, d, a) * cross(c, d, b) < 0
      )
        return false;
      return (
        Math.min(
          distance(c, a, b),
          distance(d, a, b),
          distance(a, c, d),
          distance(b, c, d),
        ) >=
        room.wallThicknessMm / 2 - 0.75
      );
    });
  });
}

/** Return null when the unchanged physical envelope cannot fit a mounting wall. */
export function findWallAttachment(
  object: PlanObject,
  room: Room,
): PlanObject | null {
  if (!isWallAttached(object)) return object;
  const area = room.boundary.reduce((sum, a, i) => {
    const b = room.boundary[(i + 1) % room.boundary.length];
    return sum + a.x * b.y - b.x * a.y;
  }, 0);
  const sign = area >= 0 ? 1 : -1;
  const window = object.blueprint === 'window';
  const perpendicular =
    object.blueprintProfile?.mounting === 'wall-perpendicular';
  const corner = object.blueprintProfile?.mounting === 'corner';
  const across = perpendicular ? object.depthMm : object.widthMm;
  const outward = perpendicular ? object.widthMm : object.depthMm;
  const offset = window ? 0 : (room.wallThicknessMm + outward) / 2;
  const walls = room.boundary.map((a, i) => {
    const b = room.boundary[(i + 1) % room.boundary.length];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const tx = (b.x - a.x) / length,
      ty = (b.y - a.y) / length;
    return { a, length, tx, ty, nx: -ty * sign, ny: tx * sign };
  });
  const candidates: PlanObject[] = [];
  walls.forEach((wall, index) => {
    let low = across / 2,
      high = wall.length - across / 2;
    // Intersect with adjacent interior faces. At concave corners the final
    // envelope test, rather than an infinite half-plane, determines clearance.
    if (!window)
      for (const adjacent of [
        walls[(index + walls.length - 1) % walls.length],
        walls[(index + 1) % walls.length],
      ]) {
        const previous = walls[(index + walls.length - 1) % walls.length];
        const turn =
          adjacent === previous
            ? adjacent.tx * wall.ty - adjacent.ty * wall.tx
            : wall.tx * adjacent.ty - wall.ty * adjacent.tx;
        if (turn * sign <= 1e-8) continue;
        const coefficient = wall.tx * adjacent.nx + wall.ty * adjacent.ny;
        const normalDot = wall.nx * adjacent.nx + wall.ny * adjacent.ny;
        const required =
          room.wallThicknessMm / 2 +
          (Math.abs(coefficient) * across) / 2 +
          (Math.abs(normalDot) * outward) / 2;
        const constant =
          (wall.a.x + wall.nx * offset - adjacent.a.x) * adjacent.nx +
          (wall.a.y + wall.ny * offset - adjacent.a.y) * adjacent.ny;
        if (coefficient > 1e-8)
          low = Math.max(low, (required - constant) / coefficient);
        if (coefficient < -1e-8)
          high = Math.min(high, (required - constant) / coefficient);
      }
    if (low > high + 1e-6) return;
    const projection =
      (object.positionMm.x - wall.a.x) * wall.tx +
      (object.positionMm.y - wall.a.y) * wall.ty;
    const positions = corner
      ? [low]
      : [
          Math.max(low, Math.min(high, projection)),
          low,
          high,
          ...Array.from(
            { length: 31 },
            (_, i) => low + ((high - low) * (i + 1)) / 32,
          ),
        ];
    for (const along of positions) {
      const candidate = {
        ...object,
        depthMm: window ? room.wallThicknessMm : object.depthMm,
        positionMm: {
          x: Math.round(wall.a.x + wall.tx * along + wall.nx * offset),
          y: Math.round(wall.a.y + wall.ty * along + wall.ny * offset),
        },
        rotationDeg:
          (Math.atan2(wall.ty, wall.tx) * 180) / Math.PI +
          (perpendicular ? 90 * sign : 0),
        mirroredVertically: window ? object.mirroredVertically : sign < 0,
      };
      if (window || envelopeFits(candidate, room)) {
        candidates.push(candidate);
        break;
      }
    }
  });
  return (
    candidates.sort(
      (a, b) =>
        Math.hypot(
          a.positionMm.x - object.positionMm.x,
          a.positionMm.y - object.positionMm.y,
        ) -
        Math.hypot(
          b.positionMm.x - object.positionMm.x,
          b.positionMm.y - object.positionMm.y,
        ),
    )[0] ?? null
  );
}

/** Never resize a real object to make it fit. Existing unplaceable objects stay visible. */
export function attachWindow(object: PlanObject, room: Room): PlanObject {
  return findWallAttachment(object, room) ?? object;
}

function followWall(point: PointMm, before: Room, after: Room): PointMm {
  if (before.boundary.length !== after.boundary.length) return point;
  const edges = before.boundary
    .map((a, index) => {
      const b = before.boundary[(index + 1) % before.boundary.length];
      const dx = b.x - a.x,
        dy = b.y - a.y;
      const t = Math.max(
        0,
        Math.min(
          1,
          ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy),
        ),
      );
      return {
        index,
        t,
        distance: Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy),
      };
    })
    .sort((a, b) => a.distance - b.distance);
  const { index, t } = edges[0];
  const a = after.boundary[index],
    b = after.boundary[(index + 1) % after.boundary.length];
  return {
    x: Math.round(a.x + t * (b.x - a.x)),
    y: Math.round(a.y + t * (b.y - a.y)),
  };
}

export function constrainWindows(
  plan: PlanDocument,
  previous?: PlanDocument,
): PlanDocument {
  if (!plan.objects.some(isWallAttached)) return plan;
  const roomChanged =
    previous &&
    JSON.stringify(previous.room.boundary) !==
      JSON.stringify(plan.room.boundary);
  const previousObjects = new Map(
    previous?.objects.map((object) => [object.id, object]),
  );
  return {
    ...plan,
    objects: plan.objects.map((object) => {
      if (!isWallAttached(object)) return object;
      const old = previousObjects.get(object.id);
      if (
        old === object &&
        !roomChanged &&
        previous?.room.wallThicknessMm === plan.room.wallThicknessMm
      )
        return object;
      const positionMm =
        roomChanged && old
          ? followWall(old.positionMm, previous.room, plan.room)
          : object.positionMm;
      return attachWindow({ ...object, positionMm }, plan.room);
    }),
  };
}
