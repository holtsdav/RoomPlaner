import type { PlanDocument, PlanObject, PointMm } from './plan-document';

function touch(document: PlanDocument): PlanDocument {
  return { ...document, updatedAt: new Date().toISOString() };
}

export function moveObjects(
  document: PlanDocument,
  objectIds: string[],
  deltaMm: PointMm,
): PlanDocument {
  const ids = new Set(objectIds);

  return touch({
    ...document,
    objects: document.objects.map((object) =>
      ids.has(object.id) && !object.locked
        ? {
            ...object,
            positionMm: {
              x: Math.round(object.positionMm.x + deltaMm.x),
              y: Math.round(object.positionMm.y + deltaMm.y),
            },
          }
        : object,
    ),
  });
}

export function addObject(
  document: PlanDocument,
  object: PlanObject,
): PlanDocument {
  return touch({ ...document, objects: [...document.objects, object] });
}

export function updateObject(
  document: PlanDocument,
  objectId: string,
  patch: Partial<
    Pick<
      PlanObject,
      'name' | 'positionMm' | 'rotationDeg' | 'widthMm' | 'depthMm' | 'locked'
    >
  >,
): PlanDocument {
  return touch({
    ...document,
    objects: document.objects.map((object) =>
      object.id === objectId ? { ...object, ...patch } : object,
    ),
  });
}

export function deleteObjects(
  document: PlanDocument,
  objectIds: string[],
): PlanDocument {
  const ids = new Set(objectIds);
  return touch({
    ...document,
    objects: document.objects.filter(
      (object) => !ids.has(object.id) || object.locked,
    ),
  });
}

export function duplicateObjects(
  document: PlanDocument,
  objectIds: string[],
  createObjectId: (object: PlanObject) => string,
): { document: PlanDocument; duplicatedIds: string[] } {
  const ids = new Set(objectIds);
  const copies = document.objects
    .filter((object) => ids.has(object.id))
    .map((object) => ({
      ...object,
      id: createObjectId(object),
      name: `${object.name} copy`,
      positionMm: {
        x: object.positionMm.x + 100,
        y: object.positionMm.y + 100,
      },
      locked: false,
    }));

  return {
    document: touch({ ...document, objects: [...document.objects, ...copies] }),
    duplicatedIds: copies.map((object) => object.id),
  };
}
