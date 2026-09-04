import { z } from 'zod';

export const pointMmSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
});

export const planObjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(['seating', 'table', 'device', 'custom']),
  shape: z.enum(['rectangle', 'ellipse']),
  positionMm: pointMmSchema,
  rotationDeg: z.number(),
  widthMm: z.number().int().positive(),
  depthMm: z.number().int().positive(),
  heightMm: z.number().int().positive().optional(),
  locked: z.boolean(),
});

export const roomSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  wallThicknessMm: z.number().int().positive(),
  boundary: z.array(pointMmSchema).min(3),
});

export const planDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  name: z.string().min(1),
  units: z.enum(['mm', 'cm', 'm', 'in', 'ft-in']),
  room: roomSchema,
  objects: z.array(planObjectSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PointMm = z.infer<typeof pointMmSchema>;
export type PlanObject = z.infer<typeof planObjectSchema>;
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
    units: 'mm',
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
      },
    ],
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

export function formatMillimetres(value: number): string {
  return `${new Intl.NumberFormat('en-GB').format(Math.round(value))} mm`;
}
