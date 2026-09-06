import { shapePoints } from './shape-points';
import type { PlanObject, PointMm } from './plan-document';

export type SelectionBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export function boundsFromPoints(
  first: PointMm,
  second: PointMm,
): SelectionBounds {
  return {
    minX: Math.min(first.x, second.x),
    minY: Math.min(first.y, second.y),
    maxX: Math.max(first.x, second.x),
    maxY: Math.max(first.y, second.y),
  };
}

export function getObjectSelectionBounds(object: PlanObject): SelectionBounds {
  const radians = (object.rotationDeg * Math.PI) / 180;
  const halfWidth =
    (Math.abs(Math.cos(radians)) * object.widthMm +
      Math.abs(Math.sin(radians)) * object.depthMm) /
    2;
  const halfHeight =
    (Math.abs(Math.sin(radians)) * object.widthMm +
      Math.abs(Math.cos(radians)) * object.depthMm) /
    2;

  return {
    minX: object.positionMm.x - halfWidth,
    minY: object.positionMm.y - halfHeight,
    maxX: object.positionMm.x + halfWidth,
    maxY: object.positionMm.y + halfHeight,
  };
}

export function getObjectsSelectionBounds(
  objects: PlanObject[],
): SelectionBounds | null {
  if (objects.length === 0) return null;

  return objects
    .map(getObjectSelectionBounds)
    .reduce((bounds, objectBounds) => ({
      minX: Math.min(bounds.minX, objectBounds.minX),
      minY: Math.min(bounds.minY, objectBounds.minY),
      maxX: Math.max(bounds.maxX, objectBounds.maxX),
      maxY: Math.max(bounds.maxY, objectBounds.maxY),
    }));
}

export function boundsIntersect(
  first: SelectionBounds,
  second: SelectionBounds,
): boolean {
  return !(
    first.maxX < second.minX ||
    first.minX > second.maxX ||
    first.maxY < second.minY ||
    first.minY > second.maxY
  );
}

function getObjectFootprintPoints(object: PlanObject): PointMm[] {
  const halfWidth = object.widthMm / 2;
  const halfDepth = object.depthMm / 2;
  const localPoints =
    object.shape === 'triangle' || object.shape === 'polygon'
      ? shapePoints(object.shape, object.widthMm, object.depthMm)
      : object.shape === 'ellipse'
        ? Array.from({ length: 32 }, (_, index) => {
            const angle = (index / 32) * Math.PI * 2;
            return {
              x: Math.cos(angle) * halfWidth,
              y: Math.sin(angle) * halfDepth,
            };
          })
        : [
            { x: -halfWidth, y: -halfDepth },
            { x: halfWidth, y: -halfDepth },
            { x: halfWidth, y: halfDepth },
            { x: -halfWidth, y: halfDepth },
          ];
  const radians = (object.rotationDeg * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);

  return localPoints
    .map((point) => ({
      x: point.x * (object.mirroredHorizontally ? -1 : 1),
      y: point.y * (object.mirroredVertically ? -1 : 1),
    }))
    .map((point) => ({
      x: object.positionMm.x + point.x * cosine - point.y * sine,
      y: object.positionMm.y + point.x * sine + point.y * cosine,
    }));
}

function projectionRange(points: PointMm[], axis: PointMm) {
  const projections = points.map(
    (point) => point.x * axis.x + point.y * axis.y,
  );
  return { min: Math.min(...projections), max: Math.max(...projections) };
}

export function objectsOverlap(first: PlanObject, second: PlanObject): boolean {
  const firstPoints = getObjectFootprintPoints(first);
  const secondPoints = getObjectFootprintPoints(second);

  for (const points of [firstPoints, secondPoints]) {
    for (let index = 0; index < points.length; index += 1) {
      const start = points[index];
      const end = points[(index + 1) % points.length];
      const axis = { x: -(end.y - start.y), y: end.x - start.x };
      const firstRange = projectionRange(firstPoints, axis);
      const secondRange = projectionRange(secondPoints, axis);
      if (
        firstRange.max <= secondRange.min ||
        secondRange.max <= firstRange.min
      ) {
        return false;
      }
    }
  }

  return true;
}

export function objectsIntersectingBounds(
  objects: PlanObject[],
  bounds: SelectionBounds,
): string[] {
  return objects
    .filter((object) =>
      boundsIntersect(bounds, getObjectSelectionBounds(object)),
    )
    .map((object) => object.id);
}
