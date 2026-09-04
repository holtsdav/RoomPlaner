'use client';

import { useEffect } from 'react';
import { saveLocalPlan } from '../persistence/local-plan-repository';
import { usePlannerStore } from '../state/planner-store';

export function useLocalPlan() {
  const document = usePlannerStore((state) => state.document);
  const hydrated = usePlannerStore((state) => state.hydrated);
  const hydrate = usePlannerStore((state) => state.hydrate);
  const setSaveStatus = usePlannerStore((state) => state.setSaveStatus);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;

    setSaveStatus('saving');
    const timeout = window.setTimeout(() => {
      void saveLocalPlan(document)
        .then(() => setSaveStatus('saved'))
        .catch(() => setSaveStatus('error'));
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [document, hydrated, setSaveStatus]);
}
