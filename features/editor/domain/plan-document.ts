import { hasUsableInterior } from './room-interior';
import { snapWallMillimetres } from './wall-snap';
import { blueprintProfileSchema } from './blueprint-profile';
import { z } from 'zod';
import { blueprintKinds } from './office-blueprints';
import { isSimplePolygon } from './polygon';

export const DEFAULT_GRID_SIZE_MM = 100;
export const DEFAULT_SNAP_SIZE_MM = 50;

export const MAX_PLAN_NAME_LENGTH = 120;
export const MAX_ROOM_OBJECTS = 500;
export const MAX_ROOM_CORNERS = 256;
export const MAX_DIMENSION_MM = 1_000_000;
const identifier = z.string().min(1).max(160);
const name = z.string().trim().min(1).max(MAX_PLAN_NAME_LENGTH);
const dimension = z.number().int().positive().max(MAX_DIMENSION_MM);

export const pointMmSchema = z.object({
  x: z.number().int().min(-MAX_DIMENSION_MM).max(MAX_DIMENSION_MM),
  y: z.number().int().min(-MAX_DIMENSION_MM).max(MAX_DIMENSION_MM),
});

export const planObjectSchema = z.object({
  id: identifier,
  name,
  category: z.enum(['seating', 'table', 'device', 'custom']),
  blueprint: z.enum(blueprintKinds).optional(),
  blueprintProfile: blueprintProfileSchema.optional(),
  shape: z.enum(['rectangle', 'ellipse', 'triangle', 'polygon']),
  positionMm: pointMmSchema,
  rotationDeg: z.number().min(-360_000).max(360_000),
  widthMm: dimension,
  depthMm: dimension,
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  defaultSizeMm: z
    .object({
      widthMm: dimension,
      depthMm: dimension,
    })
    .optional(),
  locked: z.boolean(),
  mirroredHorizontally: z.boolean().default(false),
  mirroredVertically: z.boolean().default(false),
});

export const planGroupSchema = z.object({
  id: identifier,
  name,
  objectIds: z.array(identifier).min(2).max(MAX_ROOM_OBJECTS),
});

export const roomSchema = z
  .object({
    id: identifier,
    name,
    wallThicknessMm: dimension,
    boundary: z
      .array(pointMmSchema)
      .min(3)
      .max(MAX_ROOM_CORNERS)
      .refine(
        isSimplePolygon,
        'Room walls must form a non-crossing outline with walls at least 10 cm long.',
      ),
  })
  .refine(
    hasUsableInterior,
    'Wall thickness must leave a non-crossing interior with usable wall faces.',
  );

export const planDocumentSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: identifier,
    name,
    units: z.enum(['mm', 'cm', 'm', 'in', 'ft-in']),
    gridEnabled: z.boolean().default(true),
    snapEnabled: z.boolean().default(true),
    gridSizeMm: dimension.default(DEFAULT_GRID_SIZE_MM),
    snapSizeMm: dimension.default(DEFAULT_SNAP_SIZE_MM),
    room: roomSchema,
    objects: z.array(planObjectSchema).max(MAX_ROOM_OBJECTS),
    groups: z
      .array(planGroupSchema)
      .max(MAX_ROOM_OBJECTS / 2)
      .default([]),
    createdAt: z.string().max(64),
    updatedAt: z.string().max(64),
  })
  .superRefine((plan, context) => {
    const objectIds = new Set<string>();
    plan.objects.forEach((object, index) => {
      if (objectIds.has(object.id))
        context.addIssue({
          code: 'custom',
          path: ['objects', index, 'id'],
          message: 'Object IDs must be unique.',
        });
      objectIds.add(object.id);
    });
    const groupIds = new Set<string>();
    const groupedIds = new Set<string>();
    plan.groups.forEach((group, index) => {
      if (groupIds.has(group.id))
        context.addIssue({
          code: 'custom',
          path: ['groups', index, 'id'],
          message: 'Group IDs must be unique.',
        });
      groupIds.add(group.id);
      for (const id of group.objectIds) {
        if (!objectIds.has(id) || groupedIds.has(id))
          context.addIssue({
            code: 'custom',
            path: ['groups', index, 'objectIds'],
            message:
              'Each grouped object must exist and belong to only one group.',
          });
        groupedIds.add(id);
      }
    });
  });

