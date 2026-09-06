'use client';

import { snapWallCorner } from '../domain/wall-snap';
import { insideRoomBounds } from '../domain/room-measurements';
import { layoutWallLabels } from '../domain/wall-label-layout';
import {
  attachWindow,
  isWallAttached,
  findWallAttachment,
} from '../domain/wall-attachment';

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { LocateFixed, Minus, PanelLeftOpen, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Circle, Group, Layer, Line, Rect, Stage } from 'react-konva';
import { Button } from '@/components/ui/button';
import {
  getCornerAlignmentSnap,
  getObjectAlignmentSnap,
  type AlignmentGuide,
} from '../domain/alignment-guides';
import {
  formatMeasurement,
  formatWallMeasurement,
  getRoomBounds,
  type PlanObject,
  type PointMm,
} from '../domain/plan-document';
import { isSimplePolygon, midpoint } from '../domain/polygon';
import {
  boundsFromPoints,
  boundsIntersect,
  getObjectSelectionBounds,
  getObjectsSelectionBounds,
  objectsIntersectingBounds,
} from '../domain/selection';
import { resizeViewport } from '../domain/viewport';
import { usePlannerStore } from '../state/planner-store';
import { useTouchInput } from './use-touch-input';
import { useCanvasTouch } from './use-canvas-touch';
import { ObjectFootprint } from './object-footprint';
import { WallLengthLabel } from './wall-length-label';
import { CanvasSpacingControls } from './canvas-spacing-controls';
import { ObjectFloatingToolbar } from './object-floating-toolbar';
import { MultiObjectFloatingToolbar } from './multi-object-floating-toolbar';

const MIN_SCALE = 0.00001;
const MAX_SCALE = 0.8;
const HANDLE_TO_WALL_RADIUS_RATIO = 0.6;
const WALL_HIT_PADDING_PX = 6;
const ALIGNMENT_SNAP_THRESHOLD_PX = 6;
const ALIGNMENT_GUIDE_OVERSHOOT_PX = 16;
const ALIGNMENT_GUIDE_STROKE = '#1683ff';
const ALIGNMENT_GUIDE_HALO = '#ffffff';
const ALIGNMENT_GUIDE_STROKE_WIDTH_PX = 1.5;
const ALIGNMENT_GUIDE_HALO_WIDTH_PX = 3.5;

type Viewport = { x: number; y: number; scale: number };
type CornerDrag = { index: number; position: PointMm };
type MarqueeSelection = {
  start: PointMm;
  end: PointMm;
  startClient: PointMm;
  additive: boolean;
  moved: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function snap(value: number, spacing: number) {
  return Math.round(value / spacing) * spacing;
}

function alignmentGuidePoints(
  guide: AlignmentGuide,
  overshoot: number,
): number[] {
  if (guide.axis === 'x') {
    return [
      guide.position,
      guide.start - overshoot,
      guide.position,
      guide.end + overshoot,
    ];
  }
  if (guide.axis === 'y') {
    return [
      guide.start - overshoot,
      guide.position,
      guide.end + overshoot,
      guide.position,
    ];
  }

  const [startX, startY, endX, endY] = guide.points;
  const length = Math.hypot(endX - startX, endY - startY);
  const xOffset = length === 0 ? 0 : ((endX - startX) / length) * overshoot;
  const yOffset = length === 0 ? 0 : ((endY - startY) / length) * overshoot;
  return [startX - xOffset, startY - yOffset, endX + xOffset, endY + yOffset];
}

function useContainerSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: Math.round(entry.contentRect.width),
        height: Math.round(entry.contentRect.height),
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, size };
}

function Grid({
  minX,
  minY,
  maxX,
  maxY,
  spacingMm,
  scale,
  minorStroke,
  majorStroke,
}: {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  spacingMm: number;
  scale: number;
  minorStroke: string;
  majorStroke: string;
}) {
  const lines = useMemo(() => {
    const result: React.ReactNode[] = [];
    let renderedSpacing = spacingMm;
    while (renderedSpacing * scale < 10) renderedSpacing *= 5;
    const majorSpacing = renderedSpacing * 5;

    const firstX = Math.floor(minX / renderedSpacing) * renderedSpacing;
    const firstY = Math.floor(minY / renderedSpacing) * renderedSpacing;
    for (let x = firstX; x <= maxX; x += renderedSpacing) {
      const major = Math.abs(x % majorSpacing) < 0.001;
      result.push(
        <Line
          key={`x-${x}`}
          listening={false}
          points={[x, minY, x, maxY]}
          stroke={major ? majorStroke : minorStroke}
          strokeWidth={major ? 1.25 : 0.75}
          strokeScaleEnabled={false}
        />,
      );
    }

    for (let y = firstY; y <= maxY; y += renderedSpacing) {
      const major = Math.abs(y % majorSpacing) < 0.001;
      result.push(
        <Line
          key={`y-${y}`}
          listening={false}
          points={[minX, y, maxX, y]}
          stroke={major ? majorStroke : minorStroke}
          strokeWidth={major ? 1.25 : 0.75}
          strokeScaleEnabled={false}
        />,
      );
    }

    return result;
  }, [majorStroke, maxX, maxY, minX, minY, minorStroke, scale, spacingMm]);

  return <>{lines}</>;
}

