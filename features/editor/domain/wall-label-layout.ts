import { formatWallMeasurement, type PlanDocument } from './plan-document';
import { getWallMeasurements } from './polygon';
import { insideWallLengths } from './room-measurements';

type Side = 'left' | 'right' | 'top' | 'bottom';
const GAP = 8;

/**
 * Stable exterior dimension rails. Side and order depend only on room geometry.
 * Packing uses continuous max/mean operations in screen space, so zoom cannot
 * switch candidate slots or send a short return to the other side of a corner.
 * The same stateless layout is used by the canvas and image export.
 */
export function layoutWallLabels(
  room: PlanDocument['room'],
  units: PlanDocument['units'],
  scale: number,
) {
  const lengths = insideWallLengths(room);
  const base = getWallMeasurements(room.boundary, 1);
  const bounds = {
    left: Math.min(...room.boundary.map((p) => p.x)) - room.wallThicknessMm / 2,
    right:
      Math.max(...room.boundary.map((p) => p.x)) + room.wallThicknessMm / 2,
    top: Math.min(...room.boundary.map((p) => p.y)) - room.wallThicknessMm / 2,
    bottom:
      Math.max(...room.boundary.map((p) => p.y)) + room.wallThicknessMm / 2,
  };
  const labels = base.map((wall, index) => {
    const a = room.boundary[index];
    const b = room.boundary[(index + 1) % base.length];
    const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const normal = {
      x: wall.center.x - midpoint.x,
      y: wall.center.y - midpoint.y,
    };
    // Short steps belong to the nearest exterior rail, even when their wall
    // normal points towards the top/bottom of a deep notch.
    const sides: Side[] = ['left', 'right', 'top', 'bottom'];
    const distance = (side: Side) =>
      Math.abs(
        midpoint[side === 'left' || side === 'right' ? 'x' : 'y'] -
          bounds[side],
      );
    const side = sides.reduce((nearest, candidate) =>
      distance(candidate) < distance(nearest) ? candidate : nearest,
    );
    const widthPx = Math.max(
      44,
      formatWallMeasurement(lengths[index], units).length * 7.25 + 16,
    );
    const radians = (wall.angleDeg * Math.PI) / 180;
    const halfW =
      (Math.abs(Math.cos(radians)) * widthPx +
        Math.abs(Math.sin(radians)) * 28) /
      2;
    const halfH =
      (Math.abs(Math.sin(radians)) * widthPx +
        Math.abs(Math.cos(radians)) * 28) /
      2;
    const anchor = {
      x: midpoint.x + (normal.x * room.wallThicknessMm) / 2,
      y: midpoint.y + (normal.y * room.wallThicknessMm) / 2,
    };
    return {
      index,
      side,
      halfW,
      halfH,
      anchor,
      x: midpoint.x * scale,
      y: midpoint.y * scale,
      lengthMm: lengths[index],
      angleDeg: wall.angleDeg,
      widthPx,
    };
  });

  for (const side of ['left', 'right', 'top', 'bottom'] as const) {
    const vertical = side === 'left' || side === 'right';
    const axis = vertical ? 'y' : 'x';
    const extent = vertical ? 'halfH' : 'halfW';
    const rail = labels
      .filter((label) => label.side === side)
      .sort((a, b) => a.anchor[axis] - b.anchor[axis] || a.index - b.index);
    // Forward packing preserves order. Centre the displacement so crowded
    // labels spread in both directions instead of drifting down/right.
    let displacement = 0;
    for (let i = 1; i < rail.length; i++) {
      const previous = rail[i - 1];
      const label = rail[i];
      const packed = Math.max(
        label[axis],
        previous[axis] + previous[extent] + label[extent] + GAP + 1,
      );
      displacement += packed - label[axis];
      label[axis] = packed;
    }
    for (const label of rail) label[axis] -= displacement / rail.length;

    // Top/bottom rails also clear the packed side labels at crowded corners.
    // These extrema are continuous in zoom, unlike collision candidate search.
    const edge = vertical
      ? bounds[side] * scale
      : side === 'top'
        ? Math.min(
            bounds.top * scale,
            ...labels
              .filter(
                (label) => label.side === 'left' || label.side === 'right',
              )
              .map((label) => label.y - label.halfH),
          )
        : Math.max(
            bounds.bottom * scale,
            ...labels
              .filter(
                (label) => label.side === 'left' || label.side === 'right',
              )
              .map((label) => label.y + label.halfH),
          );
    const sign = side === 'left' || side === 'top' ? -1 : 1;
    for (const label of rail) {
      label[vertical ? 'x' : 'y'] =
        edge + sign * (label[vertical ? 'halfW' : 'halfH'] + GAP + 1);
    }
  }

  return labels.map((label) => ({
    lengthMm: label.lengthMm,
    center: { x: label.x / scale, y: label.y / scale },
    angleDeg: label.angleDeg,
    widthPx: label.widthPx,
    anchor: label.anchor,
    box: {
      left: label.x - label.halfW - GAP / 2,
      right: label.x + label.halfW + GAP / 2,
      top: label.y - label.halfH - GAP / 2,
      bottom: label.y + label.halfH + GAP / 2,
    },
  }));
}
