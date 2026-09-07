import { createPopulatedPlan } from '../../../tests/fixtures/populated-plan';
import { insideRoomBounds } from '../domain/room-measurements';
import { beforeEach, describe, expect, it } from 'vitest';
import { usePlannerStore } from './planner-store';

function resetStore() {
  usePlannerStore.setState({
    document: createPopulatedPlan(),
    selectedIds: [],
    selectedCornerIndex: null,
    past: [],
    future: [],
    tool: 'select',
    roomGeometryError: null,
  });
}

describe('polygon room editor state', () => {
  beforeEach(resetStore);

  it('adds a corner to a wall as one undoable command', () => {
    usePlannerStore.getState().insertCorner(0);

    expect(usePlannerStore.getState().document.room.boundary).toHaveLength(5);
    expect(usePlannerStore.getState().selectedCornerIndex).toBe(1);
    expect(usePlannerStore.getState().past).toHaveLength(1);

    usePlannerStore.getState().undo();
    expect(usePlannerStore.getState().document.room.boundary).toHaveLength(4);
  });

  it('rejects a corner move that crosses another wall', () => {
    const original = usePlannerStore.getState().document.room.boundary;
    const accepted = usePlannerStore
      .getState()
      .moveCorner(1, { x: 1000, y: 4000 });

    expect(accepted).toBe(false);
    expect(usePlannerStore.getState().document.room.boundary).toEqual(original);
    expect(usePlannerStore.getState().roomGeometryError).not.toBeNull();
  });

  it('scales an existing polygon without dropping its corners', () => {
    usePlannerStore.getState().insertCorner(1);
    usePlannerStore.getState().moveCorner(2, { x: 3600, y: 1500 });
    const before = usePlannerStore.getState().document.room.boundary.length;

    const accepted = usePlannerStore.getState().updateRoomSettings({
      name: 'Studio',
      widthMm: 6000,
      depthMm: 4200,
      wallThicknessMm: 140,
    });

    const state = usePlannerStore.getState();
    expect(accepted).toBe(true);
    expect(state.document.room.boundary).toHaveLength(before);
    expect(state.document.room.name).toBe('Studio');
    expect(state.document.room.wallThicknessMm).toBe(140);
  });

  it('rounds resolved corner coordinates to centimetres', () => {
    usePlannerStore.getState().updatePlannerSettings({
      units: 'm',
      gridSizeMm: 250,
      snapSizeMm: 25,
    });

    usePlannerStore.getState().moveCorner(1, { x: 4771, y: 24 });

    expect(usePlannerStore.getState().document.room.boundary[1]).toEqual({
      x: 4770,
      y: 20,
    });
  });

  it('still snaps wall corners to centimetres when snapping is turned off', () => {
    const state = usePlannerStore.getState();
    state.updatePlannerSettings({
      units: 'm',
      gridSizeMm: 100,
      snapSizeMm: 50,
      snapEnabled: false,
    });

    usePlannerStore.getState().moveCorner(1, { x: 4771, y: 24 });

    expect(usePlannerStore.getState().document.room.boundary[1]).toEqual({
      x: 4770,
      y: 20,
    });
  });

  it('keeps grid and snap settings outside undo and redo history', () => {
    usePlannerStore.getState().selectObject('sofa-1');
    usePlannerStore.getState().updateSelectedObject({ widthMm: 2200 });
    expect(usePlannerStore.getState().past).toHaveLength(1);

    usePlannerStore.getState().updatePlannerSettings({
      units: 'm',
      gridSizeMm: 200,
      snapSizeMm: 50,
      gridEnabled: false,
      snapEnabled: false,
    });

    expect(usePlannerStore.getState().past).toHaveLength(1);
    usePlannerStore.getState().undo();
    expect(usePlannerStore.getState().document.gridSizeMm).toBe(200);
    expect(usePlannerStore.getState().document.snapSizeMm).toBe(50);
    expect(usePlannerStore.getState().document.gridEnabled).toBe(false);
    expect(usePlannerStore.getState().document.snapEnabled).toBe(false);
    expect(
      usePlannerStore
        .getState()
        .document.objects.find((object) => object.id === 'sofa-1')?.widthMm,
    ).toBe(2100);

    usePlannerStore.getState().redo();
    expect(usePlannerStore.getState().document.gridSizeMm).toBe(200);
    expect(usePlannerStore.getState().document.snapSizeMm).toBe(50);
    expect(usePlannerStore.getState().document.gridEnabled).toBe(false);
    expect(usePlannerStore.getState().document.snapEnabled).toBe(false);
  });

  it('selects multiple objects without creating edit history', () => {
    usePlannerStore.getState().selectObjects(['sofa-1']);

    expect(usePlannerStore.getState().selectedIds).toEqual(['sofa-1']);
    expect(usePlannerStore.getState().past).toEqual([]);

    usePlannerStore.getState().selectObjects(['table-1'], true);
    usePlannerStore.getState().selectObjects(['missing-object'], true);
    expect(usePlannerStore.getState().selectedIds).toEqual([
      'sofa-1',
      'table-1',
    ]);
  });

  it('creates a persistent group that selects and moves as one unit', () => {
    const store = usePlannerStore.getState();
    store.selectObjects(['sofa-1', 'table-1']);
    usePlannerStore.getState().groupSelection();

    expect(usePlannerStore.getState().document.groups).toHaveLength(1);
    expect(usePlannerStore.getState().past).toHaveLength(1);

    usePlannerStore.getState().clearSelection();
    usePlannerStore.getState().selectObject('sofa-1');
    expect(usePlannerStore.getState().selectedIds).toEqual([
      'sofa-1',
      'table-1',
    ]);

    usePlannerStore.getState().moveSelectionTo('sofa-1', { x: 1550, y: 1100 });
    expect(usePlannerStore.getState().document.objects[0].positionMm).toEqual({
      x: 1550,
      y: 1100,
    });
    expect(usePlannerStore.getState().document.objects[1].positionMm).toEqual({
      x: 3550,
      y: 2450,
    });
  });

  it('ungroups selected objects without changing the selection', () => {
    usePlannerStore.getState().selectObjects(['sofa-1', 'table-1']);
    usePlannerStore.getState().groupSelection();
    usePlannerStore.getState().ungroupSelection();

    expect(usePlannerStore.getState().document.groups).toEqual([]);
    expect(usePlannerStore.getState().selectedIds).toEqual([
      'sofa-1',
      'table-1',
    ]);
  });

  it('locks and transforms a multi-object selection as undoable commands', () => {
    usePlannerStore.getState().selectObjects(['sofa-1', 'table-1']);
    usePlannerStore.getState().rotateSelection(90);
    expect(
      usePlannerStore
        .getState()
        .document.objects.map((object) => object.rotationDeg),
    ).toEqual([90, 90]);

    usePlannerStore.getState().setSelectionLocked(true);
    expect(
      usePlannerStore
        .getState()
        .document.objects.every((object) => object.locked),
    ).toBe(true);

    usePlannerStore.getState().undo();
    expect(
      usePlannerStore
        .getState()
        .document.objects.every((object) => !object.locked),
    ).toBe(true);
  });

  it('creates and opens rooms without carrying edit history across them', () => {
    usePlannerStore.getState().createNewRoom('Office');
    const office = usePlannerStore.getState().document;

    expect(office.room.name).toBe('Office');
    expect(office.objects).toEqual([]);
    expect(usePlannerStore.getState().past).toEqual([]);

    usePlannerStore.getState().openRoom(createPopulatedPlan());
    expect(usePlannerStore.getState().document.room.name).toBe('Living room');
    expect(usePlannerStore.getState().past).toEqual([]);
  });

  it('clears objects and resets the room as one undoable action', () => {
    usePlannerStore.getState().moveCorner(1, { x: 4200, y: 300 });
    const boundaryBeforeClear =
      usePlannerStore.getState().document.room.boundary;

    usePlannerStore.getState().clearCanvas();

    expect(usePlannerStore.getState().document.objects).toEqual([]);
    expect(usePlannerStore.getState().document.room.boundary).toEqual(
      createPopulatedPlan().room.boundary,
    );

    usePlannerStore.getState().undo();
    expect(usePlannerStore.getState().document.room.boundary).toEqual(
      boundaryBeforeClear,
    );
    expect(usePlannerStore.getState().document.objects).toHaveLength(2);
  });

  it('updates object mirroring through the contextual object patch', () => {
    usePlannerStore.getState().selectObject('sofa-1');
    usePlannerStore
      .getState()
      .updateSelectedObject({ mirroredHorizontally: true });

    expect(
      usePlannerStore
        .getState()
        .document.objects.find((object) => object.id === 'sofa-1')
        ?.mirroredHorizontally,
    ).toBe(true);
  });

  it('positions an overlapping selected object as one undoable change', () => {
    const source = createPopulatedPlan();
    usePlannerStore.setState({
      document: {
        ...source,
        objects: source.objects.map((object) =>
          object.id === 'table-1'
            ? { ...object, positionMm: source.objects[0].positionMm }
            : object,
        ),
      },
    });
    usePlannerStore.getState().selectObject('sofa-1');
    usePlannerStore.getState().positionSelection('bring-to-front');

    expect(
      usePlannerStore.getState().document.objects.map((object) => object.id),
    ).toEqual(['table-1', 'sofa-1']);
    expect(usePlannerStore.getState().selectedIds).toEqual(['sofa-1']);
    expect(usePlannerStore.getState().past).toHaveLength(1);

    usePlannerStore.getState().undo();
    expect(
      usePlannerStore.getState().document.objects.map((object) => object.id),
    ).toEqual(['sofa-1', 'table-1']);
  });
});

