import { describe, expect, it } from 'vitest';
import { Path } from 'konva/lib/shapes/Path';
import { structuralCatalog, objectFromPreset } from './catalog';
import {
  createStarterPlan,
  planDocumentSchema,
  planObjectSchema,
} from './plan-document';
import { attachWindow, constrainWindows } from './wall-attachment';
import { officeBlueprint } from './office-blueprints';
import { usePlannerStore } from '../state/planner-store';

const windowPreset = structuralCatalog.find(
  (preset) => preset.blueprint === 'window',
)!;
const windowAt = (x: number, y: number) =>
  objectFromPreset(windowPreset, 'test-window', { x, y });

describe('Structural objects', () => {
  it('saves each blueprint and keeps paths within bounds when resized', () => {
    for (const preset of structuralCatalog) {
      expect(
        planObjectSchema.parse(
          objectFromPreset(preset, preset.id, { x: 0, y: 0 }),
        ).blueprint,
      ).toBe(preset.blueprint);
      for (const [w, d] of [
        [preset.widthMm, preset.depthMm],
        [1, 10000],
        [10000, 1],
      ]) {
        for (const part of officeBlueprint(preset.blueprint!, w, d)) {
          const path = new Path({ data: part.d });
          const b = path.getSelfRect();
          expect(Number.isFinite(b.x + b.y + b.width + b.height)).toBe(true);
          expect(b.x).toBeGreaterThanOrEqual(-w / 2 - 0.01);
          expect(b.y).toBeGreaterThanOrEqual(-d / 2 - 0.01);
          expect(b.x + b.width).toBeLessThanOrEqual(w / 2 + 0.01);
          expect(b.y + b.height).toBeLessThanOrEqual(d / 2 + 0.01);
          path.destroy();
        }
      }
    }
  });

  it('projects windows onto horizontal, vertical and diagonal walls and clamps their ends', () => {
    const room = createStarterPlan().room;
    expect(attachWindow(windowAt(5, 3), room)).toMatchObject({
      positionMm: { x: 600, y: 0 },
      rotationDeg: 0,
      depthMm: room.wallThicknessMm,
    });
    expect(attachWindow(windowAt(4790, 1800), room)).toMatchObject({
      positionMm: { x: 4800, y: 1800 },
      rotationDeg: 90,
    });
    const diagonal = {
      ...room,
      boundary: [
        { x: 0, y: 0 },
        { x: 3000, y: 3000 },
        { x: 0, y: 4000 },
      ],
    };
    const attached = attachWindow(windowAt(1600, 1400), diagonal);
    expect(attached.rotationDeg).toBe(45);
    expect(attached.positionMm).toEqual({ x: 1500, y: 1500 });
    expect(
      attachWindow({ ...windowAt(0, 0), widthMm: 10000 }, room).widthMm,
    ).toBe(10000);
  });

  it('follows room edits, including locked windows, and survives save/load', () => {
    const original = createStarterPlan();
    original.objects = [
      attachWindow({ ...windowAt(4790, 1800), locked: true }, original.room),
    ];
    const next = {
      ...original,
      room: {
        ...original.room,
        wallThicknessMm: 200,
        boundary: original.room.boundary.map((p) => ({ x: p.x * 2, y: p.y })),
      },
    };
    const result = constrainWindows(next, original);
    expect(result.objects[0]).toMatchObject({
      positionMm: { x: 9600, y: 1800 },
      depthMm: 200,
      locked: true,
    });
    expect(
      planDocumentSchema.parse(JSON.parse(JSON.stringify(result))),
    ).toEqual(result);
  });

  it('enforces attachment on add, free movement, rotation, duplication and undo', () => {
    const document = {
      ...createStarterPlan(),
      objects: [],
      snapEnabled: false,
    };
    usePlannerStore.setState({
      document,
      selectedIds: [],
      past: [],
      future: [],
      editStart: null,
    });
    usePlannerStore.getState().addPreset(windowPreset);
    const id = usePlannerStore.getState().selectedIds[0];
    usePlannerStore.getState().moveSelectionTo(id, { x: 4790, y: 1800 });
    expect(usePlannerStore.getState().document.objects[0]).toMatchObject({
      positionMm: { x: 4800, y: 1800 },
      rotationDeg: 90,
    });
    usePlannerStore
      .getState()
      .updateSelectedObject({ rotationDeg: 23, depthMm: 700 });
    expect(usePlannerStore.getState().document.objects[0]).toMatchObject({
      rotationDeg: 90,
      depthMm: document.room.wallThicknessMm,
    });
    usePlannerStore.getState().duplicateSelection();
    expect(usePlannerStore.getState().document.objects).toHaveLength(2);
    for (const object of usePlannerStore.getState().document.objects)
      expect(object.positionMm.x).toBe(4800);
    usePlannerStore.getState().undo();
    expect(usePlannerStore.getState().document.objects).toHaveLength(1);
  });
});
