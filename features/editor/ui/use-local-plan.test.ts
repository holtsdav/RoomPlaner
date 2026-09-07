import { createPopulatedPlan } from '../../../tests/fixtures/populated-plan';
import { beforeEach, expect, it, vi } from 'vitest';
import { usePlannerStore } from '../state/planner-store';

const { save } = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock('../persistence/local-plan-repository', () => ({
  saveLocalPlan: save,
  loadLocalPlan: vi.fn(),
}));
import { flushLocalPlan, runRoomOperation } from './use-local-plan';

beforeEach(() => {
  save.mockReset().mockResolvedValue(undefined);
  usePlannerStore.setState({
    document: createPopulatedPlan(),
    hydrated: true,
    editStart: null,
    editRecordsHistory: false,
    roomOperationPending: false,
    saveStatus: 'saving',
    past: [],
    future: [],
    selectedIds: [],
  });
});

it('flushes the latest revision if edits arrive during a write', async () => {
  let release!: () => void;
  save.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
  );
  const operation = flushLocalPlan();
  await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  usePlannerStore.getState().renameRoom('Latest room');
  release();
  await operation;
  expect(save).toHaveBeenCalledTimes(2);
  expect(save.mock.calls[1][0].room.name).toBe('Latest room');
  expect(usePlannerStore.getState().saveStatus).toBe('saved');
});

it('keeps the current room when saving before a transition fails', async () => {
  save.mockRejectedValueOnce(new Error('Storage full'));
  const transition = vi.fn();
  await expect(runRoomOperation(transition)).rejects.toThrow('Storage full');
  expect(transition).not.toHaveBeenCalled();
  expect(usePlannerStore.getState().roomOperationPending).toBe(false);
  expect(usePlannerStore.getState().saveStatus).toBe('error');
});

it('commits and saves an in-progress numeric edit before navigation', async () => {
  const state = usePlannerStore.getState();
  state.selectObject('sofa-1');
  state.beginEdit();
  state.updateSelectedObject({ widthMm: 2450 });
  await flushLocalPlan();
  expect(usePlannerStore.getState().editStart).toBeNull();
  expect(usePlannerStore.getState().past).toHaveLength(1);
  expect(save.mock.calls[0][0].objects[0].widthMm).toBe(2450);
});

it('does not save an unfinished gesture that starts during an older write', async () => {
  let release!: () => void;
  save.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
  );
  const operation = flushLocalPlan();
  await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  usePlannerStore.getState().selectObject('sofa-1');
  usePlannerStore.getState().beginEdit();
  usePlannerStore.getState().updateSelectedObject({ widthMm: 2800 });
  release();
  await Promise.resolve();
  await Promise.resolve();
  expect(save).toHaveBeenCalledTimes(1);
  usePlannerStore.getState().cancelEdit();
  await operation;
  expect(save).toHaveBeenCalledTimes(1);
  expect(usePlannerStore.getState().document.objects[0].widthMm).toBe(2100);
});
