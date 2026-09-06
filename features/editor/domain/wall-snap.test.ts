import { expect, it } from 'vitest';
import { createStarterPlan } from './plan-document';
import { snapWallCorner, snapWallMillimetres } from './wall-snap';

it('switches precision at one metre', () => {
  expect(
    [284.4, 284.6, 999, 1000, 1254, 1256].map(snapWallMillimetres),
  ).toEqual([284, 285, 999, 1000, 1250, 1260]);
});

it('uses millimetres when either adjoining inside wall is short, regardless of room origin', () => {
  const room = createStarterPlan().room;
  room.boundary = [
    { x: 5000, y: 5000 },
    { x: 5800, y: 5000 },
    { x: 5800, y: 7000 },
    { x: 5000, y: 7000 },
  ];
  expect(snapWallCorner(room, 1, { x: 5817.3, y: 5023.6 })).toEqual({
    x: 5817,
    y: 5024,
  });
  expect(
    snapWallCorner(createStarterPlan().room, 1, { x: 4771.3, y: 24.6 }),
  ).toEqual({ x: 4770, y: 20 });
});
