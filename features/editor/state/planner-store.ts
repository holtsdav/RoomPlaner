import { snapWallCorner, snapWallMillimetres } from '../domain/wall-snap';
import { resizeInsideRoom } from '../domain/room-measurements';
import {
  constrainWindows,
  isWallAttached,
  findWallAttachment,
} from '../domain/wall-attachment';
import { create } from 'zustand';
import {
  objectFromPreset,
  getBlueprintProfile,
  type CatalogPreset,
} from '../domain/catalog';
import {
  addObject as addObjectCommand,
  createObjectGroup as createObjectGroupCommand,
  deleteObjects as deleteObjectsCommand,
  duplicateObjects as duplicateObjectsCommand,
  mirrorObjects as mirrorObjectsCommand,
  moveObjects as moveObjectsCommand,
  positionOverlappingObjects as positionOverlappingObjectsCommand,
  rotateObjects as rotateObjectsCommand,
  scaleObjects as scaleObjectsCommand,
  setObjectsLocked as setObjectsLockedCommand,
  ungroupObjects as ungroupObjectsCommand,
  updateObject as updateObjectCommand,
  updateRoom as updateRoomCommand,
  type ObjectPositionAction,
} from '../domain/commands';
import {
  createId,
  createStarterPlan,
  formatMeasurement,
  getRoomBounds,
  planDocumentSchema,
  roomSchema,
  type PlanDocument,
  type PlanObject,
  type PointMm,
} from '../domain/plan-document';
import { midpoint } from '../domain/polygon';
import { findPresetPosition } from '../domain/placement';
import {
  loadLocalPlan,
  saveLocalPlan,
} from '../persistence/local-plan-repository';

export type EditorTool = 'select' | 'room';
export type SaveStatus = 'loading' | 'saving' | 'saved' | 'error';

type ObjectPatch = Partial<
  Pick<
    PlanObject,
    | 'name'
    | 'positionMm'
    | 'rotationDeg'
    | 'widthMm'
    | 'depthMm'
    | 'color'
    | 'defaultSizeMm'
    | 'blueprintProfile'
    | 'shape'
    | 'locked'
    | 'mirroredHorizontally'
    | 'mirroredVertically'
  >
>;

type PlannerState = {
  document: PlanDocument;
  editStart: PlanDocument | null;
  editRecordsHistory: boolean;
  beginEdit: () => void;
  finishEdit: () => void;
  cancelEdit: () => void;
  selectedIds: string[];
  selectedCornerIndex: number | null;
  past: PlanDocument[];
  future: PlanDocument[];
  tool: EditorTool;
  saveStatus: SaveStatus;
  saveError: string | null;
  saveRecoveryOpen: boolean;
  roomOperationPending: boolean;
  hydrated: boolean;
  isHydrating: boolean;
  roomGeometryError: string | null;
  hydrate: () => Promise<void>;
  setSaveStatus: (saveStatus: SaveStatus) => void;
  setTool: (tool: EditorTool) => void;
  selectObject: (objectId: string, additive?: boolean) => void;
  selectObjects: (objectIds: string[], additive?: boolean) => void;
  selectCorner: (cornerIndex: number) => void;
  clearSelection: () => void;
  addPreset: (preset: CatalogPreset) => void;
  moveSelectionTo: (anchorId: string, positionMm: PointMm) => void;
  nudgeSelection: (deltaMm: PointMm) => void;
  updateSelectedObject: (patch: ObjectPatch) => void;
  setSelectionColor: (color: string | undefined) => void;
  duplicateSelection: () => void;
  positionSelection: (action: ObjectPositionAction) => void;
  scaleSelection: (factor: number, baseline?: PlanObject[]) => void;
  rotateSelection: (deltaDeg: number, baseline?: PlanObject[]) => void;
  mirrorSelection: (axis: 'horizontal' | 'vertical') => void;
  setSelectionLocked: (locked: boolean) => void;
  groupSelection: () => void;
  ungroupSelection: () => void;
  deleteSelection: () => void;
  clearCanvas: () => void;
  moveCorner: (cornerIndex: number, positionMm: PointMm) => boolean;
  insertCorner: (edgeStartIndex: number) => void;
  deleteSelectedCorner: () => void;
  updatePlannerSettings: (settings: {
    units: 'm' | 'ft-in';
    gridSizeMm: number;
    snapSizeMm: number;
    gridEnabled?: boolean;
    snapEnabled?: boolean;
  }) => void;
  updateRoomSettings: (settings: {
    name: string;
    widthMm: number;
    depthMm: number;
    wallThicknessMm: number;
    inside?: boolean;
  }) => boolean;
  createNewRoom: (name?: string) => void;
  renameRoom: (name: string) => void;
  openRoom: (document: PlanDocument) => void;
  undo: () => void;
  redo: () => void;
};