describe('numeric edit transactions', () => {
  beforeEach(() => {
    resetStore();
    usePlannerStore.setState({ editStart: null, editRecordsHistory: false });
    usePlannerStore.getState().selectObject('sofa-1');
  });
  it('commits a long scrub as one undo entry', () => {
    const original = usePlannerStore.getState().document;
    usePlannerStore.getState().beginEdit();
    for (let widthMm = 2200; widthMm < 2400; widthMm++)
      usePlannerStore.getState().updateSelectedObject({ widthMm });
    expect(usePlannerStore.getState().past).toHaveLength(0);
    usePlannerStore.getState().finishEdit();
    expect(usePlannerStore.getState().past).toHaveLength(1);
    usePlannerStore.getState().undo();
    expect(usePlannerStore.getState().document).toEqual(original);
  });
  it('cancels previews exactly without touching undo history', () => {
    const original = usePlannerStore.getState().document;
    usePlannerStore.getState().beginEdit();
    usePlannerStore.getState().updateSelectedObject({ widthMm: 3400 });
    usePlannerStore.getState().cancelEdit();
    expect(usePlannerStore.getState().document).toBe(original);
    expect(usePlannerStore.getState().past).toHaveLength(0);
  });
  it('does not record a click without an edit', () => {
    usePlannerStore.getState().beginEdit();
    usePlannerStore.getState().finishEdit();
    expect(usePlannerStore.getState().past).toHaveLength(0);
  });
  it('restores preferences on cancellation without changing historical plans', () => {
    usePlannerStore.getState().updateSelectedObject({ widthMm: 2500 });
    const past = usePlannerStore.getState().past;
    usePlannerStore.getState().beginEdit();
    usePlannerStore
      .getState()
      .updatePlannerSettings({ units: 'm', gridSizeMm: 200, snapSizeMm: 100 });
    usePlannerStore.getState().cancelEdit();
    expect(usePlannerStore.getState().document.gridSizeMm).toBe(100);
    expect(usePlannerStore.getState().past).toEqual(past);
  });
});

