import Dexie, { type EntityTable } from 'dexie';
import {
  LOCAL_PLAN_ID,
  planDocumentSchema,
  type PlanDocument,
} from '../domain/plan-document';

import { copyImportedRoom } from '../domain/room-files';

type StoredPlan = PlanDocument & { _revision?: string };
const knownRevisions = new Map<string, string | undefined>();
const revisionOf = (document: StoredPlan | undefined) =>
  document ? (document._revision ?? document.updatedAt) : undefined;
export class LocalPlanConflictError extends Error {
  constructor() {
    super(
      'This room changed in another tab. Your edits are preserved here. Save a copy to keep both versions.',
    );
    this.name = 'LocalPlanConflictError';
  }
}

const ACTIVE_PLAN_STORAGE_KEY = 'room-planner-active-plan-id';

class RoomPlannerDatabase extends Dexie {
  plans!: EntityTable<StoredPlan, 'id'>;

  constructor() {
    super('room-planner');
    this.version(1).stores({
      plans: 'id, updatedAt',
    });
  }
}

let database: RoomPlannerDatabase | undefined;

function getDatabase() {
  database ??= new RoomPlannerDatabase();
  return database;
}

export async function loadLocalPlan(): Promise<PlanDocument | undefined> {
  const activePlanId = globalThis.localStorage?.getItem(
    ACTIVE_PLAN_STORAGE_KEY,
  );
  const stored =
    (activePlanId ? await getDatabase().plans.get(activePlanId) : undefined) ??
    (await getDatabase().plans.get(LOCAL_PLAN_ID)) ??
    (await getDatabase().plans.orderBy('updatedAt').last());
  if (!stored) return undefined;
  const validated = planDocumentSchema.parse(stored);
  knownRevisions.set(validated.id, revisionOf(stored));
  return validated;
}

export async function saveLocalPlan(document: PlanDocument): Promise<void> {
  const validated = planDocumentSchema.parse(document);
  const db = getDatabase();
  const nextRevision = crypto.randomUUID();
  await db.transaction('rw', db.plans, async () => {
    const stored = await db.plans.get(validated.id);
    const expected = knownRevisions.get(validated.id);
    if (revisionOf(stored) !== expected) throw new LocalPlanConflictError();
    await db.plans.put({ ...validated, _revision: nextRevision });
  });
  knownRevisions.set(validated.id, nextRevision);
  globalThis.localStorage?.setItem(ACTIVE_PLAN_STORAGE_KEY, validated.id);
}

export async function listLocalPlans(): Promise<PlanDocument[]> {
  const stored = await getDatabase()
    .plans.orderBy('updatedAt')
    .reverse()
    .toArray();
  return stored.flatMap((document) => {
    const result = planDocumentSchema.safeParse(document);
    if (!result.success) return []; // Preserve damaged records for recovery; isolate them from healthy rooms.
    if (!knownRevisions.has(document.id))
      knownRevisions.set(document.id, revisionOf(document));
    return [result.data];
  });
}

export async function deleteLocalPlan(planId: string): Promise<void> {
  const db = getDatabase();
  await db.transaction('rw', db.plans, async () => {
    const stored = await db.plans.get(planId);
    if (revisionOf(stored) !== knownRevisions.get(planId))
      throw new LocalPlanConflictError();
    await db.plans.delete(planId);
  });
  // Retain the observed revision: any delayed save now conflicts with deletion.
  if (globalThis.localStorage?.getItem(ACTIVE_PLAN_STORAGE_KEY) === planId) {
    globalThis.localStorage.removeItem(ACTIVE_PLAN_STORAGE_KEY);
  }
}

export async function saveImportedPlans(
  documents: PlanDocument[],
  nameSuffix?: string,
): Promise<PlanDocument[]> {
  const validated = documents.map((document) =>
    copyImportedRoom(document, nameSuffix),
  );
  await getDatabase().plans.bulkAdd(validated);
  validated.forEach((document) =>
    knownRevisions.set(document.id, revisionOf(document)),
  );
  return validated;
}

/** Read the current revision when switching; activating a room is not a write. */
export async function activateLocalPlan(planId: string): Promise<PlanDocument> {
  const stored = await getDatabase().plans.get(planId);
  const document = planDocumentSchema.parse(stored);
  knownRevisions.set(planId, revisionOf(stored));
  globalThis.localStorage?.setItem(ACTIVE_PLAN_STORAGE_KEY, planId);
  return document;
}

/** Delete and choose a healthy successor in one transaction. */
export async function deleteAndActivateLocalPlan(
  planId: string,
  nextId: string,
): Promise<PlanDocument> {
  const db = getDatabase();
  const next = await db.transaction('rw', db.plans, async () => {
    const stored = await db.plans.get(planId);
    if (revisionOf(stored) !== knownRevisions.get(planId))
      throw new LocalPlanConflictError();
    const successor = await db.plans.get(nextId);
    const validated = planDocumentSchema.parse(successor);
    if (planId === nextId)
      throw new Error('Choose a different room before deletion.');
    await db.plans.delete(planId);
    return { document: validated, revision: revisionOf(successor) };
  });
  knownRevisions.set(nextId, next.revision);
  globalThis.localStorage?.setItem(ACTIVE_PLAN_STORAGE_KEY, nextId);
  return next.document;
}