const MAX_HISTORY_LENGTH = 50;

function validate(document: PlanDocument): PlanDocument {
  const parsed = planDocumentSchema.parse(document);
  return constrainWindows({
    ...parsed,
    objects: parsed.objects.map((object) => {
      const profile =
        object.blueprint && !object.blueprintProfile
          ? getBlueprintProfile(object)
          : undefined;
      return profile ? { ...object, blueprintProfile: profile } : object;
    }),
  });
}

function expandGroupedObjectIds(
  document: PlanDocument,
  objectIds: string[],
): string[] {
  const ids = new Set(objectIds);
  for (const group of document.groups) {
    if (group.objectIds.some((id) => ids.has(id))) {
      for (const id of group.objectIds) ids.add(id);
    }
  }
  return document.objects
    .map((object) => object.id)
    .filter((id) => ids.has(id));
}

export const usePlannerStore = create<PlannerState>()((set, get) => {
  const commit = (
    nextDocument: PlanDocument,
    nextSelection = get().selectedIds,
    nextCornerIndex = get().selectedCornerIndex,
  ): void => {
    const current = get();
    if (nextDocument === current.document) return;
    nextDocument = constrainWindows(nextDocument, current.document);
    if (current.editStart) {
      // Commands create immutable, constrained previews. Validate once on commit.
      set({
        document: nextDocument,
        selectedIds: nextSelection,
        selectedCornerIndex: nextCornerIndex,
        editRecordsHistory: true,
        saveStatus: 'saving',
        roomGeometryError: null,
      });
      return;
    }
    const parsed = planDocumentSchema.safeParse(nextDocument);
    if (!parsed.success) {
      set({
        roomGeometryError:
          parsed.error.issues[0]?.message ??
          'That edit exceeds the plan limits.',
      });
      return;
    }
    set({
      document: validate(parsed.data),
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

  const selectState = (
    patch:
      | Partial<PlannerState>
      | ((state: PlannerState) => Partial<PlannerState>),
  ) => {
    get().finishEdit();
    set(patch);
  };

  return {
    editStart: null,
    saveError: null,
    saveRecoveryOpen: true,
    editRecordsHistory: false,
    beginEdit: () => {
      if (!get().editStart)
        set({ editStart: get().document, editRecordsHistory: false });
    },
    finishEdit: () => {
      const state = get();
      if (!state.editStart) return;
      const changed = state.document !== state.editStart;
      const result = changed
        ? planDocumentSchema.safeParse(state.document)
        : null;
      if (result && !result.success) {
        set({
          document: state.editStart,
          editStart: null,
          editRecordsHistory: false,
          roomGeometryError:
            'That value would create an invalid plan. The previous value was restored.',
        });
        return;
      }
      const applyPreferences = (document: PlanDocument): PlanDocument => ({
        ...document,
        units: state.document.units,
        gridEnabled: state.document.gridEnabled,
        snapEnabled: state.document.snapEnabled,
        gridSizeMm: state.document.gridSizeMm,
        snapSizeMm: state.document.snapSizeMm,
      });
      set({
        document: result?.success ? result.data : state.document,
        editStart: null,
        editRecordsHistory: false,
        past:
          changed && state.editRecordsHistory
            ? [...state.past.slice(-(MAX_HISTORY_LENGTH - 1)), state.editStart]
            : changed
              ? state.past.map(applyPreferences)
              : state.past,
        future:
          changed && state.editRecordsHistory
            ? []
            : changed
              ? state.future.map(applyPreferences)
              : state.future,
        saveStatus: changed ? 'saving' : state.saveStatus,
      });
    },
    cancelEdit: () => {
      const state = get();
      if (state.editStart)
        set({
          document: state.editStart,
          editStart: null,
          editRecordsHistory: false,
          roomGeometryError: null,
        });
    },
    document: createStarterPlan(),
    selectedIds: [],
    selectedCornerIndex: null,
    past: [],
    future: [],
    tool: 'select',
    saveStatus: 'loading',
    roomOperationPending: false,
    hydrated: false,
    isHydrating: false,
    roomGeometryError: null,

    hydrate: async () => {
      if (get().hydrated || get().isHydrating) return;
      set({ isHydrating: true, saveStatus: 'loading' });

      try {
        const stored = await loadLocalPlan();
        const document = validate(stored ?? createStarterPlan());
        // A fresh room is only labelled saved after its first durable commit.
        if (!stored) {
          // Distinct ids also make simultaneous first visits safe across tabs.
          document.id = createId('plan');
          try {
            await saveLocalPlan(document);
          } catch {
            set({
              document,
              hydrated: true,
              isHydrating: false,
              saveStatus: 'error',
              saveError:
                'This room is only in memory. Local storage is unavailable. Retry or export a backup before leaving.',
            });
            return;
          }
        }
        set({
          document: validate(document),
          hydrated: true,
          isHydrating: false,
          saveStatus: 'saved',
          saveError: null,
          past: [],
          future: [],
          selectedIds: [],
          selectedCornerIndex: null,
        });
      } catch {
        const recovery = createStarterPlan();
        set({
          document: {
            ...recovery,
            id: createId('recovery-plan'),
            room: { ...recovery.room, id: createId('room') },
          },
          saveError:
            'Local storage could not be opened. Existing data is preserved. This room is only in memory; export a backup before leaving.',
          roomGeometryError:
            'The saved room could not be opened. Its stored copy has been preserved. Any new edits will be saved separately.',
          hydrated: true,
          isHydrating: false,
          saveStatus: 'error',
        });
      }
    },

    setSaveStatus: (saveStatus) =>
      set({
        saveStatus,
        ...(saveStatus === 'error' ? { saveRecoveryOpen: true } : {}),
      }),
    setTool: (tool) =>
      selectState({
        tool,
        selectedIds: tool === 'room' ? [] : get().selectedIds,
        selectedCornerIndex: tool === 'room' ? get().selectedCornerIndex : null,
        roomGeometryError: null,
      }),

    selectObject: (objectId, additive = false) =>
      selectState((state) => {
        const targetIds = expandGroupedObjectIds(state.document, [objectId]);
        if (!additive) {
          return {
            selectedIds: targetIds,
            selectedCornerIndex: null,
            tool: 'select' as const,
          };
        }
        const targetIsSelected = targetIds.every((id) =>
          state.selectedIds.includes(id),
        );
        return {
          selectedIds: targetIsSelected
            ? state.selectedIds.filter((id) => !targetIds.includes(id))
            : [...new Set([...state.selectedIds, ...targetIds])],
          selectedCornerIndex: null,
          tool: 'select' as const,
        };
      }),

    selectObjects: (objectIds, additive = false) =>
      selectState((state) => {
        const existingIds = new Set(
          state.document.objects.map((object) => object.id),
        );
        const validIds = expandGroupedObjectIds(
          state.document,
          objectIds.filter((id) => existingIds.has(id)),
        );
        return {
          selectedIds: additive
            ? [...new Set([...state.selectedIds, ...validIds])]
            : validIds,
          selectedCornerIndex: null,
          tool: 'select' as const,
          roomGeometryError: null,
        };
      }),

    selectCorner: (selectedCornerIndex) =>
      selectState({
        selectedCornerIndex,
        selectedIds: [],
        tool: 'room',
        roomGeometryError: null,
      }),

    clearSelection: () =>
      selectState({
        selectedIds: [],
        selectedCornerIndex: null,
        roomGeometryError: null,
      }),

    addPreset: (preset) => {
      get().finishEdit();
      const { document } = get();
      let rotationDeg = 0;
      let position = isWallAttached(preset)
        ? document.room.boundary[0]
        : findPresetPosition(document, preset);
      if (!position && !isWallAttached(preset)) {
        position = findPresetPosition(document, {
          ...preset,
          widthMm: preset.depthMm,
          depthMm: preset.widthMm,
        });
        rotationDeg = 90;
      }
      if (!position) {
        set({
          roomGeometryError: `${preset.name} could not be placed automatically at its current size. Try a smaller object or adjust the room outline.`,
        });
        return;
      }
      const id = createId(preset.id);
      const object = { ...objectFromPreset(preset, id, position), rotationDeg };
      if (
        isWallAttached(object) &&
        !findWallAttachment(object, document.room)
      ) {
        set({
          roomGeometryError: `${preset.name} cannot fit a mounting wall at its real size. Choose a smaller variant or enlarge the room.`,
        });
        return;
      }
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
      if (
        state.selectedIds.length === 0 ||
        (deltaMm.x === 0 && deltaMm.y === 0) ||
        !state.document.objects.some(
          (object) => state.selectedIds.includes(object.id) && !object.locked,
        )
      )
        return;
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

    setSelectionColor: (color) => {
      const state = get();
      if (color !== undefined && !/^#[0-9a-fA-F]{6}$/.test(color)) return;
      const ids = new Set(state.selectedIds);
      if (
        !state.document.objects.some(
          (object) =>
            ids.has(object.id) && !object.locked && object.color !== color,
        )
      )
        return;
      commit({
        ...state.document,
        updatedAt: new Date().toISOString(),
        objects: state.document.objects.map((object) =>
          ids.has(object.id) && !object.locked ? { ...object, color } : object,
        ),
      });
    },

    duplicateSelection: () => {
      const state = get();
      if (state.selectedIds.length === 0) return;
      const result = duplicateObjectsCommand(
        state.document,
        state.selectedIds,
        (object) => createId(object.category),
        () => createId('group'),
      );
      commit(result.document, result.duplicatedIds);
    },

    positionSelection: (action) => {
      const state = get();
      if (state.selectedIds.length === 0) return;
      const nextDocument = positionOverlappingObjectsCommand(
        state.document,
        state.selectedIds,
        action,
      );
      if (nextDocument !== state.document) commit(nextDocument);
    },

    scaleSelection: (factor, baseline) => {
      const state = get();
      if (
        state.selectedIds.length < 2 ||
        factor <= 0 ||
        (factor === 1 && !baseline)
      )
        return;
      const nextDocument = scaleObjectsCommand(
        state.document,
        state.selectedIds,
        factor,
        baseline,
      );
      if (nextDocument !== state.document) commit(nextDocument);
    },

    rotateSelection: (deltaDeg, baseline) => {
      const state = get();
      if (state.selectedIds.length < 2 || (deltaDeg === 0 && !baseline)) return;
      const nextDocument = rotateObjectsCommand(
        state.document,
        state.selectedIds,
        deltaDeg,
        baseline,
      );
      if (nextDocument !== state.document) commit(nextDocument);
    },

    mirrorSelection: (axis) => {
      const state = get();
      if (state.selectedIds.length < 2) return;
      const nextDocument = mirrorObjectsCommand(
        state.document,
        state.selectedIds,
        axis,
      );
      if (nextDocument !== state.document) commit(nextDocument);
    },

    setSelectionLocked: (locked) => {
      const state = get();
      if (state.selectedIds.length === 0) return;
      commit(
        setObjectsLockedCommand(state.document, state.selectedIds, locked),
      );
    },

    groupSelection: () => {
      const state = get();
      if (state.selectedIds.length < 2) return;
      const groupNumber = state.document.groups.length + 1;
      const nextDocument = createObjectGroupCommand(
        state.document,
        state.selectedIds,
        createId('group'),
        `Group ${groupNumber}`,
      );
      if (nextDocument !== state.document) {
        const groupedIds = expandGroupedObjectIds(
          nextDocument,
          state.selectedIds,
        );
        commit(nextDocument, groupedIds, null);
      }
    },

    ungroupSelection: () => {
      const state = get();
      if (state.selectedIds.length === 0) return;
      const nextDocument = ungroupObjectsCommand(
        state.document,
        state.selectedIds,
      );
      if (nextDocument !== state.document) commit(nextDocument);
    },

    deleteSelection: () => {
      const state = get();
      if (state.selectedIds.length === 0) return;
      commit(deleteObjectsCommand(state.document, state.selectedIds), [], null);
    },

    clearCanvas: () => {
      const state = get();
      const starter = createStarterPlan();
      commit(
        {
          ...state.document,
          room: {
            ...starter.room,
            id: state.document.room.id,
            name: state.document.room.name,
          },
          objects: [],
          groups: [],
          updatedAt: new Date().toISOString(),
        },
        [],
        null,
      );
      set({ tool: 'select' });
    },

    moveCorner: (cornerIndex, positionMm) => {
      const state = get();
      const currentCorner = state.document.room.boundary[cornerIndex];
      if (!currentCorner) return false;
      const nextCorner = snapWallCorner(
        state.document.room,
        cornerIndex,
        positionMm,
      );
      if (
        nextCorner.x === currentCorner.x &&
        nextCorner.y === currentCorner.y
      ) {
        return true;
      }
      const boundary = state.document.room.boundary.map((point, index) =>
        index === cornerIndex ? nextCorner : point,
      );
      if (!roomSchema.safeParse({ ...state.document.room, boundary }).success) {
        set({
          roomGeometryError: `That position would cross a wall, close the interior, or create a wall shorter than ${formatMeasurement(100, state.document.units)}.`,
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
      boundary[insertedIndex] = snapWallCorner(
        { ...state.document.room, boundary },
        insertedIndex,
        corner,
      );
      if (!roomSchema.safeParse({ ...state.document.room, boundary }).success) {
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
      if (!roomSchema.safeParse({ ...state.document.room, boundary }).success) {
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

    updatePlannerSettings: ({
      units,
      gridSizeMm,
      snapSizeMm,
      gridEnabled,
      snapEnabled,
    }) => {
      const state = get();
      const nextSettings = {
        units,
        gridSizeMm: Math.max(1, Math.round(gridSizeMm)),
        snapSizeMm: Math.max(1, Math.round(snapSizeMm)),
        gridEnabled: gridEnabled ?? state.document.gridEnabled,
        snapEnabled: snapEnabled ?? state.document.snapEnabled,
      };
      const applySettings = (document: PlanDocument): PlanDocument => ({
        ...document,
        ...nextSettings,
      });
      set({
        document: validate({
          ...applySettings(state.document),
          updatedAt: new Date().toISOString(),
        }),
        past: state.editStart ? state.past : state.past.map(applySettings),
        future: state.editStart
          ? state.future
          : state.future.map(applySettings),
        saveStatus: 'saving',
      });
    },

    updateRoomSettings: ({
      name,
      widthMm,
      depthMm,
      wallThicknessMm,
      inside,
    }) => {
      widthMm = snapWallMillimetres(widthMm);
      depthMm = snapWallMillimetres(depthMm);
      const state = get();
      const bounds = getRoomBounds(state.document.room);
      const boundary = inside
        ? resizeInsideRoom(
            state.document.room,
            widthMm,
            depthMm,
            wallThicknessMm,
          )
        : state.document.room.boundary.map((point) => ({
            x: Math.round(
              bounds.minX + ((point.x - bounds.minX) / bounds.width) * widthMm,
            ),
            y: Math.round(
              bounds.minY + ((point.y - bounds.minY) / bounds.height) * depthMm,
            ),
          }));
      if (
        !boundary ||
        !roomSchema.safeParse({
          ...state.document.room,
          boundary,
          wallThicknessMm,
        }).success
      ) {
        set({
          roomGeometryError:
            'Those dimensions must leave usable interior wall faces and stay within the planning limits.',
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

    createNewRoom: (name = 'Untitled room') => {
      const current = get().document;
      const starter = createStarterPlan();
      const now = new Date().toISOString();
      const trimmedName = name.trim() || 'Untitled room';
      set({
        document: validate({
          ...starter,
          id: createId('plan'),
          name: trimmedName,
          units: current.units,
          gridEnabled: current.gridEnabled,
          snapEnabled: current.snapEnabled,
          gridSizeMm: current.gridSizeMm,
          snapSizeMm: current.snapSizeMm,
          room: {
            ...starter.room,
            id: createId('room'),
            name: trimmedName,
          },
          objects: [],
          createdAt: now,
          updatedAt: now,
        }),
        selectedIds: [],
        selectedCornerIndex: null,
        past: [],
        future: [],
        tool: 'select',
        saveStatus: 'saving',
        roomGeometryError: null,
      });
    },

    renameRoom: (name) => {
      const state = get();
      const trimmedName = name.trim();
      if (!trimmedName || trimmedName === state.document.room.name) return;
      commit({
        ...state.document,
        name: trimmedName,
        room: { ...state.document.room, name: trimmedName },
        updatedAt: new Date().toISOString(),
      });
    },

    openRoom: (document) => {
      set({
        editStart: null,
        editRecordsHistory: false,
        document: validate(document),
        selectedIds: [],
        selectedCornerIndex: null,
        past: [],
        future: [],
        tool: 'select',
        saveStatus: 'saved',
        roomGeometryError: null,
      });
    },

    undo: () => {
      get().finishEdit();
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
      get().finishEdit();
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
