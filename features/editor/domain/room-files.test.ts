import { describe, expect, it } from 'vitest';
import { createStarterPlan } from './plan-document';
import {
  parseRoomFile,
  roomFileName,
  roomImageFileName,
  serializeRoom,
} from './room-files';

describe('room files', () => {
  it('round-trips a validated room document', () => {
    const document = createStarterPlan();
    expect(parseRoomFile(serializeRoom(document))).toEqual([document]);
  });

  it('accepts a bundle of rooms', () => {
    const first = createStarterPlan();
    const second = { ...createStarterPlan(), id: 'office-plan' };
    expect(parseRoomFile(JSON.stringify([first, second]))).toHaveLength(2);
  });

  it('creates a filesystem-safe room filename', () => {
    expect(roomFileName('Studio / Office')).toBe('studio-office.roomplan.json');
    expect(roomImageFileName('Studio / Office')).toBe('studio-office.png');
    expect(roomImageFileName('   ')).toBe('room.png');
  });
});

it('imports independent copies and remaps group references', async () => {
  const { copyImportedRoom } = await import('./room-files');
  const original = createStarterPlan();
  original.groups = [
    {
      id: 'group',
      name: 'Furniture',
      objectIds: original.objects.map((object) => object.id),
    },
  ];
  const first = copyImportedRoom(original);
  const second = copyImportedRoom(original);
  expect(first.id).not.toBe(original.id);
  expect(first.id).not.toBe(second.id);
  expect(first.objects[0].id).not.toBe(original.objects[0].id);
  expect(first.groups[0].objectIds).toEqual(
    first.objects.map((object) => object.id),
  );
  expect(original.room.name).toBe('Living room');
});
