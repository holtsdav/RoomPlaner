import {
  createStarterPlan,
  type PlanDocument,
} from '../../features/editor/domain/plan-document';

// Explicit furniture for editing tests; real rooms start empty.
export function createPopulatedPlan(): PlanDocument {
  return {
    ...createStarterPlan(),
    objects: [
      {
        id: 'sofa-1',
        name: 'Three-seat sofa',
        category: 'seating',
        shape: 'rectangle',
        positionMm: { x: 1450, y: 1000 },
        rotationDeg: 0,
        widthMm: 2100,
        depthMm: 900,
        locked: false,
        mirroredHorizontally: false,
        mirroredVertically: false,
      },
      {
        id: 'table-1',
        name: 'Round table',
        category: 'table',
        shape: 'ellipse',
        positionMm: { x: 3450, y: 2350 },
        rotationDeg: 0,
        widthMm: 1000,
        depthMm: 1000,
        locked: false,
        mirroredHorizontally: false,
        mirroredVertically: false,
      },
    ],
  };
}
