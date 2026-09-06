import { getObjectDefaultSize } from './catalog';
import type {
  PlanDocument,
  PlanGroup,
  PlanObject,
  PointMm,
} from './plan-document';
import { getObjectsSelectionBounds, objectsOverlap } from './selection';

function touch(document: PlanDocument): PlanDocument {
  return { ...document, updatedAt: new Date().toISOString() };
}

export type ObjectPositionAction =
  | 'bring-forward'
  | 'send-backward'
  | 'bring-to-front'
  | 'send-to-back';

export function positionOverlappingObjects(
  document: PlanDocument,
  objectIds: string[],
  action: ObjectPositionAction,
): PlanDocument {
  const ids = new Set(objectIds);
  if (ids.size === 0) return document;

  const objects = document.objects;
  const selected = objects.filter((object) => ids.has(object.id));
  if (selected.length === 0) return document;

  const selectedIndices = selected.map((object) => objects.indexOf(object));
  const backmostSelectedIndex = Math.min(...selectedIndices);
  const frontmostSelectedIndex = Math.max(...selectedIndices);
  const overlappingCandidates = objects
    .map((object, index) => ({ object, index }))
    .filter(
      ({ object }) =>
        !ids.has(object.id) &&
        selected.some((selectedObject) =>
          objectsOverlap(selectedObject, object),
        ),
    );
  if (overlappingCandidates.length === 0) return document;

  const candidate =
    action === 'bring-forward'
      ? overlappingCandidates.find(
          ({ index }) => index > frontmostSelectedIndex,
        )
      : action === 'send-backward'
        ? overlappingCandidates.findLast(
            ({ index }) => index < backmostSelectedIndex,
          )
        : action === 'bring-to-front'
          ? overlappingCandidates.at(-1)
          : overlappingCandidates[0];
  if (!candidate) return document;

  if (
    (action === 'bring-to-front' && backmostSelectedIndex > candidate.index) ||
    (action === 'send-to-back' && frontmostSelectedIndex < candidate.index)
  ) {
    return document;
  }

  const remaining = objects.filter((object) => !ids.has(object.id));
  const candidateIndex = remaining.findIndex(
    (object) => object.id === candidate.object.id,
  );
  const insertAfter = action === 'bring-forward' || action === 'bring-to-front';
  const insertionIndex = candidateIndex + (insertAfter ? 1 : 0);
  const reordered = [
    ...remaining.slice(0, insertionIndex),
    ...selected,
    ...remaining.slice(insertionIndex),
  ];
  return touch({ ...document, objects: reordered });
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

function selectedUnlockedObjects(
  document: PlanDocument,
  objectIds: string[],
): PlanObject[] {
  const ids = new Set(objectIds);
  return document.objects.filter(
    (object) => ids.has(object.id) && !object.locked,
  );
}

function selectionCentre(objects: PlanObject[]): PointMm | null {
  const bounds = getObjectsSelectionBounds(objects);
  if (!bounds) return null;
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };
}

export function scaleObjects(
  document: PlanDocument,
  objectIds: string[],
  factor: number,
  baseline?: PlanObject[],
): PlanDocument {
  const source = baseline ? { ...document, objects: baseline } : document;
  const selected = selectedUnlockedObjects(source, objectIds);
  const centre = selectionCentre(selected);
  if (!centre || !Number.isFinite(factor) || factor <= 0) return document;
  const ids = new Set(selected.map((object) => object.id));

  return touch({
    ...document,
    objects: document.objects.map((current) => {
      const object =
        selected.find((object) => object.id === current.id) ?? current;
      return ids.has(current.id) && !current.locked
        ? {
            ...current,
            positionMm: {
              x: Math.round(
                centre.x + (object.positionMm.x - centre.x) * factor,
              ),
              y: Math.round(
                centre.y + (object.positionMm.y - centre.y) * factor,
              ),
            },
            widthMm: Math.max(1, Math.round(object.widthMm * factor)),
            depthMm: Math.max(1, Math.round(object.depthMm * factor)),
          }
        : current;
    }),
  });
}

export function rotateObjects(
  document: PlanDocument,
  objectIds: string[],
  deltaDeg: number,
  baseline?: PlanObject[],
): PlanDocument {
  const selected = selectedUnlockedObjects(
    baseline ? { ...document, objects: baseline } : document,
    objectIds,
  );
  const centre = selectionCentre(selected);
  if (!centre || !Number.isFinite(deltaDeg) || (deltaDeg === 0 && !baseline))
    return document;
  const ids = new Set(selected.map((object) => object.id));
  const radians = (deltaDeg * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);

  return touch({
    ...document,
    objects: document.objects.map((current) => {
      if (!ids.has(current.id) || current.locked) return current;
      const object = selected.find((object) => object.id === current.id)!;
      const relativeX = object.positionMm.x - centre.x;
      const relativeY = object.positionMm.y - centre.y;
      return {
        ...current,
        positionMm: {
          x: Math.round(centre.x + relativeX * cosine - relativeY * sine),
          y: Math.round(centre.y + relativeX * sine + relativeY * cosine),
        },
        rotationDeg: object.rotationDeg + deltaDeg,
      };
    }),
  });
}

