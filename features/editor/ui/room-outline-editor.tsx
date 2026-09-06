'use client';

import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { usePlannerStore } from '../state/planner-store';
import { MAX_ROOM_CORNERS } from '../domain/plan-document';
import { ScrubbableNumberInput } from './scrubbable-number-input';

/** A DOM alternative to every outline operation on the canvas. */
export function RoomOutlineEditor() {
  const id = useId();
  const room = usePlannerStore((state) => state.document.room);
  const index = usePlannerStore((state) => state.selectedCornerIndex) ?? 0;
  const select = usePlannerStore((state) => state.selectCorner);
  const move = usePlannerStore((state) => state.moveCorner);
  const insert = usePlannerStore((state) => state.insertCorner);
  const remove = usePlannerStore((state) => state.deleteSelectedCorner);
  const error = usePlannerStore((state) => state.roomGeometryError);
  const activeIndex = Math.min(index, room.boundary.length - 1);
  const corner = room.boundary[activeIndex];
  return (
    <details className="border-t pt-2">
      <summary className="flex min-h-11 cursor-pointer items-center font-medium focus-visible:outline-2 focus-visible:outline-blue-600">
        Edit room corners
      </summary>
      <div className="space-y-3 py-2">
        <p className="text-xs text-muted-foreground">
          Corners use wall centreline coordinates in centimetres. Choose a
          corner to move it, add one on the following wall, or remove it.
          Changes also support Undo.
        </p>
        <Label htmlFor={id}>Corner</Label>
        <select
          id={id}
          className="h-11 w-full rounded-md border bg-background px-2"
          value={activeIndex}
          onChange={(event) => select(Number(event.target.value))}
        >
          {room.boundary.map((_, i) => (
            <option key={i} value={i}>
              Corner {i + 1}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-3">
          {(['x', 'y'] as const).map((axis) => (
            <label key={`${activeIndex}:${axis}`} className="space-y-1">
              <span>{axis.toUpperCase()} (cm)</span>
              <ScrubbableNumberInput
                aria-label={`Corner ${axis.toUpperCase()} in centimetres`}
                value={corner[axis] / 10}
                min={-100000}
                max={100000}
                step={1}
                onValueChange={(value) =>
                  move(activeIndex, {
                    ...corner,
                    [axis]: Math.round(value * 10),
                  })
                }
              />
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="min-h-11"
            disabled={room.boundary.length >= MAX_ROOM_CORNERS}
            onClick={() => insert(activeIndex)}
          >
            Add corner after this
          </Button>
          <Button
            variant="outline"
            className="min-h-11"
            disabled={room.boundary.length <= 3}
            onClick={() => {
              select(activeIndex);
              remove();
              if (
                usePlannerStore.getState().document.room.boundary.length <
                room.boundary.length
              )
                select(
                  Math.min(
                    activeIndex,
                    usePlannerStore.getState().document.room.boundary.length -
                      1,
                  ),
                );
            }}
          >
            Remove corner
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    </details>
  );
}
