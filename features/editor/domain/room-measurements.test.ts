import { describe, expect, it } from 'vitest';
import { createStarterPlan } from './plan-document';
import {
  rectangularInsideSize,
  insideWallLengths,
  insideRoomBounds,
} from './room-measurements';

describe('inside room measurements', () => {
  it('subtracts two half walls regardless of rectangle winding or origin', () => {
    const room = createStarterPlan().room;
    expect(rectangularInsideSize(room)).toEqual({ width: 4680, depth: 3480 });
    room.boundary = room.boundary
      .reverse()
      .map((p) => ({ x: p.x - 1000, y: p.y + 500 }));
    expect(rectangularInsideSize(room)).toEqual({ width: 4680, depth: 3480 });
  });
  it('does not mistake an angled room or impossible interior for usable rectangular space', () => {
    const room = createStarterPlan().room;
    room.boundary[0].x += 400;
    expect(rectangularInsideSize(room)).toBeNull();
    const narrow = createStarterPlan().room;
    narrow.wallThicknessMm = 4000;
    expect(rectangularInsideSize(narrow)).toBeNull();
  });
});

it('measures actual mitered inside faces of convex and concave corners', () => {
  const room = createStarterPlan().room;
  expect(insideWallLengths(room)).toEqual([4680, 3480, 4680, 3480]);
  room.boundary = [
    { x: 0, y: 0 },
    { x: 4000, y: 0 },
    { x: 4000, y: 1500 },
    { x: 4200, y: 1500 },
    { x: 4200, y: 3000 },
    { x: 0, y: 3000 },
  ];
  expect(insideWallLengths(room)).toEqual([3880, 1500, 200, 1380, 4080, 2880]);
  expect(
    insideWallLengths({ ...room, boundary: [...room.boundary].reverse() }),
  ).toEqual([4080, 1380, 200, 1500, 3880, 2880]);
});

it('uses the corner angle for diagonal inside dimensions', () => {
  const room = createStarterPlan().room;
  room.boundary = [
    { x: 0, y: 0 },
    { x: 3000, y: 4000 },
    { x: -1000, y: 7000 },
    { x: -4000, y: 3000 },
  ];
  expect(insideWallLengths(room)).toEqual([4880, 4880, 4880, 4880]);
  expect(insideRoomBounds(room).width).toBeGreaterThan(0);
});

it('allows short inside faces without inventing lengths for collapsed ones', () => {
  const room = createStarterPlan().room;
  const boundary = [
    { x: 0, y: 0 },
    { x: 148, y: 0 },
    { x: 148, y: 3600 },
    { x: 0, y: 3600 },
  ];
  expect(insideWallLengths({ ...room, boundary })[0]).toBe(28);
  const collapsed = boundary.map((point) => ({
    ...point,
    x: point.x === 148 ? 100 : point.x,
  }));
  expect(insideWallLengths({ ...room, boundary: collapsed })[0]).toBe(0);
});
