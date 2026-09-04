import { create } from 'zustand';
import { objectFromPreset, type CatalogPreset } from '../domain/catalog';
import {
  addObject as addObjectCommand,
  deleteObjects as deleteObjectsCommand,
  duplicateObjects as duplicateObjectsCommand,
  moveObjects as moveObjectsCommand,
  updateObject as updateObjectCommand,
} from '../domain/commands';
import {
  createId,
  createStarterPlan,
  getRoomBounds,
  planDocumentSchema,
  type PlanDocument,
  type PlanObject,
  type PointMm,
} from '../domain/plan-document';
import { loadLocalPlan } from '../persistence/local-plan-repository';

export type EditorTool = 'select' | 'pan';
export type SaveStatus = 'loading' | 'saving' | 'saved' | 'error';

type ObjectPatch = Partial<
  Pick<
    PlanObject,
    'name' | 'positionMm' | 'rotationDeg' | 'widthMm' | 'depthMm' | 'locked'
  >
>;

type PlannerState = {
  document: PlanDocument;
  selectedIds: string[];
  past: PlanDocument[];
  future: PlanDocument[];
  tool: EditorTool;
  saveStatus: SaveStatus;
  hydrated: boolean;
  isHydrating: boolean;
  hydrate: () => Promise<void>;
  setSaveStatus: (saveStatus: SaveStatus) => void;
  setTool: (tool: EditorTool) => void;
  selectObject: (objectId: string, additive?: boolean) => void;
  clearSelection: () => void;
  addPreset: (preset: CatalogPreset) => void;
  moveSelectionTo: (anchorId: string, positionMm: PointMm) => void;
  nudgeSelection: (deltaMm: PointMm) => void;
  updateSelectedObject: (patch: ObjectPatch) => void;
  duplicateSelection: () => void;
  deleteSelection: () => void;
  undo: () => void;
  redo: () => void;
};

const MAX_HISTORY_LENGTH = 50;

function validate(document: PlanDocument): PlanDocument {
  return planDocumentSchema.parse(document);
}

export const usePlannerStore = create<PlannerState>()((set, get) => {
  const commit = (
    nextDocument: PlanDocument,
    nextSelection?: string[],
  ): void => {
    const current = get();
    set({
      document: validate(nextDocument),
      selectedIds: nextSelection ?? current.selectedIds,
      past: [
        ...current.past.slice(-(MAX_HISTORY_LENGTH - 1)),
        current.document,
      ],
      future: [],
      saveStatus: 'saving',
    });
  };

  return {
    document: createStarterPlan(),
    selectedIds: [],
    past: [],
    future: [],
    tool: 'select',
    saveStatus: 'loading',
    hydrated: false,
    isHydrating: false,

    hydrate: async () => {
      if (get().hydrated || get().isHydrating) return;
      set({ isHydrating: true, saveStatus: 'loading' });

      try {
        const document = (await loadLocalPlan()) ?? createStarterPlan();
        set({
          document,
          hydrated: true,
          isHydrating: false,
          saveStatus: 'saved',
          past: [],
          future: [],
          selectedIds: [],
        });
      } catch {
        set({
          hydrated: true,
          isHydrating: false,
          saveStatus: 'error',
        });
      }
    },

    setSaveStatus: (saveStatus) => set({ saveStatus }),
    setTool: (tool) => set({ tool }),

    selectObject: (objectId, additive = false) =>
      set((state) => {
        if (!additive) return { selectedIds: [objectId] };
        return {
          selectedIds: state.selectedIds.includes(objectId)
            ? state.selectedIds.filter((id) => id !== objectId)
            : [...state.selectedIds, objectId],
        };
      }),

    clearSelection: () => set({ selectedIds: [] }),

    addPreset: (preset) => {
      const { document } = get();
      const bounds = getRoomBounds(document.room);
      const id = createId(preset.id);
      const offset = document.objects.length * 80;
      const object = objectFromPreset(preset, id, {
        x: Math.round(bounds.minX + bounds.width / 2 + offset),
        y: Math.round(bounds.minY + bounds.height / 2 + offset),
      });
      commit(addObjectCommand(document, object), [id]);
    },

    moveSelectionTo: (anchorId, positionMm) => {
      const state = get();
      const anchor = state.document.objects.find(
        (object) => object.id === anchorId,
      );
      if (!anchor || anchor.locked) return;

      const selectedIds = state.selectedIds.includes(anchorId)
        ? state.selectedIds
        : [anchorId];
      commit(
        moveObjectsCommand(state.document, selectedIds, {
          x: positionMm.x - anchor.positionMm.x,
          y: positionMm.y - anchor.positionMm.y,
        }),
        selectedIds,
      );
    },

    nudgeSelection: (deltaMm) => {
      const state = get();
      if (state.selectedIds.length === 0) return;
      commit(moveObjectsCommand(state.document, state.selectedIds, deltaMm));
    },

    updateSelectedObject: (patch) => {
      const state = get();
      if (state.selectedIds.length !== 1) return;
      const selectedObject = state.document.objects.find(
        (object) => object.id === state.selectedIds[0],
      );
      if (
        !selectedObject ||
        (selectedObject.locked && patch.locked !== false)
      ) {
        return;
      }
      commit(updateObjectCommand(state.document, state.selectedIds[0], patch));
    },

    duplicateSelection: () => {
      const state = get();
      if (state.selectedIds.length === 0) return;
      const result = duplicateObjectsCommand(
        state.document,
        state.selectedIds,
        (object) => createId(object.category),
      );
      commit(result.document, result.duplicatedIds);
    },

    deleteSelection: () => {
      const state = get();
      if (state.selectedIds.length === 0) return;
      commit(deleteObjectsCommand(state.document, state.selectedIds), []);
    },

    undo: () => {
      const state = get();
      const previous = state.past.at(-1);
      if (!previous) return;
      set({
        document: previous,
        past: state.past.slice(0, -1),
        future: [state.document, ...state.future],
        selectedIds: [],
        saveStatus: 'saving',
      });
    },

    redo: () => {
      const state = get();
      const next = state.future[0];
      if (!next) return;
      set({
        document: next,
        past: [...state.past, state.document],
        future: state.future.slice(1),
        selectedIds: [],
        saveStatus: 'saving',
      });
    },
  };
});
