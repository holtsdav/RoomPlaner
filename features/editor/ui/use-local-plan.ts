'use client';

import { useEffect } from 'react';
import { saveLocalPlan } from '../persistence/local-plan-repository';
import { createSaveQueue } from '../persistence/save-queue';
import { usePlannerStore } from '../state/planner-store';

const queueSave = createSaveQueue(saveLocalPlan);

/** Also used before room changes and navigation so pending edits cannot be cancelled. */
export async function flushLocalPlan(): Promise<void> {
  usePlannerStore.getState().finishEdit();
  while (true) {
    // A new gesture may have started while an older revision was being written.
    // Wait for its commit/cancel instead of persisting an unfinished preview.
    if (usePlannerStore.getState().editStart) {
      await new Promise<void>((resolve) => {
        const unsubscribe = usePlannerStore.subscribe((state) => {
          if (!state.editStart) {
            unsubscribe();
            resolve();
          }
        });
      });
    }
    const state = usePlannerStore.getState();
    if (!state.hydrated) return;
    const revision = state.document;
    state.setSaveStatus('saving');
    try {
      await queueSave(revision);
    } catch (error) {
      if (usePlannerStore.getState().document === revision) {
        state.setSaveStatus('error');
        usePlannerStore.setState({
          saveError:
            error instanceof Error
              ? error.message
              : 'Local storage is unavailable.',
        });
      }
      throw error;
    }
    if (usePlannerStore.getState().document === revision) {
      state.setSaveStatus('saved');
      usePlannerStore.setState({ saveError: null });
      return;
    }
  }
}

export async function runRoomOperation(
  operation: () => Promise<void>,
): Promise<void> {
  if (usePlannerStore.getState().roomOperationPending) return;
  usePlannerStore.setState({ roomOperationPending: true });
  try {
    await flushLocalPlan();
    await operation();
  } finally {
    usePlannerStore.setState({ roomOperationPending: false });
  }
}

export function useLocalPlan() {
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const flush = () => {
      clearTimeout(timeout);
      void flushLocalPlan().catch(() => {
        /* The persistent save notice offers recovery. */
      });
    };
    const unsubscribe = usePlannerStore.subscribe((state, previous) => {
      if (state.roomOperationPending) {
        clearTimeout(timeout);
        return;
      }
      if (state.editStart) {
        clearTimeout(timeout);
        return;
      }
      if (!state.hydrated) return;
      if (
        state.document === previous.document &&
        state.editStart === previous.editStart &&
        state.roomOperationPending === previous.roomOperationPending
      )
        return;
      clearTimeout(timeout);
      // Loading an existing room must never overwrite it after a read failure.
      if (
        !previous.hydrated ||
        (state.saveStatus === 'saved' &&
          previous.document.id !== state.document.id)
      )
        return;
      if (state.saveStatus !== 'saving') return;
      timeout = setTimeout(flush, 350);
    });
    const beforeUnload = (event: BeforeUnloadEvent) => {
      const state = usePlannerStore.getState();
      if (
        state.saveStatus === 'saving' ||
        state.saveStatus === 'error' ||
        (state.editStart && state.document !== state.editStart)
      ) {
        flush();
        event.preventDefault();
      }
    };
    const onVisibilityChange = () => {
      if (
        document.visibilityState === 'hidden' &&
        usePlannerStore.getState().saveStatus === 'saving'
      )
        flush();
    };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('visibilitychange', onVisibilityChange);
    void usePlannerStore.getState().hydrate();
    return () => {
      unsubscribe();
      clearTimeout(timeout);
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (
        usePlannerStore.getState().saveStatus === 'saving' ||
        usePlannerStore.getState().editStart
      )
        flush();
    };
  }, []);
}
