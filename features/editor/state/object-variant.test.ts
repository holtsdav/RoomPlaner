import { expect, it } from 'vitest';
import { homeOfficeCatalog, objectFromPreset } from '../domain/catalog';
import { createStarterPlan } from '../domain/plan-document';
import { usePlannerStore } from './planner-store';

it('changes a variant as one undoable edit, preserving placement and updating reset dimensions', () => {
  const variants = homeOfficeCatalog.filter(
    (preset) => preset.blueprint === 'table',
  );
  const object = {
    ...objectFromPreset(variants[0], 'office-table', { x: 1234, y: 567 }),
    rotationDeg: 45,
  };
  const document = { ...createStarterPlan(), objects: [object] };
  usePlannerStore.setState({
    document,
    selectedIds: [object.id],
    past: [],
    future: [],
    editStart: null,
  });
  const next = variants[1];
  usePlannerStore.getState().updateSelectedObject({
    name: next.name,
    widthMm: next.widthMm,
    depthMm: next.depthMm,
    heightMm: next.heightMm,
    defaultSizeMm: { widthMm: next.widthMm, depthMm: next.depthMm },
  });
  expect(usePlannerStore.getState().document.objects[0]).toMatchObject({
    positionMm: object.positionMm,
    rotationDeg: 45,
    blueprint: 'table',
    widthMm: next.widthMm,
    depthMm: next.depthMm,
    defaultSizeMm: { widthMm: next.widthMm, depthMm: next.depthMm },
  });
  expect(usePlannerStore.getState().past).toHaveLength(1);
  usePlannerStore.getState().undo();
  expect(usePlannerStore.getState().document.objects[0]).toEqual(object);
  usePlannerStore.getState().redo();
  expect(usePlannerStore.getState().document.objects[0].widthMm).toBe(
    next.widthMm,
  );
  usePlannerStore.getState().updateSelectedObject({ locked: true });
  usePlannerStore.getState().updateSelectedObject({ widthMm: 999 });
  expect(usePlannerStore.getState().document.objects[0].widthMm).toBe(
    next.widthMm,
  );
});

it('changes monitor proportions with the size variant and restores them on undo', () => {
  const small = homeOfficeCatalog.find(
    (preset) => preset.name === 'Ultrawide Monitor · 34″',
  )!;
  const large = homeOfficeCatalog.find(
    (preset) => preset.name === 'Ultrawide Monitor · 57″',
  )!;
  const object = objectFromPreset(small, 'monitor', { x: 100, y: 200 });
  usePlannerStore.setState({
    document: { ...createStarterPlan(), objects: [object] },
    selectedIds: [object.id],
    past: [],
    future: [],
    editStart: null,
  });
  usePlannerStore.getState().updateSelectedObject({
    widthMm: large.widthMm,
    depthMm: large.depthMm,
    blueprintProfile: large.blueprintProfile,
  });
  expect(
    usePlannerStore.getState().document.objects[0].blueprintProfile
      ?.curveRadiusMm,
  ).toBe(1000);
  usePlannerStore.getState().undo();
  expect(usePlannerStore.getState().document.objects[0]).toEqual(object);
});
