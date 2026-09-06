import { layoutWallLabels } from '../domain/wall-label-layout';
import { getBlueprintProfile } from '../domain/catalog';
import { officeBlueprint } from '../domain/office-blueprints';
import { shapePoints } from '../domain/shape-points';
import {
  getRoomBounds,
  formatWallMeasurement,
  planDocumentSchema,
  type PlanDocument,
  type PlanObject,
} from '../domain/plan-document';

const EXPORT_PADDING_PX = 96;
const MAX_EXPORT_WIDTH_PX = 2400;
const MAX_EXPORT_HEIGHT_PX = 1800;
const MAX_PIXELS_PER_MM = 0.4;

import { getObjectColors } from './object-colors';

type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

function rotatedObjectBounds(object: PlanObject): Bounds {
  const angle = (object.rotationDeg * Math.PI) / 180;
  const halfWidth = object.widthMm / 2;
  const halfDepth = object.depthMm / 2;
  const extentX =
    Math.abs(Math.cos(angle)) * halfWidth +
    Math.abs(Math.sin(angle)) * halfDepth;
  const extentY =
    Math.abs(Math.sin(angle)) * halfWidth +
    Math.abs(Math.cos(angle)) * halfDepth;

  return {
    minX: object.positionMm.x - extentX,
    minY: object.positionMm.y - extentY,
    maxX: object.positionMm.x + extentX,
    maxY: object.positionMm.y + extentY,
  };
}

function planBounds(document: PlanDocument): Bounds {
  const roomBounds = getRoomBounds(document.room);
  const marginMm = Math.max(document.room.wallThicknessMm, 200);
  return document.objects.reduce<Bounds>(
    (bounds, object) => {
      const objectBounds = rotatedObjectBounds(object);
      return {
        minX: Math.min(bounds.minX, objectBounds.minX - marginMm),
        minY: Math.min(bounds.minY, objectBounds.minY - marginMm),
        maxX: Math.max(bounds.maxX, objectBounds.maxX + marginMm),
        maxY: Math.max(bounds.maxY, objectBounds.maxY + marginMm),
      };
    },
    {
      minX: roomBounds.minX - marginMm,
      minY: roomBounds.minY - marginMm,
      maxX: roomBounds.maxX + marginMm,
      maxY: roomBounds.maxY + marginMm,
    },
  );
}

