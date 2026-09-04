import Dexie, { type EntityTable } from 'dexie';
import {
  LOCAL_PLAN_ID,
  planDocumentSchema,
  type PlanDocument,
} from '../domain/plan-document';

class RoomPlannerDatabase extends Dexie {
  plans!: EntityTable<PlanDocument, 'id'>;

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
  const stored = await getDatabase().plans.get(LOCAL_PLAN_ID);
  if (!stored) return undefined;
  return planDocumentSchema.parse(stored);
}

export async function saveLocalPlan(document: PlanDocument): Promise<void> {
  const validated = planDocumentSchema.parse(document);
  await getDatabase().plans.put(validated);
}