export function PlannerCanvas({
  sidebarOpen,
  onToggleSidebar,
}: {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}) {
  const { ref: containerRef, size } = useContainerSize();
  const stageRef = useRef<Konva.Stage>(null);
  const lastLayout = useRef<{
    width: number;
    height: number;
    roomId: string;
  } | null>(null);
  const hydrated = usePlannerStore((state) => state.hydrated);
  const document = usePlannerStore((state) => state.document);
  const selectedIds = usePlannerStore((state) => state.selectedIds);
  const selectedCornerIndex = usePlannerStore(
    (state) => state.selectedCornerIndex,
  );
  const tool = usePlannerStore((state) => state.tool);
  const setTool = usePlannerStore((state) => state.setTool);
  const selectObject = usePlannerStore((state) => state.selectObject);
  const selectObjects = usePlannerStore((state) => state.selectObjects);
  const clearSelection = usePlannerStore((state) => state.clearSelection);
  const selectCorner = usePlannerStore((state) => state.selectCorner);
  const moveSelectionTo = usePlannerStore((state) => state.moveSelectionTo);
  const nudgeSelection = usePlannerStore((state) => state.nudgeSelection);
  const duplicateSelection = usePlannerStore(
    (state) => state.duplicateSelection,
  );
  const groupSelection = usePlannerStore((state) => state.groupSelection);
  const ungroupSelection = usePlannerStore((state) => state.ungroupSelection);
  const positionSelection = usePlannerStore((state) => state.positionSelection);
  const deleteSelection = usePlannerStore((state) => state.deleteSelection);
  const moveCorner = usePlannerStore((state) => state.moveCorner);
  const insertCorner = usePlannerStore((state) => state.insertCorner);
  const deleteSelectedCorner = usePlannerStore(
    (state) => state.deleteSelectedCorner,
  );
  const roomGeometryError = usePlannerStore((state) => state.roomGeometryError);
  const unplaceableCount = useMemo(
    () =>
      document.objects.filter(
        (object) =>
          isWallAttached(object) && !findWallAttachment(object, document.room),
      ).length,
    [document.objects, document.room],
  );
  const mountingWarning = unplaceableCount
    ? `${unplaceableCount} mounted ${unplaceableCount === 1 ? 'object cannot' : 'objects cannot'} fit this room. Physical sizes are preserved. Select them in “Placed in room” to adjust them.`
    : null;
  const undo = usePlannerStore((state) => state.undo);
  const redo = usePlannerStore((state) => state.redo);
  const [viewport, setViewport] = useState<Viewport>({
    x: 100,
    y: 100,
    scale: 0.12,
  });
  const [spacePressed, setSpacePressed] = useState(false);
  const touchInput = useTouchInput();
  const [middleMousePanning, setMiddleMousePanning] = useState(false);
  const [cornerDrag, setCornerDrag] = useState<CornerDrag | null>(null);
  const [draggedObject, setDraggedObject] = useState<{
    id: string;
    position: PointMm;
    objectIds: string[];
  } | null>(null);
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);
  const [marquee, setMarquee] = useState<MarqueeSelection | null>(null);
  const cornerDragRef = useRef<CornerDrag | null>(null);
  const marqueeRef = useRef<MarqueeSelection | null>(null);
  useCanvasTouch({
    containerRef,
    stageRef,
    ready: size.width > 0 && size.height > 0,
    roomId: document.id,
    setViewport,
    minScale: MIN_SCALE,
    maxScale: MAX_SCALE,
    cancelEdit: () => {
      cornerDragRef.current = null;
      setCornerDrag(null);
      setDraggedObject(null);
      setAlignmentGuides([]);
    },
  });
  const roomBounds = getRoomBounds(document.room);

  const fitRoom = useCallback(() => {
    if (!size.width || !size.height) return;
    const padding = Math.min(150, Math.max(72, size.width * 0.12));
    const scale = clamp(
      Math.min(
        (size.width - padding * 2) / roomBounds.width,
        (size.height - padding * 2) / roomBounds.height,
      ),
      MIN_SCALE,
      MAX_SCALE,
    );
    const labels = layoutWallLabels(document.room, document.units, scale);
    // Include asymmetric dimension rails when centering a fitted room.
    const left = Math.min(
      roomBounds.minX * scale,
      ...labels.map((label) => label.box.left),
    );
    const right = Math.max(
      (roomBounds.minX + roomBounds.width) * scale,
      ...labels.map((label) => label.box.right),
    );
    const top = Math.min(
      roomBounds.minY * scale,
      ...labels.map((label) => label.box.top),
    );
    const bottom = Math.max(
      (roomBounds.minY + roomBounds.height) * scale,
      ...labels.map((label) => label.box.bottom),
    );
    setViewport({
      scale,
      x: (size.width - left - right) / 2,
      y: (size.height - top - bottom) / 2,
    });
  }, [
    document.room,
    document.units,
    roomBounds.height,
    roomBounds.minX,
    roomBounds.minY,
    roomBounds.width,
    size,
  ]);

  useEffect(() => {
    if (!hydrated || !size.width || !size.height) return;
    const previous = lastLayout.current;
    if (!previous || previous.roomId !== document.id) fitRoom();
    else if (previous.width !== size.width || previous.height !== size.height) {
      setViewport((current) =>
        resizeViewport(current, previous, size, MIN_SCALE),
      );
    }
    lastLayout.current = { ...size, roomId: document.id };
  }, [document.id, hydrated, fitRoom, size]);

  const zoomAtCentre = (factor: number) => {
    const nextScale = clamp(viewport.scale * factor, MIN_SCALE, MAX_SCALE);
    const centre = { x: size.width / 2, y: size.height / 2 };
    const worldPoint = {
      x: (centre.x - viewport.x) / viewport.scale,
      y: (centre.y - viewport.y) / viewport.scale,
    };
    setViewport({
      scale: nextScale,
      x: centre.x - worldPoint.x * nextScale,
      y: centre.y - worldPoint.y * nextScale,
    });
  };

  const handleWheel = (event: KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault();
    const nativeEvent = event.evt as WheelEvent & { wheelDeltaY?: number };
    const wheelDelta = Math.abs(nativeEvent.wheelDeltaY ?? 0);
    const looksLikeMouseWheel =
      nativeEvent.deltaX === 0 &&
      (nativeEvent.deltaMode !== 0 ||
        (wheelDelta >= 100 && Math.abs(wheelDelta % 120) < 0.01));
    const isPinchZoom = nativeEvent.ctrlKey || nativeEvent.metaKey;

    if (!isPinchZoom && !looksLikeMouseWheel) {
      setViewport((current) => ({
        ...current,
        x: current.x - nativeEvent.deltaX,
        y: current.y - nativeEvent.deltaY,
      }));
      return;
    }

    const stage = stageRef.current;
    const pointer = stage?.getPointerPosition();
    if (!pointer) return;

    setViewport((current) => {
      const nextScale = clamp(
        current.scale *
          (isPinchZoom
            ? Math.exp(-nativeEvent.deltaY * 0.01)
            : nativeEvent.deltaY > 0
              ? 0.9
              : 1.1),
        MIN_SCALE,
        MAX_SCALE,
      );
      const worldPoint = {
        x: (pointer.x - current.x) / current.scale,
        y: (pointer.y - current.y) / current.scale,
      };
      return {
        scale: nextScale,
        x: pointer.x - worldPoint.x * nextScale,
        y: pointer.y - worldPoint.y * nextScale,
      };
    });
  };

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;

      // History belongs to the plan, even while a sidebar input has focus.
      // Prevent native text undo even when there are no canvas edits to undo.
      const command = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      if (command && (key === 'z' || key === 'y')) {
        event.preventDefault();
        if (usePlannerStore.getState().roomOperationPending) return;
        if (key === 'y' || event.shiftKey) redo();
        else undo();
        return;
      }

      const target = event.target;
      if (
        usePlannerStore.getState().roomOperationPending ||
        !(target instanceof Element) ||
        !target.closest('#planner-canvas') ||
        target.closest(
          'button, a, input, textarea, select, [contenteditable="true"], [role="button"], [role="menu"], [role="menuitem"], [role="slider"], [role="dialog"], [role="alertdialog"]',
        ) ||
        globalThis.document.querySelector(
          '[role="dialog"], [role="alertdialog"]',
        )
      )
        return;

      if (event.code === 'Space') {
        event.preventDefault();
        setSpacePressed(true);
        return;
      }

      if (command && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        duplicateSelection();
        return;
      }
      if (command && event.key.toLowerCase() === 'g') {
        event.preventDefault();
        if (event.shiftKey) ungroupSelection();
        else groupSelection();
        return;
      }
      if (
        command &&
        (event.code === 'BracketRight' || event.code === 'BracketLeft')
      ) {
        event.preventDefault();
        const movingForward = event.code === 'BracketRight';
        positionSelection(
          movingForward
            ? event.shiftKey
              ? 'bring-to-front'
              : 'bring-forward'
            : event.shiftKey
              ? 'send-to-back'
              : 'send-backward',
        );
        return;
      }

      const step = event.shiftKey ? document.gridSizeMm : document.snapSizeMm;
      const nudges: Partial<Record<string, { x: number; y: number }>> = {
        ArrowLeft: { x: -step, y: 0 },
        ArrowRight: { x: step, y: 0 },
        ArrowUp: { x: 0, y: -step },
        ArrowDown: { x: 0, y: step },
      };
      const delta = nudges[event.key];
      if (delta) {
        event.preventDefault();
        if (selectedCornerIndex !== null) {
          const corner = document.room.boundary[selectedCornerIndex];
          if (corner) {
            moveCorner(selectedCornerIndex, {
              x: corner.x + delta.x,
              y: corner.y + delta.y,
            });
          }
        } else {
          nudgeSelection(delta);
        }
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        if (selectedCornerIndex !== null) deleteSelectedCorner();
        else deleteSelection();
        return;
      }

      if (event.key === 'Escape' && tool === 'room') {
        setTool('select');
      }
    },
    [
      deleteSelectedCorner,
      deleteSelection,
      document.room.boundary,
      document.gridSizeMm,
      document.snapSizeMm,
      duplicateSelection,
      groupSelection,
      moveCorner,
      nudgeSelection,
      redo,
      positionSelection,
      selectedCornerIndex,
      setTool,
      tool,
      ungroupSelection,
      undo,
    ],
  );

  useEffect(() => {
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') setSpacePressed(false);
    };
    const handleWindowBlur = () => setSpacePressed(false);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const startMiddlePan = (event: MouseEvent) => {
      if (event.button !== 1) return;
      const stage = stageRef.current;
      if (!stage) return;
      event.preventDefault();
      event.stopPropagation();
      stage.setPointersPositions(event);
      setMiddleMousePanning(true);
      stage.draggable(true);
      stage.startDrag();
    };
    const preventMiddleClick = (event: MouseEvent) => {
      if (event.button === 1) event.preventDefault();
    };
    element.addEventListener('mousedown', startMiddlePan, true);
    element.addEventListener('auxclick', preventMiddleClick);
    return () => {
      element.removeEventListener('mousedown', startMiddlePan, true);
      element.removeEventListener('auxclick', preventMiddleClick);
    };
  }, [containerRef]);

  useEffect(() => {
    if (!middleMousePanning) return;
    const finishMiddlePan = (event: MouseEvent) => {
      if (event.button !== 1) return;
      const stage = stageRef.current;
      if (stage?.isDragging()) stage.stopDrag();
      if (stage) {
        setViewport((current) => ({
          ...current,
          x: stage.x(),
          y: stage.y(),
        }));
      }
      setMiddleMousePanning(false);
    };
    window.addEventListener('mouseup', finishMiddlePan);
    return () => window.removeEventListener('mouseup', finishMiddlePan);
  }, [middleMousePanning]);

  const clientToWorld = useCallback(
    (clientX: number, clientY: number): PointMm | null => {
      const bounds = containerRef.current?.getBoundingClientRect();
      if (!bounds) return null;
      return {
        x: (clientX - bounds.left - viewport.x) / viewport.scale,
        y: (clientY - bounds.top - viewport.y) / viewport.scale,
      };
    },
    [containerRef, viewport],
  );

  const finishMarquee = useCallback(
    (clientX?: number, clientY?: number) => {
      let active = marqueeRef.current;
      if (!active) return;

      if (clientX !== undefined && clientY !== undefined) {
        const end = clientToWorld(clientX, clientY);
        if (end) {
          active = {
            ...active,
            end,
            moved:
              active.moved ||
              Math.hypot(
                clientX - active.startClient.x,
                clientY - active.startClient.y,
              ) >= 4,
          };
        }
      }

      const selectedObjectIds = active.moved
        ? objectsIntersectingBounds(
            document.objects,
            boundsFromPoints(active.start, active.end),
          )
        : [];
      selectObjects(selectedObjectIds, active.additive);
      marqueeRef.current = null;
      setMarquee(null);
    },
    [clientToWorld, document.objects, selectObjects],
  );

  const marqueeActive = marquee !== null;
  useEffect(() => {
    if (!marqueeActive) return;

    const handleMouseMove = (event: MouseEvent) => {
      const active = marqueeRef.current;
      if (!active) return;
      if ((event.buttons & 1) === 0) {
        finishMarquee(event.clientX, event.clientY);
        return;
      }
      const end = clientToWorld(event.clientX, event.clientY);
      if (!end) return;
      const next = {
        ...active,
        end,
        moved:
          active.moved ||
          Math.hypot(
            event.clientX - active.startClient.x,
            event.clientY - active.startClient.y,
          ) >= 4,
      };
      marqueeRef.current = next;
      setMarquee(next);
    };
    const handleMouseUp = (event: MouseEvent) => {
      if (event.button === 0) finishMarquee(event.clientX, event.clientY);
    };
    const handleWindowBlur = () => finishMarquee();

    window.addEventListener('mousemove', handleMouseMove, true);
    window.addEventListener('mouseup', handleMouseUp, true);
    window.addEventListener('blur', handleWindowBlur);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove, true);
      window.removeEventListener('mouseup', handleMouseUp, true);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [clientToWorld, finishMarquee, marqueeActive]);

  const draggedAnchor = draggedObject
    ? document.objects.find((object) => object.id === draggedObject.id)
    : undefined;
  const dragDelta =
    draggedObject && draggedAnchor
      ? {
          x: draggedObject.position.x - draggedAnchor.positionMm.x,
          y: draggedObject.position.y - draggedAnchor.positionMm.y,
        }
      : null;
  const displayObject = (object: PlanObject): PlanObject =>
    attachWindow(
      dragDelta &&
        draggedObject?.objectIds.includes(object.id) &&
        !object.locked
        ? {
            ...object,
            positionMm: {
              x: object.positionMm.x + dragDelta.x,
              y: object.positionMm.y + dragDelta.y,
            },
          }
        : object,
      document.room,
    );

  const renderObject = (object: PlanObject) => {
    const movingIds = selectedIds.includes(object.id)
      ? selectedIds
      : [object.id];
    return (
      <ObjectFootprint
        key={object.id}
        object={displayObject(object)}
        selected={selectedIds.includes(object.id)}
        interactive={touchInput || !isActivelyPanning}
        draggable={!isActivelyPanning}
        onSelect={(additive) => {
          if (
            !additive &&
            selectedIds.length > 1 &&
            selectedIds.includes(object.id)
          ) {
            return;
          }
          selectObject(object.id, additive);
        }}
        onMove={(position) => {
          if (isWallAttached(object)) {
            const attached = attachWindow(
              { ...object, positionMm: position },
              document.room,
            );
            setAlignmentGuides([]);
            setDraggedObject({
              id: object.id,
              position: attached.positionMm,
              objectIds: movingIds,
            });
            return attached.positionMm;
          }
          if (!document.snapEnabled) {
            const freePosition = {
              x: Math.round(position.x),
              y: Math.round(position.y),
            };
            setAlignmentGuides([]);
            setDraggedObject({
              id: object.id,
              position: freePosition,
              objectIds: movingIds,
            });
            return freePosition;
          }
          const alignment = getObjectAlignmentSnap({
            movingObject: object,
            proposedPosition: position,
            objects: document.objects,
            room: document.room,
            excludedIds: movingIds,
            thresholdMm: ALIGNMENT_SNAP_THRESHOLD_PX / viewport.scale,
          });
          const snappedAxes = new Set(alignment.snappedAxes);
          const snappedPosition = {
            x: snappedAxes.has('x')
              ? alignment.position.x
              : snap(position.x, document.snapSizeMm),
            y: snappedAxes.has('y')
              ? alignment.position.y
              : snap(position.y, document.snapSizeMm),
          };
          setAlignmentGuides(alignment.guides);
          setDraggedObject({
            id: object.id,
            position: snappedPosition,
            objectIds: movingIds,
          });
          return snappedPosition;
        }}
        onMoveEnd={(position) => {
          moveSelectionTo(object.id, position);
          setDraggedObject(null);
          setAlignmentGuides([]);
        }}
      />
    );
  };

  const isPanning = spacePressed;
  const isActivelyPanning = isPanning || middleMousePanning;
  const zoomPercent = Math.round((viewport.scale / 0.12) * 100);
  const displayBoundary = document.room.boundary.map((point, index) =>
    cornerDrag?.index === index ? cornerDrag.position : point,
  );
  const displayBounds = insideRoomBounds({
    ...document.room,
    boundary: displayBoundary,
  });
  const wallMeasurements = layoutWallLabels(
    { ...document.room, boundary: displayBoundary },
    document.units,
    viewport.scale,
  );
  const boundaryPoints = displayBoundary.flatMap((point) => [point.x, point.y]);
  const marqueeBounds = marquee
    ? boundsFromPoints(marquee.start, marquee.end)
    : null;
  const overscanX = 20 / viewport.scale;
  const overscanY = 20 / viewport.scale;
  const visibleWorld = {
    minX: -viewport.x / viewport.scale - overscanX,
    minY: -viewport.y / viewport.scale - overscanY,
    maxX: (size.width - viewport.x) / viewport.scale + overscanX,
    maxY: (size.height - viewport.y) / viewport.scale + overscanY,
  };
  const wallRelativeHandleRadius =
    document.room.wallThicknessMm * HANDLE_TO_WALL_RADIUS_RATIO;
  const cornerRadius = Math.max(10 / viewport.scale, wallRelativeHandleRadius);
  const midpointRadius = Math.max(8 / viewport.scale, wallRelativeHandleRadius);
  const midpointIconHalfSize = Math.max(
    4 / viewport.scale,
    midpointRadius * 0.38,
  );
  const midpointIconStrokeWidth = Math.max(
    1.5 / viewport.scale,
    midpointRadius * 0.08,
  );
  const selectedObjects = document.objects.filter((object) =>
    selectedIds.includes(object.id),
  );
  const displayedSelectedObjects = selectedObjects.map(displayObject);
  const selectedObject =
    displayedSelectedObjects.length === 1
      ? displayedSelectedObjects[0]
      : undefined;
  const selectionBounds = getObjectsSelectionBounds(displayedSelectedObjects);
  const screenSelectionBounds = selectionBounds
    ? {
        minX: viewport.x + selectionBounds.minX * viewport.scale,
        maxX: viewport.x + selectionBounds.maxX * viewport.scale,
        minY: viewport.y + selectionBounds.minY * viewport.scale,
        maxY: viewport.y + selectionBounds.maxY * viewport.scale,
      }
    : null;
  const selectedSummary = selectedObject
    ? `${selectedObject.name} selected.`
    : selectedIds.length > 1
      ? `${selectedIds.length} objects selected.`
      : selectedCornerIndex !== null
        ? `Room corner ${selectedCornerIndex + 1} selected.`
        : 'Nothing selected.';

  return (
    // The application surface handles focus as well as pointer editing.
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <section
      ref={containerRef}
      id="planner-canvas"
      role="application"
      aria-roledescription="room plan editor"
      // The drawing surface owns keyboard editing and must be focusable.
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      onPointerDown={(event) => {
        if (event.target instanceof HTMLCanvasElement) {
          // Programmatic focus can inherit focus-visible from a text input.
          event.currentTarget.dataset.pointerFocus = 'true';
          event.currentTarget.focus({ preventScroll: true });
        }
      }}
      onBlur={(event) => {
        if (event.target === event.currentTarget)
          delete event.currentTarget.dataset.pointerFocus;
      }}
      aria-labelledby="room-plan-canvas-title"
      aria-describedby="room-plan-canvas-summary room-plan-canvas-help"
      className={`relative min-h-0 overflow-hidden overscroll-none [&_.konvajs-content]:touch-none [&_.konvajs-content]:select-none [&_.konvajs-content]:[-webkit-touch-callout:none] bg-[#eaf1f6] outline-none [&:focus-visible:not([data-pointer-focus])]:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 ${isActivelyPanning ? 'cursor-grabbing' : marqueeActive ? 'cursor-crosshair' : 'cursor-default'}`}
    >
      <h2 id="room-plan-canvas-title" className="sr-only">
        Room plan canvas
      </h2>
      <p id="room-plan-canvas-summary" className="sr-only" aria-live="polite">
        {document.room.name},{' '}
        {formatMeasurement(displayBounds.width, document.units)} inside width by{' '}
        {formatMeasurement(displayBounds.height, document.units)} deep.{' '}
        {wallMeasurements
          .map(
            (wall, index) =>
              `Wall ${index + 1} inside: ${formatWallMeasurement(wall.lengthMm, document.units)}.`,
          )
          .join(' ')}{' '}
        {document.objects.length} objects placed. {selectedSummary}
      </p>
      <p id="room-plan-canvas-help" className="sr-only">
        On touch screens, drag empty space to pan, tap an object to select it,
        and drag objects or room corners to move them. Use two fingers anywhere
        to pan and pinch to zoom. With a mouse, drag from empty canvas space to
        select multiple objects. Hold Shift while dragging to add to the
        selection. When snapping is on, objects show guides for nearby walls,
        object edges and centres. Room corners also align to object edges,
        object centres and other room corners. Use arrow keys to move the
        selection by the snap distance. Hold Shift with an arrow key to move by
        the grid distance. Press Delete to remove a selection, or hold Space and
        drag to pan. Wall labels display inside measurements. Walls under one
        metre use millimetre precision; longer walls use centimetres, even when
        snapping is off.
      </p>
      <div
        className={`absolute left-4 top-4 z-10 flex items-center rounded-[10px] border border-slate-200 bg-white p-1 shadow-[0_5px_18px_rgb(31_55_81/0.1)] ${sidebarOpen ? 'lg:hidden' : ''}`}
      >
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-11 lg:size-7"
          aria-label="Open object library"
          title="Open object library"
          onClick={onToggleSidebar}
        >
          <PanelLeftOpen aria-hidden="true" />
        </Button>
      </div>

      <div className="absolute right-4 top-4 z-10 flex items-center gap-1 rounded-[10px] border border-slate-200 bg-white p-1 shadow-[0_5px_18px_rgb(31_55_81/0.1)]">
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-11 lg:size-7"
          aria-label="Zoom out"
          onClick={() => zoomAtCentre(0.9)}
        >
          <Minus aria-hidden="true" />
        </Button>
        <span className="min-w-8 lg:min-w-14 text-center text-xs font-medium tabular-nums text-muted-foreground">
          {zoomPercent}%
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-11 lg:size-7"
          aria-label="Zoom in"
          onClick={() => zoomAtCentre(1.1)}
        >
          <Plus aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-11 lg:size-7"
          aria-label="Fit room to view"
          onClick={fitRoom}
        >
          <LocateFixed aria-hidden="true" />
        </Button>
      </div>

      {touchInput && (
        <p className="pointer-events-none absolute right-4 top-[76px] z-10 rounded bg-white/95 px-2 py-1 text-[11px] text-slate-600">
          Drag to move · Pinch to zoom
        </p>
      )}
      {selectionBounds && (
        <Button
          variant="outline"
          size="icon-sm"
          className={`absolute right-4 ${touchInput ? 'bottom-[148px]' : 'bottom-20'} z-20 size-11 bg-white`}
          aria-label="Reveal selection"
          onClick={() =>
            setViewport((current) => {
              const scale = Math.min(
                current.scale,
                (size.width - 64) /
                  Math.max(1, selectionBounds.maxX - selectionBounds.minX),
                (size.height - 160) /
                  Math.max(1, selectionBounds.maxY - selectionBounds.minY),
              );
              return {
                scale,
                x:
                  size.width / 2 -
                  ((selectionBounds.minX + selectionBounds.maxX) / 2) * scale,
                y:
                  size.height / 2 -
                  ((selectionBounds.minY + selectionBounds.maxY) / 2) * scale,
              };
            })
          }
        >
          <LocateFixed aria-hidden="true" />
        </Button>
      )}
      <svg
        className="pointer-events-none absolute inset-0 z-10 h-full w-full"
        aria-hidden="true"
      >
        {wallMeasurements.map(
          (wall, index) =>
            wall.anchor && (
              <line
                key={index}
                x1={viewport.x + wall.anchor.x * viewport.scale}
                y1={viewport.y + wall.anchor.y * viewport.scale}
                x2={viewport.x + wall.center.x * viewport.scale}
                y2={viewport.y + wall.center.y * viewport.scale}
                stroke="#64748b"
                strokeWidth="1"
              />
            ),
        )}
      </svg>
      {wallMeasurements.map((wall, index) => (
        <WallLengthLabel
          key={`${document.id}-${index}`}
          widthPx={wall.widthPx}
          wallIndex={index}
          lengthMm={wall.lengthMm}
          units={document.units}
          left={viewport.x + wall.center.x * viewport.scale}
          top={viewport.y + wall.center.y * viewport.scale}
          angleDeg={wall.angleDeg}
        />
      ))}
      {size.width > 0 && size.height > 0 && (
        <Stage
          ref={stageRef}
          width={size.width}
          height={size.height}
          x={viewport.x}
          y={viewport.y}
          scaleX={viewport.scale}
          scaleY={viewport.scale}
          draggable={isActivelyPanning}
          onWheel={handleWheel}
          onMouseDown={(event) => {
            const stage = event.target.getStage();
            if (
              event.target !== stage ||
              event.evt.button !== 0 ||
              isActivelyPanning
            ) {
              return;
            }
            const start = clientToWorld(event.evt.clientX, event.evt.clientY);
            if (!start) return;
            const next = {
              start,
              end: start,
              startClient: {
                x: event.evt.clientX,
                y: event.evt.clientY,
              },
              additive: event.evt.shiftKey,
              moved: false,
            };
            marqueeRef.current = next;
            setMarquee(next);
            if (!next.additive) clearSelection();
            setTool('select');
          }}
          onTap={(event) => {
            if (event.target === event.target.getStage()) {
              clearSelection();
              setTool('select');
            }
          }}
          onDragMove={(event) => {
            if (event.target !== event.target.getStage()) return;
            setViewport((current) => ({
              ...current,
              x: event.target.x(),
              y: event.target.y(),
            }));
          }}
          onDragEnd={(event) => {
            if (event.target !== event.target.getStage()) return;
            setViewport((current) => ({
              ...current,
              x: event.target.x(),
              y: event.target.y(),
            }));
            setMiddleMousePanning(false);
          }}
        >
          <Layer>
            {document.gridEnabled && (
              <Grid
                minX={visibleWorld.minX}
                minY={visibleWorld.minY}
                maxX={visibleWorld.maxX}
                maxY={visibleWorld.maxY}
                spacingMm={document.gridSizeMm}
                scale={viewport.scale}
                minorStroke="#d8e3eb"
                majorStroke="#b8cbdc"
              />
            )}
            <Line
              listening={false}
              points={boundaryPoints}
              closed
              fill="#fcfdff"
              shadowColor="#17345f"
              shadowBlur={80}
              shadowOpacity={0.14}
            />
            <Group
              listening={false}
              clipFunc={(context) => {
                const first = displayBoundary[0];
                context.beginPath();
                context.moveTo(first.x, first.y);
                for (const point of displayBoundary.slice(1)) {
                  context.lineTo(point.x, point.y);
                }
                context.closePath();
              }}
            >
              {document.gridEnabled && (
                <Grid
                  minX={visibleWorld.minX}
                  minY={visibleWorld.minY}
                  maxX={visibleWorld.maxX}
                  maxY={visibleWorld.maxY}
                  spacingMm={document.gridSizeMm}
                  scale={viewport.scale}
                  minorStroke="#d3dfeb"
                  majorStroke="#a9bfd2"
                />
              )}
            </Group>
            <Line
              listening={false}
              points={boundaryPoints}
              closed
              stroke="#183153"
              strokeWidth={document.room.wallThicknessMm}
              lineJoin="miter"
            />
            {displayBoundary.map((point, index) => {
              const next =
                displayBoundary[(index + 1) % displayBoundary.length];
              return (
                <Line
                  key={`wall-${index}`}
                  points={[point.x, point.y, next.x, next.y]}
                  stroke="#183153"
                  strokeWidth={document.room.wallThicknessMm}
                  hitStrokeWidth={
                    document.room.wallThicknessMm +
                    (WALL_HIT_PADDING_PX * 2) / viewport.scale
                  }
                  onClick={(event) => {
                    event.cancelBubble = true;
                    setTool('room');
                  }}
                  onTap={(event) => {
                    event.cancelBubble = true;
                    setTool('room');
                  }}
                />
              );
            })}
          </Layer>
          <Layer>
            {document.objects
              .filter(
                (object) =>
                  selectedIds.includes(object.id) ||
                  boundsIntersect(
                    getObjectSelectionBounds(displayObject(object)),
                    visibleWorld,
                  ),
              )
              .map(renderObject)}
          </Layer>
          {selectedObject && (
            <Layer listening={false}>
              <Group
                x={selectedObject.positionMm.x}
                y={selectedObject.positionMm.y}
                rotation={selectedObject.rotationDeg}
              >
                <Rect
                  x={-selectedObject.widthMm / 2}
                  y={-selectedObject.depthMm / 2}
                  width={selectedObject.widthMm}
                  height={selectedObject.depthMm}
                  stroke="#2563eb"
                  strokeWidth={1 / viewport.scale}
                  dash={[4 / viewport.scale, 3 / viewport.scale]}
                />
              </Group>
            </Layer>
          )}
          {displayedSelectedObjects.length > 1 && selectionBounds && (
            <Layer listening={false}>
              <Rect
                x={selectionBounds.minX - 12 / viewport.scale}
                y={selectionBounds.minY - 12 / viewport.scale}
                width={
                  selectionBounds.maxX -
                  selectionBounds.minX +
                  24 / viewport.scale
                }
                height={
                  selectionBounds.maxY -
                  selectionBounds.minY +
                  24 / viewport.scale
                }
                fill="rgba(29, 100, 207, 0.025)"
                stroke="#1d64cf"
                strokeWidth={1.5}
                strokeScaleEnabled={false}
                dash={[8 / viewport.scale, 5 / viewport.scale]}
                cornerRadius={4 / viewport.scale}
              />
            </Layer>
          )}
          {alignmentGuides.length > 0 && (
            <Layer listening={false}>
              {alignmentGuides.map((guide) => {
                const overshoot = ALIGNMENT_GUIDE_OVERSHOOT_PX / viewport.scale;
                const points = alignmentGuidePoints(guide, overshoot);
                const key =
                  guide.axis === 'free'
                    ? `free-${guide.points.join('-')}`
                    : `${guide.axis}-${guide.position}`;
                return (
                  <Group key={key}>
                    <Line
                      points={points}
                      stroke={ALIGNMENT_GUIDE_HALO}
                      strokeWidth={ALIGNMENT_GUIDE_HALO_WIDTH_PX}
                      strokeScaleEnabled={false}
                    />
                    <Line
                      points={points}
                      stroke={ALIGNMENT_GUIDE_STROKE}
                      strokeWidth={ALIGNMENT_GUIDE_STROKE_WIDTH_PX}
                      strokeScaleEnabled={false}
                    />
                  </Group>
                );
              })}
            </Layer>
          )}
          {marqueeBounds && marquee?.moved && (
            <Layer listening={false}>
              <Rect
                x={marqueeBounds.minX}
                y={marqueeBounds.minY}
                width={marqueeBounds.maxX - marqueeBounds.minX}
                height={marqueeBounds.maxY - marqueeBounds.minY}
                fill="rgba(47, 125, 244, 0.12)"
                stroke="#1d64cf"
                strokeWidth={1.5}
                strokeScaleEnabled={false}
                dash={[8 / viewport.scale, 4 / viewport.scale]}
                cornerRadius={3 / viewport.scale}
              />
            </Layer>
          )}
          {tool === 'room' && (
            <Layer>
              {displayBoundary.map((point, index) => {
                const next =
                  displayBoundary[(index + 1) % displayBoundary.length];
                const centre = midpoint(point, next);
                return (
                  <Group key={`edge-${index}`} x={centre.x} y={centre.y}>
                    <Circle
                      radius={midpointRadius}
                      fill="#ffffff"
                      stroke="#64748b"
                      strokeWidth={1.5}
                      strokeScaleEnabled={false}
                      hitStrokeWidth={8}
                      opacity={0.94}
                      onClick={(event) => {
                        event.cancelBubble = true;
                        insertCorner(index);
                      }}
                      onTap={(event) => {
                        event.cancelBubble = true;
                        insertCorner(index);
                      }}
                    />
                    <Line
                      listening={false}
                      points={[
                        -midpointIconHalfSize,
                        0,
                        midpointIconHalfSize,
                        0,
                      ]}
                      stroke="#334155"
                      strokeWidth={midpointIconStrokeWidth}
                      lineCap="round"
                    />
                    <Line
                      listening={false}
                      points={[
                        0,
                        -midpointIconHalfSize,
                        0,
                        midpointIconHalfSize,
                      ]}
                      stroke="#334155"
                      strokeWidth={midpointIconStrokeWidth}
                      lineCap="round"
                    />
                  </Group>
                );
              })}

              {displayBoundary.map((point, index) => (
                <Circle
                  key={`corner-${index}`}
                  name="touch-corner"
                  x={point.x}
                  y={point.y}
                  radius={
                    selectedCornerIndex === index
                      ? cornerRadius * 1.2
                      : cornerRadius
                  }
                  fill={selectedCornerIndex === index ? '#2563eb' : '#ffffff'}
                  stroke="#1d4ed8"
                  strokeWidth={2}
                  strokeScaleEnabled={false}
                  hitStrokeWidth={10}
                  shadowColor="#17345f"
                  shadowBlur={selectedCornerIndex === index ? 12 : 5}
                  shadowOpacity={0.24}
                  draggable={!isActivelyPanning}
                  onMouseDown={(event) => {
                    event.cancelBubble = true;
                    selectCorner(index);
                  }}
                  onTap={(event) => {
                    event.cancelBubble = true;
                    selectCorner(index);
                  }}
                  onDragStart={(event) => {
                    event.cancelBubble = true;
                    selectCorner(index);
                    setAlignmentGuides([]);
                    const drag = { index, position: point };
                    cornerDragRef.current = drag;
                    setCornerDrag(drag);
                  }}
                  onDragMove={(event) => {
                    event.cancelBubble = true;
                    const proposedPosition = {
                      x: event.target.x(),
                      y: event.target.y(),
                    };
                    let guides: AlignmentGuide[] = [];
                    let position: PointMm;
                    if (document.snapEnabled) {
                      const alignment = getCornerAlignmentSnap({
                        proposedPosition,
                        boundary: document.room.boundary,
                        cornerIndex: index,
                        objects: document.objects,
                        thresholdMm:
                          ALIGNMENT_SNAP_THRESHOLD_PX / viewport.scale,
                      });
                      const snappedAxes = new Set(alignment.snappedAxes);
                      position = {
                        x: snappedAxes.has('x')
                          ? alignment.position.x
                          : proposedPosition.x,
                        y: snappedAxes.has('y')
                          ? alignment.position.y
                          : proposedPosition.y,
                      };
                      guides = alignment.guides;
                    } else {
                      position = {
                        x: Math.round(proposedPosition.x),
                        y: Math.round(proposedPosition.y),
                      };
                    }
                    const beforeRounding = position;
                    position = snapWallCorner(document.room, index, position);
                    // Do not display exact-alignment guides after wall rounding moved off them.
                    if (
                      position.x !== beforeRounding.x ||
                      position.y !== beforeRounding.y
                    )
                      guides = [];
                    const candidate = document.room.boundary.map(
                      (candidatePoint, candidateIndex) =>
                        candidateIndex === index ? position : candidatePoint,
                    );
                    if (isSimplePolygon(candidate)) {
                      event.target.position(position);
                      setAlignmentGuides(guides);
                      const drag = { index, position };
                      cornerDragRef.current = drag;
                      setCornerDrag(drag);
                    } else {
                      setAlignmentGuides([]);
                      event.target.position(
                        cornerDragRef.current?.position ?? point,
                      );
                    }
                  }}
                  onDragEnd={(event) => {
                    event.cancelBubble = true;
                    const finalPosition =
                      cornerDragRef.current?.index === index
                        ? cornerDragRef.current.position
                        : point;
                    event.target.position(finalPosition);
                    moveCorner(index, finalPosition);
                    cornerDragRef.current = null;
                    setCornerDrag(null);
                    setAlignmentGuides([]);
                  }}
                />
              ))}
            </Layer>
          )}
        </Stage>
      )}

      {(roomGeometryError || mountingWarning) && (
        <output
          aria-live="polite"
          className="absolute left-1/2 top-4 z-20 max-w-md -translate-x-1/2 rounded-lg border border-destructive/30 bg-card/95 px-3 py-2 text-center text-xs text-destructive shadow-sm backdrop-blur"
        >
          {roomGeometryError || mountingWarning}
        </output>
      )}
      {selectedObject && screenSelectionBounds && (
        <ObjectFloatingToolbar
          key={selectedObject.id}
          object={selectedObject}
          selectionBounds={screenSelectionBounds}
        />
      )}
      {displayedSelectedObjects.length > 1 && screenSelectionBounds && (
        <MultiObjectFloatingToolbar
          key={displayedSelectedObjects.map((object) => object.id).join(':')}
          objects={displayedSelectedObjects}
          selectionBounds={screenSelectionBounds}
        />
      )}
      <CanvasSpacingControls />
    </section>
  );
}
