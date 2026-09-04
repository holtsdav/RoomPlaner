'use client';

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import {
  Crosshair,
  Grid2X2,
  Hand,
  LocateFixed,
  Minus,
  MousePointer2,
  Plus,
  Spline,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Circle, Group, Layer, Line, Stage, Text } from 'react-konva';
import { Button } from '@/components/ui/button';
import {
  formatMillimetres,
  getRoomBounds,
  type PlanObject,
} from '../domain/plan-document';
import { midpoint } from '../domain/polygon';
import { usePlannerStore } from '../state/planner-store';
import { ObjectFootprint } from './object-footprint';

const MIN_SCALE = 0.04;
const MAX_SCALE = 0.8;
const GRID_MM = 100;

type Viewport = { x: number; y: number; scale: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function snap(value: number) {
  return Math.round(value / 10) * 10;
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
}: {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}) {
  const lines = useMemo(() => {
    const result: React.ReactNode[] = [];

    const firstX = Math.ceil(minX / GRID_MM) * GRID_MM;
    const firstY = Math.ceil(minY / GRID_MM) * GRID_MM;
    for (let x = firstX; x < maxX; x += GRID_MM) {
      const major = x % 500 === 0;
      result.push(
        <Line
          key={`x-${x}`}
          listening={false}
          points={[x, minY, x, maxY]}
          stroke={major ? '#b9cbe2' : '#d9e4f1'}
          strokeWidth={major ? 1.25 : 0.75}
          strokeScaleEnabled={false}
        />,
      );
    }

    for (let y = firstY; y < maxY; y += GRID_MM) {
      const major = y % 500 === 0;
      result.push(
        <Line
          key={`y-${y}`}
          listening={false}
          points={[minX, y, maxX, y]}
          stroke={major ? '#b9cbe2' : '#d9e4f1'}
          strokeWidth={major ? 1.25 : 0.75}
          strokeScaleEnabled={false}
        />,
      );
    }

    return result;
  }, [maxX, maxY, minX, minY]);

  return <>{lines}</>;
}

