import { snapWallMillimetres } from './wall-snap';
import { blueprintProfileSchema } from './blueprint-profile';
import { z } from 'zod';
import { blueprintKinds } from './office-blueprints';
import { isSimplePolygon } from './polygon';

export const DEFAULT_GRID_SIZE_MM = 100;
export const DEFAULT_SNAP_SIZE_MM = 50;

export const pointMmSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
});

export const planObjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(['seating', 'table', 'device', 'custom']),
  blueprint: z.enum(blueprintKinds).optional(),
  blueprintProfile: blueprintProfileSchema.optional(),
  shape: z.enum(['rectangle', 'ellipse', 'triangle', 'polygon']),
  positionMm: pointMmSchema,
  rotationDeg: z.number(),
  widthMm: z.number().int().positive(),
  depthMm: z.number().int().positive(),
  heightMm: z.number().int().positive().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  defaultSizeMm: z
    .object({
      widthMm: z.number().int().positive(),
      depthMm: z.number().int().positive(),
    })
    .optional(),
  locked: z.boolean(),
  mirroredHorizontally: z.boolean().default(false),
  mirroredVertically: z.boolean().default(false),
});

export const planGroupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  objectIds: z.array(z.string().min(1)).min(2),
});

export const roomSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  wallThicknessMm: z.number().int().positive(),
  boundary: z
    .array(pointMmSchema)
    .min(3)
    .refine(
      isSimplePolygon,
      'Room walls must form a non-crossing outline with walls at least 10 cm long.',
    ),
});

export const planDocumentSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1),
    name: z.string().min(1),
    units: z.enum(['mm', 'cm', 'm', 'in', 'ft-in']),
    gridEnabled: z.boolean().default(true),
    snapEnabled: z.boolean().default(true),
    gridSizeMm: z.number().int().positive().default(DEFAULT_GRID_SIZE_MM),
    snapSizeMm: z.number().int().positive().default(DEFAULT_SNAP_SIZE_MM),
    room: roomSchema,
    objects: z.array(planObjectSchema),
    groups: z.array(planGroupSchema).default([]),
    createdAt: z.string(),
    updatedAt: z.string(),
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
    objects: [
      {
        id: 'sofa-1',
        name: 'Three-seat sofa',
        category: 'seating',
        shape: 'rectangle',
        positionMm: { x: 1450, y: 1000 },
        rotationDeg: 0,
        widthMm: 2100,
        depthMm: 900,
        heightMm: 820,
        locked: false,
        mirroredHorizontally: false,
        mirroredVertically: false,
      },
      {
        id: 'table-1',
        name: 'Round table',
        category: 'table',
        shape: 'ellipse',
        positionMm: { x: 3450, y: 2350 },
        rotationDeg: 0,
        widthMm: 1000,
        depthMm: 1000,
        heightMm: 740,
        locked: false,
        mirroredHorizontally: false,
        mirroredVertically: false,
      },
    ],
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