export function mirrorObjects(
  document: PlanDocument,
  objectIds: string[],
  axis: 'horizontal' | 'vertical',
): PlanDocument {
  const selected = selectedUnlockedObjects(document, objectIds);
  const centre = selectionCentre(selected);
  if (!centre) return document;
  const ids = new Set(selected.map((object) => object.id));

  return touch({
    ...document,
    objects: document.objects.map((object) => {
      if (!ids.has(object.id)) return object;
      if (axis === 'horizontal') {
        return {
          ...object,
          positionMm: {
            x: Math.round(centre.x * 2 - object.positionMm.x),
            y: object.positionMm.y,
          },
          rotationDeg: -object.rotationDeg || 0,
          mirroredHorizontally: !object.mirroredHorizontally,
        };
      }
      return {
        ...object,
        positionMm: {
          x: object.positionMm.x,
          y: Math.round(centre.y * 2 - object.positionMm.y),
        },
        rotationDeg: -object.rotationDeg || 0,
        mirroredVertically: !object.mirroredVertically,
      };
    }),
  });
}

export function setObjectsLocked(
  document: PlanDocument,
  objectIds: string[],
  locked: boolean,
): PlanDocument {
  const ids = new Set(objectIds);
  return touch({
    ...document,
    objects: document.objects.map((object) =>
      ids.has(object.id) ? { ...object, locked } : object,
    ),
  });
}

export function createObjectGroup(
  document: PlanDocument,
  objectIds: string[],
  groupId: string,
  name: string,
): PlanDocument {
  const existingObjectIds = new Set(
    document.objects.map((object) => object.id),
  );
  const requestedIds = new Set(
    objectIds.filter((id) => existingObjectIds.has(id)),
  );
  const absorbedGroups = document.groups.filter((group) =>
    group.objectIds.some((id) => requestedIds.has(id)),
  );
  if (
    absorbedGroups.length === 1 &&
    absorbedGroups[0].objectIds.length === requestedIds.size &&
    absorbedGroups[0].objectIds.every((id) => requestedIds.has(id))
  ) {
    return document;
  }
  for (const group of absorbedGroups) {
    for (const id of group.objectIds) requestedIds.add(id);
  }
  if (requestedIds.size < 2) return document;
  const absorbedGroupIds = new Set(absorbedGroups.map((group) => group.id));

  return touch({
    ...document,
    groups: [
      ...document.groups.filter((group) => !absorbedGroupIds.has(group.id)),
      { id: groupId, name, objectIds: [...requestedIds] },
    ],
  });
}

export function ungroupObjects(
  document: PlanDocument,
  objectIds: string[],
): PlanDocument {
  const ids = new Set(objectIds);
  const groups = document.groups.filter(
    (group) => !group.objectIds.some((id) => ids.has(id)),
  );
  return groups.length === document.groups.length
    ? document
    : touch({ ...document, groups });
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
      | 'name'
      | 'positionMm'
      | 'rotationDeg'
      | 'widthMm'
      | 'depthMm'
      | 'heightMm'
      | 'color'
      | 'defaultSizeMm'
      | 'blueprintProfile'
      | 'shape'
      | 'locked'
      | 'mirroredHorizontally'
      | 'mirroredVertically'
    >
  >,
): PlanDocument {
  return touch({
    ...document,
    objects: document.objects.map((object) =>
      object.id === objectId
        ? { ...object, defaultSizeMm: getObjectDefaultSize(object), ...patch }
        : object,
    ),
  });
}

export function updateRoom(
  document: PlanDocument,
  room: PlanDocument['room'],
): PlanDocument {
  return touch({ ...document, room });
}

export function deleteObjects(
  document: PlanDocument,
  objectIds: string[],
): PlanDocument {
  const ids = new Set(objectIds);
  const objects = document.objects.filter(
    (object) => !ids.has(object.id) || object.locked,
  );
  const remainingIds = new Set(objects.map((object) => object.id));
  const groups = document.groups
    .map((group) => ({
      ...group,
      objectIds: group.objectIds.filter((id) => remainingIds.has(id)),
    }))
    .filter((group) => group.objectIds.length >= 2);
  return touch({
    ...document,
    objects,
    groups,
  });
}

export function duplicateObjects(
  document: PlanDocument,
  objectIds: string[],
  createObjectId: (object: PlanObject) => string,
  createGroupId: (group: PlanGroup) => string = (group) => `${group.id}-copy`,
): { document: PlanDocument; duplicatedIds: string[] } {
  const ids = new Set(objectIds);
  const copiedByOriginalId = new Map<string, PlanObject>();
  const copies = document.objects
    .filter((object) => ids.has(object.id))
    .map((object) => {
      const copy = {
        ...object,
        id: createObjectId(object),
        name: `${object.name} copy`,
        defaultSizeMm: getObjectDefaultSize(object),
        positionMm: {
          x: object.positionMm.x + 100,
          y: object.positionMm.y + 100,
        },
        locked: false,
      };
      copiedByOriginalId.set(object.id, copy);
      return copy;
    });
  const copiedGroups = document.groups
    .filter((group) =>
      group.objectIds.every((id) => copiedByOriginalId.has(id)),
    )
    .map((group) => ({
      id: createGroupId(group),
      name: `${group.name} copy`,
      objectIds: group.objectIds.map((id) => copiedByOriginalId.get(id)!.id),
    }));

  return {
    document: touch({
      ...document,
      objects: [...document.objects, ...copies],
      groups: [...document.groups, ...copiedGroups],
    }),
    duplicatedIds: copies.map((object) => object.id),
  };
}