export function PlannerCanvas() {
  const { ref: containerRef, size } = useContainerSize();
  const stageRef = useRef<Konva.Stage>(null);
  const hasFitted = useRef(false);
  const document = usePlannerStore((state) => state.document);
  const selectedIds = usePlannerStore((state) => state.selectedIds);
  const selectedCornerIndex = usePlannerStore(
    (state) => state.selectedCornerIndex,
  );
  const tool = usePlannerStore((state) => state.tool);
  const setTool = usePlannerStore((state) => state.setTool);
  const selectObject = usePlannerStore((state) => state.selectObject);
  const clearSelection = usePlannerStore((state) => state.clearSelection);
  const selectCorner = usePlannerStore((state) => state.selectCorner);
  const moveSelectionTo = usePlannerStore((state) => state.moveSelectionTo);
  const nudgeSelection = usePlannerStore((state) => state.nudgeSelection);
  const duplicateSelection = usePlannerStore(
    (state) => state.duplicateSelection,
  );
  const deleteSelection = usePlannerStore((state) => state.deleteSelection);
  const moveCorner = usePlannerStore((state) => state.moveCorner);
  const insertCorner = usePlannerStore((state) => state.insertCorner);
  const deleteSelectedCorner = usePlannerStore(
    (state) => state.deleteSelectedCorner,
  );
  const roomGeometryError = usePlannerStore((state) => state.roomGeometryError);
  const undo = usePlannerStore((state) => state.undo);
  const redo = usePlannerStore((state) => state.redo);
  const [viewport, setViewport] = useState<Viewport>({
    x: 100,
    y: 100,
    scale: 0.12,
  });
  const [spacePressed, setSpacePressed] = useState(false);
  const bounds = getRoomBounds(document.room);

  const fitRoom = useCallback(() => {
    if (!size.width || !size.height) return;
    const padding = Math.min(150, Math.max(72, size.width * 0.12));
    const scale = clamp(
      Math.min(
        (size.width - padding * 2) / bounds.width,
        (size.height - padding * 2) / bounds.height,
      ),
      MIN_SCALE,
      MAX_SCALE,
    );
    setViewport({
      scale,
      x: size.width / 2 - (bounds.minX + bounds.width / 2) * scale,
      y: size.height / 2 - (bounds.minY + bounds.height / 2) * scale,
    });
  }, [bounds.height, bounds.minX, bounds.minY, bounds.width, size]);

  useEffect(() => {
    if (hasFitted.current || !size.width || !size.height) return;
    hasFitted.current = true;
    fitRoom();
  }, [fitRoom, size]);

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
    const stage = stageRef.current;
    const pointer = stage?.getPointerPosition();
    if (!pointer) return;

    const nextScale = clamp(
      viewport.scale * (event.evt.deltaY > 0 ? 0.9 : 1.1),
      MIN_SCALE,
      MAX_SCALE,
    );
    const worldPoint = {
      x: (pointer.x - viewport.x) / viewport.scale,
      y: (pointer.y - viewport.y) / viewport.scale,
    };
    setViewport({
      scale: nextScale,
      x: pointer.x - worldPoint.x * nextScale,
      y: pointer.y - worldPoint.y * nextScale,
    });
  };

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target instanceof HTMLElement && event.target.isContentEditable)
      ) {
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault();
        setSpacePressed(true);
        return;
      }

      const command = event.metaKey || event.ctrlKey;
      if (command && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (command && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
        return;
      }
      if (command && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        duplicateSelection();
        return;
      }

      const step = event.shiftKey ? 100 : 10;
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
      duplicateSelection,
      moveCorner,
      nudgeSelection,
      redo,
      selectedCornerIndex,
      setTool,
      tool,
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

  const renderObject = (object: PlanObject) => (
    <ObjectFootprint
      key={object.id}
      object={object}
      selected={selectedIds.includes(object.id)}
      interactive={tool === 'select' && !spacePressed}
      onSelect={(additive) => selectObject(object.id, additive)}
      onMoveEnd={(position) =>
        moveSelectionTo(object.id, {
          x: snap(position.x),
          y: snap(position.y),
        })
      }
    />
  );

  const isPanning = tool === 'pan' || spacePressed;
  const zoomPercent = Math.round((viewport.scale / 0.12) * 100);
  const boundaryPoints = document.room.boundary.flatMap((point) => [
    point.x,
    point.y,
  ]);
  const cornerRadius = 10 / viewport.scale;
  const midpointRadius = 8 / viewport.scale;

  return (
    <div
      ref={containerRef}
      aria-label="Room plan canvas"
      className={`relative min-h-0 overflow-hidden bg-[#eaf1f8] ${isPanning ? 'cursor-grab' : 'cursor-default'}`}
    >
      <div className="absolute left-4 top-4 z-10 flex items-center gap-1 rounded-xl border bg-card/95 p-1 shadow-sm backdrop-blur">
        <Button
          variant={tool === 'select' ? 'secondary' : 'ghost'}
          size="icon-sm"
          aria-label="Select tool"
          aria-pressed={tool === 'select'}
          onClick={() => setTool('select')}
        >
          <MousePointer2 aria-hidden="true" />
        </Button>
        <Button
          variant={tool === 'pan' ? 'secondary' : 'ghost'}
          size="icon-sm"
          aria-label="Pan tool"
          aria-pressed={tool === 'pan'}
          onClick={() => setTool('pan')}
        >
          <Hand aria-hidden="true" />
        </Button>
        <Button
          variant={tool === 'room' ? 'secondary' : 'ghost'}
          size="icon-sm"
          aria-label="Edit room corners"
          aria-pressed={tool === 'room'}
          onClick={() => setTool('room')}
        >
          <Spline aria-hidden="true" />
        </Button>
      </div>

      <div className="absolute right-4 top-4 z-10 flex items-center gap-1 rounded-xl border bg-card/95 p-1 shadow-sm backdrop-blur">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Zoom out"
          onClick={() => zoomAtCentre(0.9)}
        >
          <Minus aria-hidden="true" />
        </Button>
        <span className="min-w-14 text-center text-xs font-medium tabular-nums text-muted-foreground">
          {zoomPercent}%
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Zoom in"
          onClick={() => zoomAtCentre(1.1)}
        >
          <Plus aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Fit room to view"
          onClick={fitRoom}
        >
          <LocateFixed aria-hidden="true" />
        </Button>
      </div>

      {size.width > 0 && size.height > 0 && (
        <Stage
          ref={stageRef}
          width={size.width}
          height={size.height}
          x={viewport.x}
          y={viewport.y}
          scaleX={viewport.scale}
          scaleY={viewport.scale}
          draggable={isPanning}
          onWheel={handleWheel}
          onMouseDown={(event) => {
            if (event.target === event.target.getStage()) clearSelection();
          }}
          onTouchStart={(event) => {
            if (event.target === event.target.getStage()) clearSelection();
          }}
          onDragEnd={(event) => {
            if (event.target !== event.target.getStage()) return;
            setViewport((current) => ({
              ...current,
              x: event.target.x(),
              y: event.target.y(),
            }));
          }}
        >
          <Layer listening={false}>
            <Line
              points={boundaryPoints}
              closed
              fill="#fbfdff"
              shadowColor="#17345f"
              shadowBlur={80}
              shadowOpacity={0.14}
            />
            <Group
              clipFunc={(context) => {
                const first = document.room.boundary[0];
                context.beginPath();
                context.moveTo(first.x, first.y);
                for (const point of document.room.boundary.slice(1)) {
                  context.lineTo(point.x, point.y);
                }
                context.closePath();
              }}
            >
              <Grid
                minX={bounds.minX}
                minY={bounds.minY}
                maxX={bounds.maxX}
                maxY={bounds.maxY}
              />
            </Group>
            <Line
              points={boundaryPoints}
              closed
              stroke="#183153"
              strokeWidth={document.room.wallThicknessMm}
              lineJoin="miter"
            />
            <Text
              x={bounds.minX}
              y={bounds.minY - 210}
              width={bounds.width}
              align="center"
              text={formatMillimetres(bounds.width)}
              fill="#46617f"
              fontSize={90}
            />
            <Text
              x={bounds.minX - 360}
              y={bounds.minY + bounds.height / 2 + 220}
              width={bounds.height}
              align="center"
              rotation={-90}
              text={formatMillimetres(bounds.height)}
              fill="#46617f"
              fontSize={90}
            />
          </Layer>
          <Layer>{document.objects.map(renderObject)}</Layer>
          {tool === 'room' && (
            <Layer>
              {document.room.boundary.map((point, index) => {
                const next =
                  document.room.boundary[
                    (index + 1) % document.room.boundary.length
                  ];
                const centre = midpoint(point, next);
                return (
                  <Group
                    key={`edge-${index}`}
                    x={centre.x}
                    y={centre.y}
                    onClick={(event) => {
                      event.cancelBubble = true;
                      insertCorner(index);
                    }}
                    onTap={(event) => {
                      event.cancelBubble = true;
                      insertCorner(index);
                    }}
                  >
                    <Circle
                      radius={midpointRadius}
                      fill="#ffffff"
                      stroke="#64748b"
                      strokeWidth={1.5}
                      strokeScaleEnabled={false}
                      hitStrokeWidth={20 / viewport.scale}
                      opacity={0.94}
                    />
                    <Text
                      listening={false}
                      x={-midpointRadius}
                      y={-midpointRadius}
                      width={midpointRadius * 2}
                      height={midpointRadius * 2}
                      text="+"
                      align="center"
                      verticalAlign="middle"
                      fontSize={14 / viewport.scale}
                      fill="#334155"
                    />
                  </Group>
                );
              })}

              {document.room.boundary.map((point, index) => (
                <Circle
                  key={`corner-${index}`}
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
                  hitStrokeWidth={24 / viewport.scale}
                  shadowColor="#17345f"
                  shadowBlur={selectedCornerIndex === index ? 12 : 5}
                  shadowOpacity={0.24}
                  draggable
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
                  }}
                  onDragEnd={(event) => {
                    event.cancelBubble = true;
                    moveCorner(index, {
                      x: event.target.x(),
                      y: event.target.y(),
                    });
                  }}
                />
              ))}
            </Layer>
          )}
        </Stage>
      )}

      {roomGeometryError && (
        <output
          aria-live="polite"
          className="absolute left-1/2 top-4 z-20 max-w-md -translate-x-1/2 rounded-lg border border-destructive/30 bg-card/95 px-3 py-2 text-center text-xs text-destructive shadow-sm backdrop-blur"
        >
          {roomGeometryError}
        </output>
      )}

      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full border bg-card/95 px-4 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur">
        {tool === 'room' ? (
          <span>
            Drag a corner · select + on a wall to add one · Delete removes
          </span>
        ) : (
          <>
            <span className="flex items-center gap-1.5">
              <Grid2X2 className="size-3.5" aria-hidden="true" />
              100 mm grid
            </span>
            <span className="h-3 w-px bg-border" />
            <span className="flex items-center gap-1.5">
              <Crosshair className="size-3.5" aria-hidden="true" />
              10 mm snap
            </span>
          </>
        )}
      </div>
    </div>
  );
}
