import {
  getRoomBounds,
  type PlanDocument,
  type PlanObject,
  type PointMm,
} from './plan-document';
import { getObjectSelectionBounds, type SelectionBounds } from './selection';

export type AlignmentGuide =
  | {
      axis: 'x';
      position: number;
      start: number;
      end: number;
    }
  | {
      axis: 'y';
      position: number;
      start: number;
      end: number;
    }
  | {
      axis: 'free';
      points: [number, number, number, number];
    };

export type ObjectAlignmentSnap = {
  position: PointMm;
  guides: AlignmentGuide[];
  snappedAxes: ('x' | 'y')[];
};

type Anchor = {
  value: number;
  kind: 'start' | 'center' | 'end';
};

type Candidate = {
  distance: number;
  delta: number;
  guide: AlignmentGuide;
  matchingKinds: boolean;
};

type CornerCandidate = Candidate & {
  targetStart: number;
  targetEnd: number;
};

type WallCandidate = {
  distance: number;
  delta: PointMm;
  guide: AlignmentGuide;
  axis: 'x' | 'y' | 'free';
};

function axisAnchors(bounds: SelectionBounds, axis: 'x' | 'y'): Anchor[] {
  const start = axis === 'x' ? bounds.minX : bounds.minY;
  const end = axis === 'x' ? bounds.maxX : bounds.maxY;
  return [
    { value: start, kind: 'start' },
    { value: (start + end) / 2, kind: 'center' },
    { value: end, kind: 'end' },
  ];
}

function closerCandidate<T extends Candidate>(current: T | null, next: T): T {
  if (!current || next.distance < current.distance) return next;
  if (
    next.distance === current.distance &&
    next.matchingKinds &&
    !current.matchingKinds
  ) {
    return next;
  }
  return current;
}

function findAxisSnap(
  movingBounds: SelectionBounds,
  targetBounds: SelectionBounds[],
  axis: 'x' | 'y',
  thresholdMm: number,
): Candidate | null {
  const movingAnchors = axisAnchors(movingBounds, axis);
  let closest: Candidate | null = null;

  for (const bounds of targetBounds) {
    for (const target of axisAnchors(bounds, axis)) {
      for (const moving of movingAnchors) {
        const delta = target.value - moving.value;
        const distance = Math.abs(delta);
        if (distance > thresholdMm) continue;
        closest = closerCandidate(closest, {
          distance,
          delta,
          guide:
            axis === 'x'
              ? {
                  axis,
                  position: target.value,
                  start: Math.min(movingBounds.minY, bounds.minY),
                  end: Math.max(movingBounds.maxY, bounds.maxY),
                }
              : {
                  axis,
                  position: target.value,
                  start: Math.min(movingBounds.minX, bounds.minX),
                  end: Math.max(movingBounds.maxX, bounds.maxX),
                },
          matchingKinds: target.kind === moving.kind,
        });
      }
    }
  }

  return closest;
}

function findCornerAxisSnap(
  proposedPosition: PointMm,
  boundary: PointMm[],
  cornerIndex: number,
  objectBounds: SelectionBounds[],
  axis: 'x' | 'y',
  thresholdMm: number,
): CornerCandidate | null {
  const movingValue = axis === 'x' ? proposedPosition.x : proposedPosition.y;
  let closest: CornerCandidate | null = null;

  for (let index = 0; index < boundary.length; index += 1) {
    if (index === cornerIndex) continue;
    const target = boundary[index];
    const targetValue = axis === 'x' ? target.x : target.y;
    const delta = targetValue - movingValue;
    const distance = Math.abs(delta);
    if (distance > thresholdMm) continue;

    closest = closerCandidate(closest, {
      distance,
      delta,
      guide:
        axis === 'x'
          ? {
              axis,
              position: targetValue,
              start: Math.min(proposedPosition.y, target.y),
              end: Math.max(proposedPosition.y, target.y),
            }
          : {
              axis,
              position: targetValue,
              start: Math.min(proposedPosition.x, target.x),
              end: Math.max(proposedPosition.x, target.x),
            },
      targetStart: axis === 'x' ? target.y : target.x,
      targetEnd: axis === 'x' ? target.y : target.x,
      matchingKinds: true,
    });
  }

  // Keep a nearly horizontal/vertical wall aligned to room geometry before
  // considering nearby furniture edges or centres.
  if (closest) return closest;

  for (const bounds of objectBounds) {
    for (const target of axisAnchors(bounds, axis)) {
      const delta = target.value - movingValue;
      const distance = Math.abs(delta);
      if (distance > thresholdMm) continue;

      closest = closerCandidate(closest, {
        distance,
        delta,
        guide:
          axis === 'x'
            ? {
                axis,
                position: target.value,
                start: Math.min(proposedPosition.y, bounds.minY),
                end: Math.max(proposedPosition.y, bounds.maxY),
              }
            : {
                axis,
                position: target.value,
                start: Math.min(proposedPosition.x, bounds.minX),
                end: Math.max(proposedPosition.x, bounds.maxX),
              },
        targetStart: axis === 'x' ? bounds.minY : bounds.minX,
        targetEnd: axis === 'x' ? bounds.maxY : bounds.maxX,
        matchingKinds: true,
      });
    }
  }

  return closest;
}