function roundedRectangle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - safeRadius,
    y + height,
  );
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function drawObject(
  context: CanvasRenderingContext2D,
  object: PlanObject,
  scale: number,
  toCanvasX: (worldX: number) => number,
  toCanvasY: (worldY: number) => number,
) {
  const colors = getObjectColors(object);
  const width = object.widthMm * scale;
  const height = object.depthMm * scale;

  context.save();
  context.translate(
    toCanvasX(object.positionMm.x),
    toCanvasY(object.positionMm.y),
  );
  context.rotate((object.rotationDeg * Math.PI) / 180);
  context.scale(
    object.mirroredHorizontally ? -1 : 1,
    object.mirroredVertically ? -1 : 1,
  );
  context.fillStyle = colors.fill;
  context.strokeStyle = colors.stroke;
  context.lineWidth = Math.max(2, 10 * scale);
  context.shadowColor = 'rgb(22 52 95 / 16%)';
  context.shadowBlur = 18;
  context.shadowOffsetY = 5;

  if (object.blueprint) {
    context.shadowColor = 'transparent';
    context.lineWidth = Math.min(1.5, Math.min(width, height) * 0.025);
    context.lineJoin = 'round';
    context.lineCap = 'round';
    for (const part of officeBlueprint(
      object.blueprint,
      width,
      height,
      getBlueprintProfile(object),
    )) {
      const path = new Path2D(part.d);
      context.strokeStyle = part.detail ? colors.detail : colors.stroke;
      context.fillStyle = part.solid ? colors.detail : colors.fill;
      if (!part.detail || part.solid) context.fill(path);
      context.stroke(path);
    }
    context.restore();
    return;
  }

  if (object.shape === 'triangle' || object.shape === 'polygon') {
    const points = shapePoints(object.shape, width, height);
    context.beginPath();
    points.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.closePath();
  } else if (object.shape === 'ellipse') {
    context.beginPath();
    context.ellipse(0, 0, width / 2, height / 2, 0, 0, Math.PI * 2);
  } else {
    roundedRectangle(
      context,
      -width / 2,
      -height / 2,
      width,
      height,
      object.category === 'custom' ? 0 : Math.min(28, height / 8),
    );
  }
  context.fill();
  context.stroke();

  context.shadowColor = 'transparent';
  if (
    object.shape === 'rectangle' &&
    object.category !== 'custom' &&
    width > 36 &&
    height > 36
  ) {
    const inset = Math.min(32, width / 8, height / 8);
    context.strokeStyle = colors.detail;
    context.lineWidth = Math.max(1.5, 8 * scale);
    context.setLineDash([14, 10]);
    roundedRectangle(
      context,
      -width / 2 + inset,
      -height / 2 + inset,
      width - inset * 2,
      height - inset * 2,
      Math.min(18, height / 10),
    );
    context.stroke();
  }
  context.restore();

  context.save();
  context.translate(
    toCanvasX(object.positionMm.x),
    toCanvasY(object.positionMm.y),
  );
  context.rotate((object.rotationDeg * Math.PI) / 180);
  context.fillStyle = '#17345f';
  context.font = `600 ${Math.max(12, Math.min(28, height / 5))}px Geist, Arial, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  if (object.category !== 'custom') {
    context.fillText(object.name, 0, 0, Math.max(24, width - 24));
  }
  context.restore();
}

export type RoomImageOptions = { dimensions?: boolean; grid?: boolean };

export function exportGridSpacing(
  gridMm: number,
  worldWidth: number,
  worldHeight: number,
): number {
  return (
    gridMm *
    Math.max(1, Math.ceil(Math.max(worldWidth, worldHeight) / (120 * gridMm)))
  );
}

export function renderRoomImage(
  document: PlanDocument,
  options: RoomImageOptions = {},
): HTMLCanvasElement {
  const validated = planDocumentSchema.parse(document);
  const bounds = planBounds(validated);
  const worldWidth = Math.max(1, bounds.maxX - bounds.minX);
  const worldHeight = Math.max(1, bounds.maxY - bounds.minY);
  const scale = Math.min(
    MAX_PIXELS_PER_MM,
    (MAX_EXPORT_WIDTH_PX - EXPORT_PADDING_PX * 2) / worldWidth,
    (MAX_EXPORT_HEIGHT_PX - EXPORT_PADDING_PX * 2) / worldHeight,
  );
  const canvas = globalThis.document.createElement('canvas');
  canvas.width = Math.max(
    640,
    Math.ceil(worldWidth * scale + EXPORT_PADDING_PX * 2),
  );
  canvas.height = Math.max(
    480,
    Math.ceil(worldHeight * scale + EXPORT_PADDING_PX * 2),
  );

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas rendering is unavailable.');

  const horizontalInset = (canvas.width - worldWidth * scale) / 2;
  const verticalInset = (canvas.height - worldHeight * scale) / 2;
  const toCanvasX = (worldX: number) =>
    horizontalInset + (worldX - bounds.minX) * scale;
  const toCanvasY = (worldY: number) =>
    verticalInset + (worldY - bounds.minY) * scale;

  context.fillStyle = '#eaf1f6';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const gridStepMm = exportGridSpacing(
    validated.gridSizeMm,
    worldWidth,
    worldHeight,
  );
  const drawGrid = () => {
    if (!(options.grid ?? validated.gridEnabled)) return;
    context.beginPath();
    for (
      let x = Math.floor(bounds.minX / gridStepMm) * gridStepMm;
      x <= bounds.maxX;
      x += gridStepMm
    ) {
      const canvasX = Math.round(toCanvasX(x)) + 0.5;
      context.moveTo(canvasX, 0);
      context.lineTo(canvasX, canvas.height);
    }
    for (
      let y = Math.floor(bounds.minY / gridStepMm) * gridStepMm;
      y <= bounds.maxY;
      y += gridStepMm
    ) {
      const canvasY = Math.round(toCanvasY(y)) + 0.5;
      context.moveTo(0, canvasY);
      context.lineTo(canvas.width, canvasY);
    }
    context.strokeStyle = 'rgb(146 165 184 / 35%)';
    context.lineWidth = 1;
    context.stroke();
  };

  const roomPath = new Path2D();
  validated.room.boundary.forEach((point, index) => {
    const x = toCanvasX(point.x);
    const y = toCanvasY(point.y);
    if (index === 0) roomPath.moveTo(x, y);
    else roomPath.lineTo(x, y);
  });
  roomPath.closePath();
  context.fillStyle = '#fcfdff';
  context.fill(roomPath);
  drawGrid();
  context.strokeStyle = '#10233f';
  context.lineJoin = 'round';
  context.lineWidth = Math.max(4, validated.room.wallThicknessMm * scale);
  context.stroke(roomPath);

  validated.objects.forEach((object) =>
    drawObject(context, object, scale, toCanvasX, toCanvasY),
  );

  if (options.dimensions ?? true) {
    context.fillStyle = '#294b68';
    context.font = '500 14px Arial, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    for (const wall of layoutWallLabels(
      validated.room,
      validated.units,
      scale,
    )) {
      if (wall.anchor) {
        context.beginPath();
        context.moveTo(toCanvasX(wall.anchor.x), toCanvasY(wall.anchor.y));
        context.lineTo(toCanvasX(wall.center.x), toCanvasY(wall.center.y));
        context.strokeStyle = '#64748b';
        context.lineWidth = 1;
        context.stroke();
      }
      context.save();
      context.translate(toCanvasX(wall.center.x), toCanvasY(wall.center.y));
      context.rotate((wall.angleDeg * Math.PI) / 180);
      const label = formatWallMeasurement(wall.lengthMm, validated.units);
      const measured = context.measureText(label).width;
      context.fillStyle = '#fcfdff';
      context.fillRect(-measured / 2 - 4, -10, measured + 8, 20);
      context.fillStyle = '#294b68';
      context.fillText(label, 0, 0);
      context.restore();
    }
  }
  // A numeric legend survives resizing; pixels alone cannot express a print scale.
  const scaleBarMm = 10 ** Math.floor(Math.log10(120 / scale));
  const legendY = canvas.height - 28;
  context.fillStyle = '#fcfdff';
  context.fillRect(0, canvas.height - 56, canvas.width, 56);
  context.strokeStyle = '#183153';
  context.lineWidth = 2;
  context.setLineDash([]);
  context.beginPath();
  context.moveTo(24, legendY);
  context.lineTo(24 + scaleBarMm * scale, legendY);
  context.stroke();
  context.fillStyle = '#183153';
  context.font = '12px Arial, sans-serif';
  context.textAlign = 'left';
  context.textBaseline = 'bottom';
  context.fillText(
    formatWallMeasurement(scaleBarMm, validated.units),
    24,
    legendY - 4,
  );
  context.textBaseline = 'middle';
  context.fillText(
    `${(options.dimensions ?? true) ? 'Wall dimensions: inside faces. ' : ''}${(options.grid ?? validated.gridEnabled) ? `Grid: ${formatWallMeasurement(gridStepMm, validated.units)}.` : 'Grid hidden.'}`,
    Math.max(155, 44 + scaleBarMm * scale),
    legendY,
  );

  return canvas;
}

export function createRoomPng(
  document: PlanDocument,
  options: RoomImageOptions = {},
): Promise<Blob> {
  const canvas = renderRoomImage(document, options);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('The room image could not be created.'));
    }, 'image/png');
  });
}
