import { expect, it, vi } from 'vitest';
import { createStarterPlan } from '../domain/plan-document';
import { createSaveQueue } from './save-queue';

it('serializes revisions and deduplicates concurrent requests', async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const write = vi
    .fn()
    .mockImplementationOnce(() => gate)
    .mockResolvedValue(undefined);
  const save = createSaveQueue(write);
  const first = createStarterPlan();
  const second = { ...first, name: 'New name' };
  const firstSave = save(first);
  expect(save(first)).toBe(firstSave);
  const secondSave = save(second);
  await Promise.resolve();
  expect(write).toHaveBeenCalledTimes(1);
  release();
  await Promise.all([firstSave, secondSave]);
  expect(write.mock.calls.map(([plan]) => plan.name)).toEqual([
    first.name,
    second.name,
  ]);
});

it('allows retry after storage failure', async () => {
  const write = vi
    .fn()
    .mockRejectedValueOnce(new Error('Full'))
    .mockResolvedValue(undefined);
  const save = createSaveQueue(write);
  const plan = createStarterPlan();
  await expect(save(plan)).rejects.toThrow('Full');
  await save(plan);
  expect(write).toHaveBeenCalledTimes(2);
});
