import {
  createId,
  MAX_PLAN_NAME_LENGTH,
  planDocumentSchema,
  type PlanDocument,
} from './plan-document';

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROOMS = 20;

export function parseRoomFile(contents: string): PlanDocument[] {
  if (new TextEncoder().encode(contents).byteLength > MAX_IMPORT_BYTES)
    throw new Error('Import up to 5 MB at a time.');
  const parsed: unknown = JSON.parse(contents);
  const candidates = Array.isArray(parsed) ? parsed : [parsed];
  if (candidates.length === 0) throw new Error('The room file is empty.');
  if (candidates.length > MAX_IMPORT_ROOMS)
    throw new Error('Import up to 20 rooms at a time.');
  return candidates.map((candidate) => planDocumentSchema.parse(candidate));
}

export function serializeRoom(document: PlanDocument): string {
  return `${JSON.stringify(planDocumentSchema.parse(document), null, 2)}\n`;
}

function safeRoomName(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'room'
  );
}

export function roomFileName(name: string): string {
  return `${safeRoomName(name)}.roomplan.json`;
}

export function roomImageFileName(name: string): string {
  return `${safeRoomName(name)}.png`;
}

/** Imports are independent copies; an old backup never replaces local work. */
export function copyImportedRoom(
  document: PlanDocument,
  nameSuffix = ' (imported)',
): PlanDocument {
  const source = planDocumentSchema.parse(document);
  const ids = new Map(
    source.objects.map((object) => [object.id, createId('object')]),
  );
  const now = new Date().toISOString();
  return {
    ...source,
    id: createId('plan'),
    name: `${source.room.name.slice(0, MAX_PLAN_NAME_LENGTH - nameSuffix.length)}${nameSuffix}`,
    room: {
      ...source.room,
      id: createId('room'),
      name: `${source.room.name.slice(0, MAX_PLAN_NAME_LENGTH - nameSuffix.length)}${nameSuffix}`,
    },
    objects: source.objects.map((object) => ({
      ...object,
      id: ids.get(object.id)!,
    })),
    groups: source.groups.map((group) => ({
      ...group,
      id: createId('group'),
      objectIds: group.objectIds.map((id) => ids.get(id)!),
    })),
    createdAt: now,
    updatedAt: now,
  };
}