export type PointMm = z.infer<typeof pointMmSchema>;
export type PlanObject = z.infer<typeof planObjectSchema>;
export type PlanGroup = z.infer<typeof planGroupSchema>;
export type PlanDocument = z.infer<typeof planDocumentSchema>;
export type ObjectCategory = PlanObject['category'];
export type FootprintShape = PlanObject['shape'];

export const LOCAL_PLAN_ID = 'local-plan';

export function createStarterPlan(): PlanDocument {
  const now = new Date().toISOString();

  return {
    schemaVersion: 1,
    id: LOCAL_PLAN_ID,
    name: 'Untitled room',
    units: 'm',
    gridEnabled: true,
    snapEnabled: true,
    gridSizeMm: DEFAULT_GRID_SIZE_MM,
    snapSizeMm: DEFAULT_SNAP_SIZE_MM,
    room: {
      id: 'room-1',
      name: 'Living room',
      wallThicknessMm: 120,
      boundary: [
        { x: 0, y: 0 },
        { x: 4800, y: 0 },
        { x: 4800, y: 3600 },
        { x: 0, y: 3600 },
      ],
    },
    objects: [],
    groups: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function createId(prefix: string): string {
  const suffix =
    globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${prefix}-${suffix}`;
}

export function getRoomBounds(room: PlanDocument['room']) {
  const xs = room.boundary.map((point) => point.x);
  const ys = room.boundary.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export type MeasurementSystem = 'metric' | 'imperial';

export function getMeasurementSystem(
  units: PlanDocument['units'],
): MeasurementSystem {
  return units === 'in' || units === 'ft-in' ? 'imperial' : 'metric';
}

function formatNumber(value: number, maximumFractionDigits: number): string {
  return new Intl.NumberFormat('en-GB', {
    maximumFractionDigits,
  }).format(value);
}

export function formatMeasurement(
  valueMm: number,
  units: PlanDocument['units'],
): string {
  if (getMeasurementSystem(units) === 'imperial') {
    const sign = valueMm < 0 ? '-' : '';
    const totalInches = Math.round((Math.abs(valueMm) / 25.4) * 100) / 100;
    const feet = Math.floor(totalInches / 12);
    const remainingInches = Math.round((totalInches % 12) * 100) / 100;
    if (feet === 0) return `${sign}${remainingInches}″`;
    if (remainingInches === 0) return `${sign}${feet}′`;
    return `${sign}${feet}′${remainingInches}″`;
  }

  return `${formatNumber(valueMm / 10, 1)} cm`;
}

export function formatWallMeasurement(
  valueMm: number,
  units: PlanDocument['units'],
): string {
  const roundedMm = snapWallMillimetres(valueMm);
  if (getMeasurementSystem(units) === 'metric' && Math.abs(roundedMm) > 1000) {
    return `${formatNumber(roundedMm / 1000, 2)} m`;
  }
  return formatMeasurement(roundedMm, units);
}

export function millimetresToUnit(
  valueMm: number,
  unit: 'm' | 'cm' | 'ft' | 'in',
): number {
  if (unit === 'm') return valueMm / 1000;
  if (unit === 'cm') return valueMm / 10;
  if (unit === 'ft') return valueMm / 304.8;
  return valueMm / 25.4;
}

export function unitToMillimetres(
  value: number,
  unit: 'm' | 'cm' | 'ft' | 'in',
): number {
  if (unit === 'm') return Math.round(value * 1000);
  if (unit === 'cm') return Math.round(value * 10);
  if (unit === 'ft') return Math.round(value * 304.8);
  return Math.round(value * 25.4);
}