function findRoomCenterSnaps(
  position: PointMm,
  room: PlanDocument['room'],
  thresholdMm: number,
): { x: Candidate | null; y: Candidate | null } {
  const bounds = getRoomBounds(room);
  const center = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };
  const xDelta = center.x - position.x;
  const yDelta = center.y - position.y;

  return {
    x:
      Math.abs(xDelta) <= thresholdMm
        ? {
            distance: Math.abs(xDelta),
            delta: xDelta,
            guide: {
              axis: 'x',
              position: center.x,
              start: bounds.minY,
              end: bounds.maxY,
            },
            matchingKinds: true,
          }
        : null,
    y:
      Math.abs(yDelta) <= thresholdMm
        ? {
            distance: Math.abs(yDelta),
            delta: yDelta,
            guide: {
              axis: 'y',
              position: center.y,
              start: bounds.minX,
              end: bounds.maxX,
            },
            matchingKinds: true,
          }
        : null,
  };
}

function objectAtPosition(object: PlanObject, position: PointMm): PlanObject {
  return { ...object, positionMm: position };
}

function dot(first: PointMm, second: PointMm): number {
  return first.x * second.x + first.y * second.y;
}

function projectionRadius(object: PlanObject, axis: PointMm): number {
  const radians = (object.rotationDeg * Math.PI) / 180;
  const widthAxis = { x: Math.cos(radians), y: Math.sin(radians) };
  const depthAxis = { x: -Math.sin(radians), y: Math.cos(radians) };
  const widthProjection = dot(widthAxis, axis) * (object.widthMm / 2);
  const depthProjection = dot(depthAxis, axis) * (object.depthMm / 2);

  if (object.shape === 'ellipse') {
    return Math.hypot(widthProjection, depthProjection);
  }
  return Math.abs(widthProjection) + Math.abs(depthProjection);
}

function polygonSignedArea(points: PointMm[]): number {
  return (
    points.reduce((area, point, index) => {
      const next = points[(index + 1) % points.length];
      return area + point.x * next.y - next.x * point.y;
    }, 0) / 2
  );
}

function findWallSnaps(
  object: PlanObject,
  position: PointMm,
  room: PlanDocument['room'],
  thresholdMm: number,
): {
  x: WallCandidate | null;
  y: WallCandidate | null;
  free: WallCandidate | null;
} {
  const orientation = polygonSignedArea(room.boundary) >= 0 ? 1 : -1;
  const halfWall = room.wallThicknessMm / 2;
  let x: WallCandidate | null = null;
  let y: WallCandidate | null = null;
  let free: WallCandidate | null = null;

  for (let index = 0; index < room.boundary.length; index += 1) {
    const start = room.boundary[index];
    const end = room.boundary[(index + 1) % room.boundary.length];
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    if (length === 0) continue;

    const tangent = {
      x: (end.x - start.x) / length,
      y: (end.y - start.y) / length,
    };
    const normal = {
      x: -tangent.y * orientation,
      y: tangent.x * orientation,
    };
    const innerStart = {
      x: start.x + normal.x * halfWall,
      y: start.y + normal.y * halfWall,
    };
    const innerEnd = {
      x: end.x + normal.x * halfWall,
      y: end.y + normal.y * halfWall,
    };
    const tangentPosition = dot(position, tangent);
    const tangentRadius = projectionRadius(object, tangent);
    const wallStart = dot(innerStart, tangent);
    const wallEnd = dot(innerEnd, tangent);
    if (
      tangentPosition + tangentRadius <
        Math.min(wallStart, wallEnd) - thresholdMm ||
      tangentPosition - tangentRadius >
        Math.max(wallStart, wallEnd) + thresholdMm
    ) {
      continue;
    }

    const gap =
      dot(position, normal) -
      projectionRadius(object, normal) -
      dot(innerStart, normal);
    const distance = Math.abs(gap);
    if (distance > thresholdMm) continue;

    const delta = { x: -gap * normal.x, y: -gap * normal.y };
    const axis: WallCandidate['axis'] =
      Math.abs(normal.y) < 0.0001
        ? 'x'
        : Math.abs(normal.x) < 0.0001
          ? 'y'
          : 'free';
    const movingBounds = getObjectSelectionBounds(
      objectAtPosition(object, position),
    );
    const guide: AlignmentGuide =
      axis === 'x'
        ? {
            axis,
            position: innerStart.x,
            start: Math.min(innerStart.y, innerEnd.y, movingBounds.minY),
            end: Math.max(innerStart.y, innerEnd.y, movingBounds.maxY),
          }
        : axis === 'y'
          ? {
              axis,
              position: innerStart.y,
              start: Math.min(innerStart.x, innerEnd.x, movingBounds.minX),
              end: Math.max(innerStart.x, innerEnd.x, movingBounds.maxX),
            }
          : {
              axis,
              points: [innerStart.x, innerStart.y, innerEnd.x, innerEnd.y],
            };
    const candidate: WallCandidate = { axis, distance, delta, guide };
    if (axis === 'x' && (!x || candidate.distance < x.distance)) x = candidate;
    if (axis === 'y' && (!y || candidate.distance < y.distance)) y = candidate;
    if (axis === 'free' && (!free || candidate.distance < free.distance)) {
      free = candidate;
    }
  }

  return { x, y, free };
}

