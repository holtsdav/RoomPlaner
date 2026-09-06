import { beforeEach, expect, it } from 'vitest';
import { createStarterPlan, planDocumentSchema } from './plan-document';
import {
  parseRoomFile,
  MAX_IMPORT_BYTES,
  copyImportedRoom,
} from './room-files';
import { findPresetPosition } from './placement';
import { basicShapeCatalog, objectCatalog, objectFromPreset } from './catalog';
import { catalogProvenance } from './catalog-provenance';
import { usePlannerStore } from '../state/planner-store';

beforeEach(() =>
  usePlannerStore.setState({
    document: createStarterPlan(),
    editStart: null,
    past: [],
    future: [],
    selectedIds: [],
    roomGeometryError: null,
  }),
);
it('rejects oversized input before parsing and excessive outline complexity before intersection checks', () => {
  expect(() => parseRoomFile(' '.repeat(MAX_IMPORT_BYTES + 1))).toThrow('5 MB');
  const plan = createStarterPlan();
  plan.room.boundary = Array.from({ length: 30000 }, (_, i) => ({
    x: i,
    y: i,
  }));
  expect(() => parseRoomFile(JSON.stringify(plan))).toThrow();
  expect(() =>
    parseRoomFile(
      JSON.stringify(Array.from({ length: 21 }, createStarterPlan)),
    ),
  ).toThrow('20 rooms');
});
it('bounds strings, coordinate values, profiles and object counts', () => {
  for (const change of [
    (plan: ReturnType<typeof createStarterPlan>) => {
      plan.name = 'x'.repeat(121);
    },
    (plan: ReturnType<typeof createStarterPlan>) => {
      plan.objects[0].positionMm.x = Number.MAX_SAFE_INTEGER;
    },
    (plan: ReturnType<typeof createStarterPlan>) => {
      plan.objects = Array.from({ length: 501 }, (_, i) => ({
        ...plan.objects[0],
        id: `item-${i}`,
      }));
    },
  ]) {
    const plan = createStarterPlan();
    change(plan);
    expect(planDocumentSchema.safeParse(plan).success).toBe(false);
  }
  const plan = createStarterPlan();
  plan.room.name = 'x'.repeat(120);
  expect(planDocumentSchema.safeParse(copyImportedRoom(plan)).success).toBe(
    true,
  );
});
it('rejects collapsed and inverted wall interiors while retaining short valid inside faces', () => {
  const plan = createStarterPlan();
  plan.room.wallThicknessMm = 10000;
  expect(planDocumentSchema.safeParse(plan).success).toBe(false);
  plan.room.wallThicknessMm = 120;
  plan.room.boundary = [
    { x: 0, y: 0 },
    { x: 148, y: 0 },
    { x: 148, y: 1000 },
    { x: 0, y: 1000 },
  ];
  expect(planDocumentSchema.safeParse(plan).success).toBe(true);
  plan.room.boundary[1].x = 120;
  plan.room.boundary[2].x = 120;
  expect(planDocumentSchema.safeParse(plan).success).toBe(false);
});
it('places an exact interior fit and rotates a preset to fit a narrow room', () => {
  const plan = createStarterPlan();
  plan.objects = [];
  plan.room.boundary = [
    { x: 0, y: 0 },
    { x: 1120, y: 0 },
    { x: 1120, y: 2120 },
    { x: 0, y: 2120 },
  ];
  expect(
    findPresetPosition(plan, {
      ...basicShapeCatalog[0],
      widthMm: 1000,
      depthMm: 2000,
    }),
  ).toEqual({ x: 560, y: 1060 });
  usePlannerStore.setState({ document: plan });
  usePlannerStore
    .getState()
    .addPreset({ ...basicShapeCatalog[0], widthMm: 1500, depthMm: 800 });
  const object = usePlannerStore.getState().document.objects[0];
  expect(object).toMatchObject({
    widthMm: 1500,
    depthMm: 800,
    rotationDeg: 90,
  });
});
it('rejects an over-limit command without throwing or replacing the valid document', () => {
  usePlannerStore.getState().selectObject('sofa-1');
  expect(() =>
    usePlannerStore.getState().updateSelectedObject({ widthMm: 1e20 }),
  ).not.toThrow();
  expect(usePlannerStore.getState().document.objects[0].widthMm).toBe(2100);
  expect(usePlannerStore.getState().roomGeometryError).toBeTruthy();
});
it('retains manufacturer provenance through renaming and resizing without claiming clearances', () => {
  const preset = objectCatalog.find((p) => p.name === 'Monitor · 27″')!;
  const object = objectFromPreset(preset, 'test', { x: 0, y: 0 });
  object.name = 'My display';
  object.widthMm = 123;
  expect(catalogProvenance(object)).toMatchObject({
    label: 'Manufacturer reference',
    model: 'Dell P2722H outline',
  });
  expect(catalogProvenance(basicShapeCatalog[0]).label).toBe(
    'Generic planning size',
  );
});
