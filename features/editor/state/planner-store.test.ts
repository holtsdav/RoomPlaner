import { beforeEach, describe, expect, it } from 'vitest';
import { createStarterPlan } from '../domain/plan-document';
import { usePlannerStore } from './planner-store';

function resetStore() {
  usePlannerStore.setState({
    document: createStarterPlan(),
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
});
