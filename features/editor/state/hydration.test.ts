import { beforeEach, expect, it, vi } from 'vitest';
const { load, save } = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn() }));
vi.mock('../persistence/local-plan-repository', () => ({
  loadLocalPlan: load,
  saveLocalPlan: save,
}));
import { usePlannerStore } from './planner-store';
import { createStarterPlan } from '../domain/plan-document';
beforeEach(() => {
  load.mockReset().mockResolvedValue(undefined);
  save.mockReset().mockResolvedValue(undefined);
  usePlannerStore.setState({
    document: createStarterPlan(),
    hydrated: false,
    isHydrating: false,
    saveError: null,
    editStart: null,
  });
});
it('does not claim a starter is saved until persistence completes', async () => {
  let release!: () => void;
  save.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
  );
  const hydrate = usePlannerStore.getState().hydrate();
  await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
  expect(usePlannerStore.getState().saveStatus).toBe('loading');
  release();
  await hydrate;
  expect(usePlannerStore.getState().saveStatus).toBe('saved');
  expect(usePlannerStore.getState().document.id).toBe(save.mock.calls[0][0].id);
});
it('keeps the starter editable and unsaved when its first write fails', async () => {
  save.mockRejectedValue(new Error('Quota exceeded'));
  await usePlannerStore.getState().hydrate();
  expect(usePlannerStore.getState()).toMatchObject({
    hydrated: true,
    saveStatus: 'error',
  });
  expect(usePlannerStore.getState().saveError).toContain('only in memory');
});
it('preserves an unreadable stored plan and uses a separate recovery id', async () => {
  load.mockRejectedValue(new Error('Storage denied'));
  await usePlannerStore.getState().hydrate();
  expect(save).not.toHaveBeenCalled();
  expect(usePlannerStore.getState().document.id).toMatch(/^recovery-plan-/);
  expect(usePlannerStore.getState().saveStatus).toBe('error');
});
