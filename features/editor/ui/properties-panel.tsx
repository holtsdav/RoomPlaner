'use client';

import { insideRoomBounds } from '../domain/room-measurements';
import { Copy, Lock, Trash2, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  formatMeasurement,
  getMeasurementSystem,
  millimetresToUnit,
  unitToMillimetres,
  type PlanDocument,
  type PlanObject,
} from '../domain/plan-document';
import { usePlannerStore } from '../state/planner-store';
import { ScrubbableNumberInput } from './scrubbable-number-input';

type NumberFieldProps = {
  label: string;
  value: number;
  min?: number;
  suffix: string;
  step?: number;
  onCommit: (value: number) => boolean | void;
};

function NumberField({
  label,
  value,
  min,
  suffix,
  step,
  onCommit,
}: NumberFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={`property-${label}`}
        className="text-xs text-muted-foreground"
      >
        {label}
      </Label>
      <ScrubbableNumberInput
        id={`property-${label}`}
        aria-label={`${label} in ${suffix === '°' ? 'degrees' : suffix}`}
        value={value}
        min={min}
        step={step}
        suffix={suffix}
        onValueChange={(nextValue) =>
          nextValue === value ? true : onCommit(nextValue)
        }
        className="h-9 text-sm"
      />
    </div>
  );
}

function MeasurementField({
  label,
  valueMm,
  units,
  minMm,
  onCommit,
}: {
  label: string;
  valueMm: number;
  units: PlanDocument['units'];
  minMm?: number;
  onCommit: (valueMm: number) => boolean | void;
}) {
  const unit = getMeasurementSystem(units) === 'imperial' ? 'in' : 'cm';
  const displayedValue =
    Math.round(millimetresToUnit(valueMm, unit) * 100) / 100;
  const displayedMin =
    minMm === undefined ? undefined : millimetresToUnit(minMm, unit);

  return (
    <NumberField
      label={label}
      value={displayedValue}
      min={displayedMin}
      suffix={unit}
      step={0.1}
      onCommit={(value) => onCommit(unitToMillimetres(value, unit))}
    />
  );
}

function SingleObjectProperties({ object }: { object: PlanObject }) {
  const units = usePlannerStore((state) => state.document.units);
  const snapSizeMm = usePlannerStore((state) => state.document.snapSizeMm);
  const gridSizeMm = usePlannerStore((state) => state.document.gridSizeMm);
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
        <MeasurementField
          label="X"
          valueMm={object.positionMm.x}
          units={units}
          onCommit={(xMm) =>
            updateSelectedObject({
              positionMm: { ...object.positionMm, x: xMm },
            })
          }
        />
        <MeasurementField
          label="Y"
          valueMm={object.positionMm.y}
          units={units}
          onCommit={(yMm) =>
            updateSelectedObject({
              positionMm: { ...object.positionMm, y: yMm },
            })
          }
        />
        <MeasurementField
          label="Width"
          valueMm={object.widthMm}
          units={units}
          minMm={1}
          onCommit={(widthMm) => updateSelectedObject({ widthMm })}
        />
        <MeasurementField
          label="Depth"
          valueMm={object.depthMm}
          units={units}
          minMm={1}
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
        Arrow keys move by {formatMeasurement(snapSizeMm, units)}. Hold Shift
        for {formatMeasurement(gridSizeMm, units)}.
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
        <MeasurementField
          label="Corner X"
          valueMm={corner.x}
          units={document.units}
          onCommit={(xMm) => moveCorner(cornerIndex, { ...corner, x: xMm })}
        />
        <MeasurementField
          label="Corner Y"
          valueMm={corner.y}
          units={document.units}
          onCommit={(yMm) => moveCorner(cornerIndex, { ...corner, y: yMm })}
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
        must remain at least {formatMeasurement(100, document.units)} long.
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
  const roomBounds = insideRoomBounds(document.room);

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
            {formatMeasurement(roomBounds.width, document.units)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Depth</dt>
          <dd className="font-medium tabular-nums">
            {formatMeasurement(roomBounds.height, document.units)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Wall</dt>
          <dd className="font-medium tabular-nums">
            {formatMeasurement(document.room.wallThicknessMm, document.units)}
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
