import { describe, expect, it } from 'vitest';
import {
  createStarterPlan,
  DEFAULT_GRID_SIZE_MM,
  DEFAULT_SNAP_SIZE_MM,
  formatMeasurement,
  formatWallMeasurement,
  planDocumentSchema,
} from './plan-document';

describe('plan measurements', () => {
  it('uses centimetres for metric display values', () => {
    expect(formatMeasurement(4800, 'm')).toBe('480 cm');
    expect(formatMeasurement(1200, 'm')).toBe('120 cm');
    expect(formatMeasurement(1000, 'cm')).toBe('100 cm');
    expect(formatMeasurement(120, 'm')).toBe('12 cm');
  });

  it('uses metres only for metric walls longer than one metre', () => {
    expect(formatWallMeasurement(4800, 'm')).toBe('4.8 m');
    expect(formatWallMeasurement(1000, 'm')).toBe('100 cm');
    expect(formatWallMeasurement(800, 'cm')).toBe('80 cm');
    expect(formatWallMeasurement(1200, 'ft-in')).toBe(
      formatMeasurement(1200, 'ft-in'),
    );
  });

  it('retains sub-inch precision for imperial display values', () => {
    expect(formatMeasurement(4800, 'ft-in')).toBe('15′8.98″');
    expect(formatMeasurement(120, 'ft-in')).toBe('4.72″');
    expect(formatMeasurement(3048, 'ft-in')).toBe('10′');
    expect(formatMeasurement(2100, 'ft-in')).toBe('6′10.68″');
  });

  it('adds default grid settings when loading an older plan', () => {
    const {
      gridEnabled: _gridEnabled,
      snapEnabled: _snapEnabled,
      gridSizeMm: _grid,
      snapSizeMm: _snap,
      ...olderPlan
    } = createStarterPlan();
    const migrated = planDocumentSchema.parse(olderPlan);

    expect(migrated.gridSizeMm).toBe(DEFAULT_GRID_SIZE_MM);
    expect(migrated.snapSizeMm).toBe(DEFAULT_SNAP_SIZE_MM);
    expect(migrated.gridEnabled).toBe(true);
    expect(migrated.snapEnabled).toBe(true);
  });

  it('adds an empty group collection when loading an older plan', () => {
    const { groups: _groups, ...olderPlan } = createStarterPlan();

    expect(planDocumentSchema.parse(olderPlan).groups).toEqual([]);
  });

  it('starts with a 10 cm grid and 5 cm snapping', () => {
    const plan = createStarterPlan();

    expect(plan.gridSizeMm).toBe(100);
    expect(plan.snapSizeMm).toBe(50);
    expect(plan.gridEnabled).toBe(true);
    expect(plan.snapEnabled).toBe(true);
  });
});

describe('plan integrity', () => {
  it.each([
    [
      { x: 0, y: 0 },
      { x: 1000, y: 1000 },
      { x: 0, y: 1000 },
      { x: 1000, y: 0 },
    ],
    [
      { x: 0, y: 0 },
      { x: 1000, y: 0 },
      { x: 2000, y: 0 },
    ],
    [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 1000, y: 1000 },
    ],
  ])('rejects invalid imported boundaries %#', (...boundary) => {
    const plan = createStarterPlan();
    plan.room.boundary = boundary;
    expect(planDocumentSchema.safeParse(plan).success).toBe(false);
  });

  it('rejects duplicate objects and invalid group membership', () => {
    const plan = createStarterPlan();
    plan.objects.push({ ...plan.objects[0] });
    expect(planDocumentSchema.safeParse(plan).success).toBe(false);
    plan.objects.pop();
    for (const objectIds of [
      ['missing', 'sofa-1'],
      ['sofa-1', 'sofa-1'],
    ]) {
      plan.groups = [{ id: 'group-1', name: 'Group', objectIds }];
      expect(planDocumentSchema.safeParse(plan).success).toBe(false);
    }
    plan.groups = [
      { id: 'group-1', name: 'Group', objectIds: ['sofa-1', 'table-1'] },
      { id: 'group-2', name: 'Group', objectIds: ['sofa-1', 'table-1'] },
    ];
    expect(planDocumentSchema.safeParse(plan).success).toBe(false);
  });
});

it('uses millimetre precision below one metre and centimetres above it', () => {
  expect(formatWallMeasurement(1256, 'm')).toBe('1.26 m');
  expect(formatWallMeasurement(1254, 'm')).toBe('1.25 m');
  expect(formatWallMeasurement(999.4, 'm')).toBe('99.9 cm');
  expect(formatWallMeasurement(1000, 'm')).toBe('100 cm');
  expect(formatWallMeasurement(284, 'm')).toBe('28.4 cm');
  expect(formatWallMeasurement(286, 'm')).toBe('28.6 cm');
});
