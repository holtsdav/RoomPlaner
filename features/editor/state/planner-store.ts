import { create } from 'zustand';
import { objectFromPreset, type CatalogPreset } from '../domain/catalog';
import {
  addObject as addObjectCommand,
  deleteObjects as deleteObjectsCommand,
  duplicateObjects as duplicateObjectsCommand,
  moveObjects as moveObjectsCommand,
  updateObject as updateObjectCommand,
  updateRoom as updateRoomCommand,
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
import { isSimplePolygon, midpoint } from '../domain/polygon';
import { loadLocalPlan } from '../persistence/local-plan-repository';

export type EditorTool = 'select' | 'pan' | 'room';
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
  selectedCornerIndex: number | null;
  past: PlanDocument[];
  future: PlanDocument[];
  tool: EditorTool;
  saveStatus: SaveStatus;
  hydrated: boolean;
  isHydrating: boolean;
  roomGeometryError: string | null;
  hydrate: () => Promise<void>;
  setSaveStatus: (saveStatus: SaveStatus) => void;
  setTool: (tool: EditorTool) => void;
  selectObject: (objectId: string, additive?: boolean) => void;
  selectCorner: (cornerIndex: number) => void;
  clearSelection: () => void;
  addPreset: (preset: CatalogPreset) => void;
  moveSelectionTo: (anchorId: string, positionMm: PointMm) => void;
  nudgeSelection: (deltaMm: PointMm) => void;
  updateSelectedObject: (patch: ObjectPatch) => void;
  duplicateSelection: () => void;
  deleteSelection: () => void;
  moveCorner: (cornerIndex: number, positionMm: PointMm) => boolean;
  insertCorner: (edgeStartIndex: number) => void;
  deleteSelectedCorner: () => void;
  updateRoomSettings: (settings: {
    name: string;
    widthMm: number;
    depthMm: number;
    wallThicknessMm: number;
  }) => boolean;
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
    nextSelection = get().selectedIds,
    nextCornerIndex = get().selectedCornerIndex,
  ): void => {
    const current = get();
    set({
      document: validate(nextDocument),
      selectedIds: nextSelection,
      selectedCornerIndex: nextCornerIndex,
      past: [
        ...current.past.slice(-(MAX_HISTORY_LENGTH - 1)),
        current.document,
      ],
      future: [],
      saveStatus: 'saving',
      roomGeometryError: null,
    });
  };

  return {
    document: createStarterPlan(),
    selectedIds: [],
    selectedCornerIndex: null,
    past: [],
    future: [],
    tool: 'select',
    saveStatus: 'loading',
    hydrated: false,
    isHydrating: false,
    roomGeometryError: null,

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
          selectedCornerIndex: null,
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
    setTool: (tool) =>
      set({
        tool,
        selectedIds: tool === 'room' ? [] : get().selectedIds,
        selectedCornerIndex: tool === 'room' ? get().selectedCornerIndex : null,
        roomGeometryError: null,
      }),

    selectObject: (objectId, additive = false) =>
      set((state) => {
        if (!additive) {
          return {
            selectedIds: [objectId],
            selectedCornerIndex: null,
            tool: 'select' as const,
          };
        }
        return {
          selectedIds: state.selectedIds.includes(objectId)
            ? state.selectedIds.filter((id) => id !== objectId)
            : [...state.selectedIds, objectId],
          selectedCornerIndex: null,
          tool: 'select' as const,
        };
      }),

    selectCorner: (selectedCornerIndex) =>
      set({
        selectedCornerIndex,
        selectedIds: [],
        tool: 'room',
        roomGeometryError: null,
      }),

    clearSelection: () =>
      set({
        selectedIds: [],
        selectedCornerIndex: null,
        roomGeometryError: null,
      }),

    addPreset: (preset) => {
      const { document } = get();
      const bounds = getRoomBounds(document.room);
      const id = createId(preset.id);
      const offset = document.objects.length * 80;
      const object = objectFromPreset(preset, id, {
        x: Math.round(bounds.minX + bounds.width / 2 + offset),
        y: Math.round(bounds.minY + bounds.height / 2 + offset),
      });
      commit(addObjectCommand(document, object), [id], null);
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
        null,
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
      commit(deleteObjectsCommand(state.document, state.selectedIds), [], null);
    },

    moveCorner: (cornerIndex, positionMm) => {
      const state = get();
      const currentCorner = state.document.room.boundary[cornerIndex];
      if (!currentCorner) return false;
      const nextCorner = {
        x: Math.round(positionMm.x / 10) * 10,
        y: Math.round(positionMm.y / 10) * 10,
      };
      if (
        nextCorner.x === currentCorner.x &&
        nextCorner.y === currentCorner.y
      ) {
        return true;
      }
      const boundary = state.document.room.boundary.map((point, index) =>
        index === cornerIndex ? nextCorner : point,
      );
      if (!isSimplePolygon(boundary)) {
        set({
          roomGeometryError:
            'That position would cross a wall or create a wall shorter than 100 mm.',
        });
        return false;
      }
      commit(
        updateRoomCommand(state.document, { ...state.document.room, boundary }),
        [],
        cornerIndex,
      );
      return true;
    },

    insertCorner: (edgeStartIndex) => {
      const state = get();
      const boundary = [...state.document.room.boundary];
      const nextIndex = (edgeStartIndex + 1) % boundary.length;
      const corner = midpoint(boundary[edgeStartIndex], boundary[nextIndex]);
      const insertedIndex = edgeStartIndex + 1;
      boundary.splice(insertedIndex, 0, corner);
      if (!isSimplePolygon(boundary)) {
        set({ roomGeometryError: 'This wall is too short to add a corner.' });
        return;
      }
      commit(
        updateRoomCommand(state.document, { ...state.document.room, boundary }),
        [],
        insertedIndex,
      );
    },

    deleteSelectedCorner: () => {
      const state = get();
      const cornerIndex = state.selectedCornerIndex;
      if (cornerIndex === null) return;
      if (state.document.room.boundary.length <= 3) {
        set({ roomGeometryError: 'A room needs at least three corners.' });
        return;
      }
      const boundary = state.document.room.boundary.filter(
        (_, index) => index !== cornerIndex,
      );
      if (!isSimplePolygon(boundary)) {
        set({
          roomGeometryError:
            'Removing that corner would create an invalid room outline.',
        });
        return;
      }
      commit(
        updateRoomCommand(state.document, { ...state.document.room, boundary }),
        [],
        null,
      );
    },

    updateRoomSettings: ({ name, widthMm, depthMm, wallThicknessMm }) => {
      const state = get();
      const bounds = getRoomBounds(state.document.room);
      const boundary = state.document.room.boundary.map((point) => ({
        x: Math.round(
          bounds.minX + ((point.x - bounds.minX) / bounds.width) * widthMm,
        ),
        y: Math.round(
          bounds.minY + ((point.y - bounds.minY) / bounds.height) * depthMm,
        ),
      }));
      if (!isSimplePolygon(boundary)) {
        set({
          roomGeometryError:
            'Those dimensions would make one or more walls too short.',
        });
        return false;
      }
      commit(
        updateRoomCommand(state.document, {
          ...state.document.room,
          name: name.trim() || state.document.room.name,
          wallThicknessMm,
          boundary,
        }),
        [],
        null,
      );
      return true;
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
        selectedCornerIndex: null,
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
        selectedCornerIndex: null,
        saveStatus: 'saving',
      });
    },
  };
});
