import { afterEach, expect, it, vi } from 'vitest';
import {
  readPreference,
  writePreference,
  storageNamespace,
} from './browser-storage';
afterEach(() => vi.unstubAllGlobals());
it('separates development and local state while preserving consumer keys', () => {
  expect(storageNamespace('/RoomPlanner')).toBe('room-planner');
  expect(storageNamespace('/RoomPlanner/planner')).toBe('room-planner');
  expect(storageNamespace('/dev/RoomPlanner')).toBe('room-planner-develop');
  expect(storageNamespace('/RoomPlaner')).toBe('room-planner');
  expect(storageNamespace('/dev/RoomPlaner')).toBe('room-planner-develop');
  expect(storageNamespace('/')).toBe('room-planner-local');
});
it('tolerates denied reads, writes and removal', () => {
  const denied = () => {
    throw new Error('Denied');
  };
  vi.stubGlobal('localStorage', {
    getItem: denied,
    setItem: denied,
    removeItem: denied,
  });
  expect(readPreference('room-planner-active-plan-id')).toBeNull();
  expect(() =>
    writePreference('room-planner-active-plan-id', 'room'),
  ).not.toThrow();
  expect(() =>
    writePreference('room-planner-active-plan-id', null),
  ).not.toThrow();
});
