import {
  edgeLength,
  intersectLines,
  isSimplePolygon,
  signedPolygonArea,
} from './polygon';
import {
  getRoomBounds,
  type PointMm,
  type PlanDocument,
} from './plan-document';

/** Only axis-aligned rectangles have an inside width/depth from these bounds. */
export function rectangularInsideSize(room: PlanDocument['room']) {
  const points = room.boundary;
  if (
    points.length !== 4 ||
    points.some((point, index) => {
      const next = points[(index + 1) % points.length];
      return point.x !== next.x && point.y !== next.y;
    })
  )
    return null;
  const bounds = getRoomBounds(room);
  const width = bounds.width - room.wallThicknessMm;
  const depth = bounds.height - room.wallThicknessMm;
  return width > 0 && depth > 0 ? { width, depth } : null;
}

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

export function insideRoomBounds(room: PlanDocument['room']) {
  return getRoomBounds({
    ...room,
    boundary: offsetBoundary(room.boundary, room.wallThicknessMm / 2),
  });
}

export function insideWallLengths(room: PlanDocument['room']) {
  const inner = offsetBoundary(room.boundary, room.wallThicknessMm / 2);
  return inner.map((point, index) => {
    const next = inner[(index + 1) % inner.length];
    const a = room.boundary[index],
      b = room.boundary[(index + 1) % inner.length];
    // A face swallowed by adjoining walls has no usable length, not an inverted length.
    return Math.max(
      0,
      ((next.x - point.x) * (b.x - a.x) + (next.y - point.y) * (b.y - a.y)) /
        edgeLength(a, b),
    );
  });
}

export function resizeInsideRoom(
  room: PlanDocument['room'],
  width: number,
  depth: number,
  thickness: number,
) {
  if (
    ![width, depth, thickness].every(
      (value) => Number.isFinite(value) && value > 0,
    )
  )
    return null;
  const inside = offsetBoundary(room.boundary, room.wallThicknessMm / 2);
  const bounds = insideRoomBounds(room);
  const resized = inside.map((point) => ({
    x: bounds.minX + ((point.x - bounds.minX) * width) / bounds.width,
    y: bounds.minY + ((point.y - bounds.minY) * depth) / bounds.height,
  }));
  const boundary = offsetBoundary(resized, -thickness / 2).map((point) => ({
    x: Math.round(point.x),
    y: Math.round(point.y),
  }));
  return isSimplePolygon(boundary) &&
    insideWallLengths({ ...room, boundary, wallThicknessMm: thickness }).every(
      (value) => value > 0,
    )
    ? boundary
    : null;
}
