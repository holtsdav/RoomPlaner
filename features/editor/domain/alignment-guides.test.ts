import { createPopulatedPlan } from '../../../tests/fixtures/populated-plan';
import { describe, expect, it } from 'vitest';
import { type PlanObject } from './plan-document';
import {
  getCornerAlignmentSnap,
  getObjectAlignmentSnap,
} from './alignment-guides';

function rectangle(
  id: string,
  positionMm: { x: number; y: number },
  overrides: Partial<PlanObject> = {},
): PlanObject {
  return {
    ...createPopulatedPlan().objects[0],
    id,
    widthMm: 200,
    depthMm: 100,
    positionMm,
    ...overrides,
  };
}

describe('object alignment snapping', () => {
  it('snaps matching edges and returns a vertical guide spanning both objects', () => {
    const movingObject = rectangle('moving', { x: 0, y: 0 });
    const target = rectangle('target', { x: 500, y: 300 });

    expect(
      getObjectAlignmentSnap({
        movingObject,
        proposedPosition: { x: 508, y: 0 },
        objects: [movingObject, target],
        thresholdMm: 10,
      }),
    ).toEqual({
      position: { x: 500, y: 0 },
      guides: [{ axis: 'x', position: 400, start: -50, end: 350 }],
      snappedAxes: ['x'],
    });
  });

  it('snaps an edge to another object edge on one axis only', () => {
    const movingObject = rectangle('moving', { x: 0, y: 0 });
    const target = rectangle('target', { x: 500, y: 300 });

    const result = getObjectAlignmentSnap({
      movingObject,
      proposedPosition: { x: 294, y: 47 },
      objects: [movingObject, target],
      thresholdMm: 10,
    });

    expect(result.position).toEqual({ x: 300, y: 47 });
    expect(result.guides).toEqual([
      { axis: 'x', position: 400, start: -3, end: 350 },
    ]);
    expect(result.snappedAxes).toEqual(['x']);
  });

  it('uses rotated visual bounds when aligning objects', () => {
    const movingObject = rectangle(
      'moving',
      { x: 0, y: 0 },
      { rotationDeg: 90 },
    );
    const target = rectangle('target', { x: 500, y: 300 });

    const result = getObjectAlignmentSnap({
      movingObject,
      proposedPosition: { x: 344, y: 300 },
      objects: [movingObject, target],
      thresholdMm: 10,
    });

    expect(result.position).toEqual({ x: 350, y: 300 });
    expect(result.guides).toEqual([
      { axis: 'x', position: 400, start: 200, end: 400 },
      { axis: 'y', position: 300, start: 294, end: 600 },
    ]);
    expect(result.snappedAxes).toEqual(['x', 'y']);
  });

  it('ignores every object in the active selection', () => {
    const movingObject = rectangle('moving', { x: 0, y: 0 });
    const selectedCompanion = rectangle('selected', { x: 300, y: 0 });

    expect(
      getObjectAlignmentSnap({
        movingObject,
        proposedPosition: { x: 8, y: 6 },
        objects: [movingObject, selectedCompanion],
        excludedIds: ['moving', 'selected'],
        thresholdMm: 10,
      }),
    ).toEqual({ position: { x: 8, y: 6 }, guides: [], snappedAxes: [] });
  });

  it('does not snap outside the threshold', () => {
    const movingObject = rectangle('moving', { x: 0, y: 0 });
    const target = rectangle('target', { x: 500, y: 300 });

    expect(
      getObjectAlignmentSnap({
        movingObject,
        proposedPosition: { x: 480, y: 20 },
        objects: [movingObject, target],
        thresholdMm: 10,
      }),
    ).toEqual({ position: { x: 480, y: 20 }, guides: [], snappedAxes: [] });
  });

  it('snaps the object footprint to the inside edges of room walls', () => {
    const plan = createPopulatedPlan();
    const movingObject = rectangle('moving', { x: 0, y: 0 });

    expect(
      getObjectAlignmentSnap({
        movingObject,
        proposedPosition: { x: 166, y: 114 },
        objects: [movingObject],
        room: plan.room,
        thresholdMm: 10,
      }),
    ).toEqual({
      position: { x: 160, y: 110 },
      guides: [
        { axis: 'x', position: 60, start: 0, end: 3600 },
        { axis: 'y', position: 60, start: 0, end: 4800 },
      ],
      snappedAxes: ['x', 'y'],
    });
  });

  it('snaps an object centre to both room centre axes', () => {
    const plan = createPopulatedPlan();
    const movingObject = rectangle('moving', { x: 0, y: 0 });

    expect(
      getObjectAlignmentSnap({
        movingObject,
        proposedPosition: { x: 2394, y: 1808 },
        objects: [movingObject],
        room: plan.room,
        thresholdMm: 10,
      }),
    ).toEqual({
      position: { x: 2400, y: 1800 },
      guides: [
        { axis: 'x', position: 2400, start: 0, end: 3600 },
        { axis: 'y', position: 1800, start: 0, end: 4800 },
      ],
      snappedAxes: ['x', 'y'],
    });
  });

  it('snaps perpendicular to an angled wall and returns its guide line', () => {
    const movingObject = rectangle('moving', { x: 0, y: 0 });
    const room = {
      ...createPopulatedPlan().room,
      wallThicknessMm: 100,
      boundary: [
        { x: 0, y: 500 },
        { x: 500, y: 0 },
        { x: 1000, y: 500 },
        { x: 500, y: 1000 },
      ],
    };

    const result = getObjectAlignmentSnap({
      movingObject,
      proposedPosition: { x: 114, y: 614 },
      objects: [movingObject],
      room,
      thresholdMm: 10,
    });

    expect(result.position).toEqual({ x: 110, y: 610 });
    expect(result.snappedAxes).toEqual(['x', 'y']);
    expect(result.guides[0]?.axis).toBe('free');
  });
});

