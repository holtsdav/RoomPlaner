import type { PlanDocument } from '../domain/plan-document';

/** Serialize writes and coalesce repeated requests for the same immutable revision. */
export function createSaveQueue(
  write: (document: PlanDocument) => Promise<void>,
) {
  let tail = Promise.resolve();
  let latest: PlanDocument | undefined;
  let latestResult: Promise<void> | undefined;
  return (document: PlanDocument): Promise<void> => {
    if (latest === document && latestResult) return latestResult;
    latest = document;
    const result = tail.then(() => write(document));
    latestResult = result;
    tail = result.catch(() => {
      if (latest === document) {
        latest = undefined;
        latestResult = undefined;
      }
    });
    return result;
  };
}