export function getObjectAlignmentSnap({
  movingObject,
  proposedPosition,
  objects,
  room,
  excludedIds = [movingObject.id],
  thresholdMm,
}: {
  movingObject: PlanObject;
  proposedPosition: PointMm;
  objects: PlanObject[];
  room?: PlanDocument['room'];
  excludedIds?: string[];
  thresholdMm: number;
}): ObjectAlignmentSnap {
  const excluded = new Set(excludedIds);
  const targetBounds = objects
    .filter((object) => !excluded.has(object.id))
    .map(getObjectSelectionBounds);
  const proposedBounds = getObjectSelectionBounds(
    objectAtPosition(movingObject, proposedPosition),
  );
  let xSnap = findAxisSnap(proposedBounds, targetBounds, 'x', thresholdMm);
  let ySnap = findAxisSnap(proposedBounds, targetBounds, 'y', thresholdMm);
  if (room) {
    const roomCenterSnaps = findRoomCenterSnaps(
      proposedPosition,
      room,
      thresholdMm,
    );
    if (roomCenterSnaps.x) {
      xSnap = closerCandidate(xSnap, roomCenterSnaps.x);
    }
    if (roomCenterSnaps.y) {
      ySnap = closerCandidate(ySnap, roomCenterSnaps.y);
    }
  }
  const wallSnaps = room
    ? findWallSnaps(movingObject, proposedPosition, room, thresholdMm)
    : { x: null, y: null, free: null };
  const closestAxisWallDistance = Math.min(
    wallSnaps.x?.distance ?? Infinity,
    wallSnaps.y?.distance ?? Infinity,
  );

  if (wallSnaps.free && wallSnaps.free.distance < closestAxisWallDistance) {
    return {
      position: {
        x: Math.round(proposedPosition.x + wallSnaps.free.delta.x),
        y: Math.round(proposedPosition.y + wallSnaps.free.delta.y),
      },
      guides: [wallSnaps.free.guide],
      snappedAxes: ['x', 'y'],
    };
  }
  if (wallSnaps.x) {
    xSnap = closerCandidate(xSnap, {
      distance: wallSnaps.x.distance,
      delta: wallSnaps.x.delta.x,
      guide: wallSnaps.x.guide,
      matchingKinds: true,
    });
  }
  if (wallSnaps.y) {
    ySnap = closerCandidate(ySnap, {
      distance: wallSnaps.y.distance,
      delta: wallSnaps.y.delta.y,
      guide: wallSnaps.y.guide,
      matchingKinds: true,
    });
  }
  const position = {
    x: Math.round(proposedPosition.x + (xSnap?.delta ?? 0)),
    y: Math.round(proposedPosition.y + (ySnap?.delta ?? 0)),
  };
  const guides = [xSnap?.guide, ySnap?.guide].filter(
    (guide): guide is AlignmentGuide => guide !== undefined,
  );
  const snappedAxes: ('x' | 'y')[] = [];
  if (xSnap) snappedAxes.push('x');
  if (ySnap) snappedAxes.push('y');

  return { position, guides, snappedAxes };
}

export function getCornerAlignmentSnap({
  proposedPosition,
  boundary,
  cornerIndex,
  objects,
  thresholdMm,
}: {
  proposedPosition: PointMm;
  boundary: PointMm[];
  cornerIndex: number;
  objects: PlanObject[];
  thresholdMm: number;
}): ObjectAlignmentSnap {
  const objectBounds = objects.map(getObjectSelectionBounds);
  const xSnap = findCornerAxisSnap(
    proposedPosition,
    boundary,
    cornerIndex,
    objectBounds,
    'x',
    thresholdMm,
  );
  const ySnap = findCornerAxisSnap(
    proposedPosition,
    boundary,
    cornerIndex,
    objectBounds,
    'y',
    thresholdMm,
  );
  const position = {
    x: Math.round(proposedPosition.x + (xSnap?.delta ?? 0)),
    y: Math.round(proposedPosition.y + (ySnap?.delta ?? 0)),
  };
  const guides: AlignmentGuide[] = [];
  for (const candidate of [xSnap, ySnap]) {
    if (!candidate || candidate.guide.axis === 'free') continue;
    const along = candidate.guide.axis === 'x' ? position.y : position.x;
    guides.push({
      ...candidate.guide,
      start: Math.min(along, candidate.targetStart),
      end: Math.max(along, candidate.targetEnd),
    });
  }
  const snappedAxes: ('x' | 'y')[] = [];
  if (xSnap) snappedAxes.push('x');
  if (ySnap) snappedAxes.push('y');

  return {
    position,
    guides,
    snappedAxes,
  };
}
