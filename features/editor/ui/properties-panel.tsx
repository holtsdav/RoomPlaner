'use client';

import { Copy, Lock, Trash2, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { getRoomBounds, type PlanObject } from '../domain/plan-document';
import { usePlannerStore } from '../state/planner-store';

type NumberFieldProps = {
  label: string;
  value: number;
  min?: number;
  suffix?: string;
  onCommit: (value: number) => boolean | void;
};

function NumberField({
  label,
  value,
  min,
  suffix = 'mm',
  onCommit,
}: NumberFieldProps) {
  const commit = (input: HTMLInputElement) => {
    const nextValue = Math.round(Number(input.value));
    if (!Number.isFinite(nextValue) || (min !== undefined && nextValue < min)) {
      input.value = String(value);
      return;
    }
    if (nextValue !== value && onCommit(nextValue) === false) {
      input.value = String(value);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={`property-${label}`}
        className="text-xs text-muted-foreground"
      >
        {label}
      </Label>
      <div className="relative">
        <Input
          key={value}
          id={`property-${label}`}
          inputMode="numeric"
          defaultValue={value}
          onBlur={(event) => commit(event.currentTarget)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
            if (event.key === 'Escape') {
              event.currentTarget.value = String(value);
              event.currentTarget.blur();
            }
          }}
          className="h-9 pr-10 text-sm tabular-nums"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-xs text-muted-foreground">
          {suffix}
        </span>
      </div>
    </div>
  );
}

function SingleObjectProperties({ object }: { object: PlanObject }) {
  const updateSelectedObject = usePlannerStore(
    (state) => state.updateSelectedObject,
  );
  const duplicateSelection = usePlannerStore(
    (state) => state.duplicateSelection,
  );
  const deleteSelection = usePlannerStore((state) => state.deleteSelection);

  return (
    <>
      <div>
        <p className="text-sm font-semibold">Properties</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {object.name}
        </p>
      </div>
      <Separator className="my-5" />

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="X"
          value={object.positionMm.x}
          onCommit={(x) =>
            updateSelectedObject({
              positionMm: { ...object.positionMm, x },
            })
          }
        />
        <NumberField
          label="Y"
          value={object.positionMm.y}
          onCommit={(y) =>
            updateSelectedObject({
              positionMm: { ...object.positionMm, y },
            })
          }
        />
        <NumberField
          label="Width"
          value={object.widthMm}
          min={1}
          onCommit={(widthMm) => updateSelectedObject({ widthMm })}
        />
        <NumberField
          label="Depth"
          value={object.depthMm}
          min={1}
          onCommit={(depthMm) => updateSelectedObject({ depthMm })}
        />
      </div>

      <div className="mt-3">
        <NumberField
          label="Rotation"
          value={object.rotationDeg}
          suffix="°"
          onCommit={(rotationDeg) => updateSelectedObject({ rotationDeg })}
        />
      </div>

      <Separator className="my-5" />
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={duplicateSelection}>
          <Copy aria-hidden="true" />
          Duplicate
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => updateSelectedObject({ locked: !object.locked })}
        >
          {object.locked ? (
            <Unlock aria-hidden="true" />
          ) : (
            <Lock aria-hidden="true" />
          )}
          {object.locked ? 'Unlock' : 'Lock'}
        </Button>
      </div>
      <Button
        variant="destructive"
        size="sm"
        className="mt-2 w-full"
        disabled={object.locked}
        onClick={deleteSelection}
      >
        <Trash2 aria-hidden="true" />
        Delete object
      </Button>

      <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
        Arrow keys move by 10 mm. Hold Shift for 100 mm.
      </p>
    </>
  );
}

function CornerProperties({ cornerIndex }: { cornerIndex: number }) {
  const document = usePlannerStore((state) => state.document);
  const moveCorner = usePlannerStore((state) => state.moveCorner);
  const deleteSelectedCorner = usePlannerStore(
    (state) => state.deleteSelectedCorner,
  );
  const corner = document.room.boundary[cornerIndex];

  if (!corner) return null;

  return (
    <>
      <p className="text-sm font-semibold">Corner {cornerIndex + 1}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Exact position in the room
      </p>
      <Separator className="my-5" />
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Corner X"
          value={corner.x}
          onCommit={(x) => moveCorner(cornerIndex, { ...corner, x })}
        />
        <NumberField
          label="Corner Y"
          value={corner.y}
          onCommit={(y) => moveCorner(cornerIndex, { ...corner, y })}
        />
      </div>
      <Button
        variant="destructive"
        size="sm"
        className="mt-5 w-full"
        disabled={document.room.boundary.length <= 3}
        onClick={deleteSelectedCorner}
      >
        <Trash2 aria-hidden="true" />
        Delete corner
      </Button>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Add another corner with a + handle on any wall. Walls cannot cross and
        must remain at least 100 mm long.
      </p>
    </>
  );
}

export function PropertiesPanel() {
  const document = usePlannerStore((state) => state.document);
  const selectedIds = usePlannerStore((state) => state.selectedIds);
  const selectedCornerIndex = usePlannerStore(
    (state) => state.selectedCornerIndex,
  );
  const duplicateSelection = usePlannerStore(
    (state) => state.duplicateSelection,
  );
  const deleteSelection = usePlannerStore((state) => state.deleteSelection);
  const selectedObjects = document.objects.filter((object) =>
    selectedIds.includes(object.id),
  );
  const roomBounds = getRoomBounds(document.room);

  if (selectedCornerIndex !== null) {
    return <CornerProperties cornerIndex={selectedCornerIndex} />;
  }

  if (selectedObjects.length === 1) {
    return <SingleObjectProperties object={selectedObjects[0]} />;
  }

  if (selectedObjects.length > 1) {
    return (
      <>
        <p className="text-sm font-semibold">Properties</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {selectedObjects.length} objects selected
        </p>
        <Separator className="my-5" />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={duplicateSelection}>
            <Copy aria-hidden="true" />
            Duplicate
          </Button>
          <Button variant="destructive" size="sm" onClick={deleteSelection}>
            <Trash2 aria-hidden="true" />
            Delete
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <p className="text-sm font-semibold">Room</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {document.room.name}
      </p>
      <Separator className="my-5" />
      <dl className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Width</dt>
          <dd className="font-medium tabular-nums">
            {roomBounds.width.toLocaleString('en-GB')} mm
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Depth</dt>
          <dd className="font-medium tabular-nums">
            {roomBounds.height.toLocaleString('en-GB')} mm
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Wall</dt>
          <dd className="font-medium tabular-nums">
            {document.room.wallThicknessMm} mm
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Corners</dt>
          <dd className="font-medium tabular-nums">
            {document.room.boundary.length}
          </dd>
        </div>
      </dl>
      <div className="mt-6 rounded-xl border border-dashed bg-muted/35 p-4 text-xs leading-relaxed text-muted-foreground">
        Select an object to edit its dimensions, or choose the room-corner tool
        on the canvas to reshape the room.
      </div>
    </>
  );
}