describe('room corner alignment snapping', () => {
  it('snaps a corner to another corner on each axis', () => {
    const boundary = createPopulatedPlan().room.boundary;

    expect(
      getCornerAlignmentSnap({
        proposedPosition: { x: 4794, y: 3592 },
        boundary,
        cornerIndex: 2,
        objects: [],
        thresholdMm: 10,
      }),
    ).toEqual({
      position: { x: 4800, y: 3600 },
      guides: [
        { axis: 'x', position: 4800, start: 0, end: 3600 },
        { axis: 'y', position: 3600, start: 0, end: 4800 },
      ],
      snappedAxes: ['x', 'y'],
    });
  });

  it('prefers room corners over a closer furniture edge', () => {
    const result = getCornerAlignmentSnap({
      proposedPosition: { x: 4794, y: 3608 },
      boundary: createPopulatedPlan().room.boundary,
      cornerIndex: 2,
      objects: [rectangle('near-wall', { x: 4700, y: 3559 })],
      thresholdMm: 10,
    });

    expect(result.position).toEqual({ x: 4800, y: 3600 });
    expect(result.guides).toEqual([
      { axis: 'x', position: 4800, start: 0, end: 3600 },
      { axis: 'y', position: 3600, start: 0, end: 4800 },
    ]);
  });

  it('snaps a corner to object edges and centres', () => {
    const target = rectangle('target', { x: 500, y: 300 });

    expect(
      getCornerAlignmentSnap({
        proposedPosition: { x: 506, y: 344 },
        boundary: [
          { x: 0, y: 0 },
          { x: 1000, y: 0 },
          { x: 1000, y: 1000 },
          { x: 0, y: 1000 },
        ],
        cornerIndex: 2,
        objects: [target],
        thresholdMm: 10,
      }),
    ).toEqual({
      position: { x: 500, y: 350 },
      guides: [
        { axis: 'x', position: 500, start: 250, end: 350 },
        { axis: 'y', position: 350, start: 400, end: 600 },
      ],
      snappedAxes: ['x', 'y'],
    });
  });
});
