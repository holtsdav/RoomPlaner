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
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layer, Line, Rect, Stage, Text } from 'react-konva';
import { Button } from '@/components/ui/button';
import {
  formatMillimetres,
  getRoomBounds,
  type PlanObject,
} from '../domain/plan-document';
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

function Grid({ width, height }: { width: number; height: number }) {
  const lines = useMemo(() => {
    const result: React.ReactNode[] = [];

    for (let x = GRID_MM; x < width; x += GRID_MM) {
      const major = x % 500 === 0;
      result.push(
        <Line
          key={`x-${x}`}
          listening={false}
          points={[x, 0, x, height]}
          stroke={major ? '#b9cbe2' : '#d9e4f1'}
          strokeWidth={major ? 1.25 : 0.75}
          strokeScaleEnabled={false}
        />,
      );
    }

    for (let y = GRID_MM; y < height; y += GRID_MM) {
      const major = y % 500 === 0;
      result.push(
        <Line
          key={`y-${y}`}
          listening={false}
          points={[0, y, width, y]}
          stroke={major ? '#b9cbe2' : '#d9e4f1'}
          strokeWidth={major ? 1.25 : 0.75}
          strokeScaleEnabled={false}
        />,
      );
    }

    return result;
  }, [height, width]);

  return <>{lines}</>;
}

export function PlannerCanvas() {
  const { ref: containerRef, size } = useContainerSize();
  const stageRef = useRef<Konva.Stage>(null);
  const hasFitted = useRef(false);
  const document = usePlannerStore((state) => state.document);
  const selectedIds = usePlannerStore((state) => state.selectedIds);
  const tool = usePlannerStore((state) => state.tool);
  const setTool = usePlannerStore((state) => state.setTool);
  const selectObject = usePlannerStore((state) => state.selectObject);
  const clearSelection = usePlannerStore((state) => state.clearSelection);
  const moveSelectionTo = usePlannerStore((state) => state.moveSelectionTo);
  const nudgeSelection = usePlannerStore((state) => state.nudgeSelection);
  const duplicateSelection = usePlannerStore(
    (state) => state.duplicateSelection,
  );
  const deleteSelection = usePlannerStore((state) => state.deleteSelection);
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
        nudgeSelection(delta);
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        deleteSelection();
      }
    },
    [deleteSelection, duplicateSelection, nudgeSelection, redo, undo],
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
            <Rect
              x={bounds.minX}
              y={bounds.minY}
              width={bounds.width}
              height={bounds.height}
              fill="#fbfdff"
              shadowColor="#17345f"
              shadowBlur={80}
              shadowOpacity={0.14}
            />
            <Grid width={bounds.width} height={bounds.height} />
            <Rect
              x={bounds.minX}
              y={bounds.minY}
              width={bounds.width}
              height={bounds.height}
              stroke="#183153"
              strokeWidth={document.room.wallThicknessMm}
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
        </Stage>
      )}

      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full border bg-card/95 px-4 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur">
        <span className="flex items-center gap-1.5">
          <Grid2X2 className="size-3.5" aria-hidden="true" />
          100 mm grid
        </span>
        <span className="h-3 w-px bg-border" />
        <span className="flex items-center gap-1.5">
          <Crosshair className="size-3.5" aria-hidden="true" />
          10 mm snap
        </span>
      </div>
    </div>
  );
}