it('finishes the previous object edit when the selection changes', () => {
  resetStore();
  const state = usePlannerStore.getState();
  state.selectObject('sofa-1');
  state.beginEdit();
  state.updateSelectedObject({ widthMm: 2500 });
  state.selectObject('table-1');
  expect(usePlannerStore.getState().editStart).toBeNull();
  expect(usePlannerStore.getState().past).toHaveLength(1);
  expect(usePlannerStore.getState().selectedIds).toEqual(['table-1']);
});

it('accepts tape-measured inside room dimensions and preserves them when wall thickness changes', () => {
  resetStore();
  expect(
    usePlannerStore.getState().updateRoomSettings({
      name: 'Inside',
      widthMm: 4000,
      depthMm: 3000,
      wallThicknessMm: 200,
      inside: true,
    }),
  ).toBe(true);
  expect(
    insideRoomBounds(usePlannerStore.getState().document.room),
  ).toMatchObject({ width: 4000, height: 3000 });
  expect(
    usePlannerStore.getState().updateRoomSettings({
      name: 'Inside',
      widthMm: 4000,
      depthMm: 3000,
      wallThicknessMm: 300,
      inside: true,
    }),
  ).toBe(true);
  expect(
    insideRoomBounds(usePlannerStore.getState().document.room),
  ).toMatchObject({ width: 4000, height: 3000 });
});

it('keeps millimetre corner precision for short walls with snapping disabled and supports undo', () => {
  resetStore();
  const document = usePlannerStore.getState().document;
  const boundary = [
    { x: 0, y: 0 },
    { x: 800, y: 0 },
    { x: 800, y: 2000 },
    { x: 0, y: 2000 },
  ];
  usePlannerStore.setState({
    document: {
      ...document,
      snapEnabled: false,
      room: { ...document.room, boundary },
    },
  });
  expect(usePlannerStore.getState().moveCorner(1, { x: 817.3, y: 23.6 })).toBe(
    true,
  );
  expect(usePlannerStore.getState().document.room.boundary[1]).toEqual({
    x: 817,
    y: 24,
  });
  usePlannerStore.getState().undo();
  expect(usePlannerStore.getState().document.room.boundary).toEqual(boundary);
});
