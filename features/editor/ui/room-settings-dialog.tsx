'use client';

import { ScanLine } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getMeasurementSystem,
  millimetresToUnit,
  unitToMillimetres,
} from '../domain/plan-document';
import { usePlannerStore } from '../state/planner-store';
import { insideRoomBounds } from '../domain/room-measurements';
import { RoomMeasurementHelp } from './room-measurement-help';
import { ScrubbableNumberInput } from './scrubbable-number-input';

function readableInput(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

export function RoomSettingsDialog({
  open: controlledOpen,
  onOpenChange,
  showTrigger = true,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
} = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const document = usePlannerStore((state) => state.document);
  const updateRoomSettings = usePlannerStore(
    (state) => state.updateRoomSettings,
  );
  const bounds = insideRoomBounds(document.room);
  const imperial = getMeasurementSystem(document.units) === 'imperial';
  const roomUnit = imperial ? 'ft' : 'cm';
  const detailUnit = imperial ? 'in' : 'cm';
  const applyRoomChange = (
    patch: Partial<{
      name: string;
      widthMm: number;
      depthMm: number;
      wallThicknessMm: number;
    }>,
  ) =>
    updateRoomSettings({
      inside: true,
      name: document.room.name,
      widthMm: bounds.width,
      depthMm: bounds.height,
      wallThicknessMm: document.room.wallThicknessMm,
      ...patch,
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
      }}
    >
      {showTrigger && (
        <DialogTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="size-11 p-0 lg:h-7 sm:w-auto sm:px-2.5"
              aria-label="Room setup"
              title="Room setup"
            />
          }
        >
          <ScanLine aria-hidden="true" />
          <span className="hidden sm:inline">Room setup</span>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Room setup</DialogTitle>
          <DialogDescription>
            Set the room size and wall thickness. Changes appear immediately;
            furniture keeps its physical size.
          </DialogDescription>
        </DialogHeader>

        <RoomMeasurementHelp document={document} />

        <div className="grid grid-cols-2 gap-4 py-1">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="room-name">Room name</Label>
            <Input
              id="room-name"
              key={`${open}:${document.id}:${document.room.name}`}
              defaultValue={document.room.name}
              maxLength={120}
              onBlur={(event) => {
                const name = event.currentTarget.value.trim();
                if (name && name !== document.room.name)
                  applyRoomChange({ name });
                else event.currentTarget.value = document.room.name;
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="room-width">Inside width</Label>
            <ScrubbableNumberInput
              id="room-width"
              aria-label={`Room width in ${imperial ? 'feet' : 'centimetres'}`}
              value={millimetresToUnit(bounds.width, roomUnit)}
              min={imperial ? 1.64 : 50}
              step={imperial ? 0.1 : 1}
              suffix={roomUnit}
              formatValue={readableInput}
              onValueChange={(value) => {
                const widthMm = unitToMillimetres(value, roomUnit);
                if (widthMm === bounds.width) return true;
                return applyRoomChange({ widthMm });
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="room-depth">Inside depth</Label>
            <ScrubbableNumberInput
              id="room-depth"
              aria-label={`Room depth in ${imperial ? 'feet' : 'centimetres'}`}
              value={millimetresToUnit(bounds.height, roomUnit)}
              min={imperial ? 1.64 : 50}
              step={imperial ? 0.1 : 1}
              suffix={roomUnit}
              formatValue={readableInput}
              onValueChange={(value) => {
                const depthMm = unitToMillimetres(value, roomUnit);
                if (depthMm === bounds.height) return true;
                return applyRoomChange({ depthMm });
              }}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="wall-thickness">Wall thickness</Label>
            <ScrubbableNumberInput
              id="wall-thickness"
              aria-label={`Wall thickness in ${imperial ? 'inches' : 'centimetres'}`}
              value={millimetresToUnit(
                document.room.wallThicknessMm,
                detailUnit,
              )}
              min={imperial ? 1.97 : 5}
              max={imperial ? 19.69 : 50}
              step={0.1}
              suffix={imperial ? 'in' : 'cm'}
              formatValue={readableInput}
              onValueChange={(value) => {
                const wallThicknessMm = unitToMillimetres(value, detailUnit);
                if (wallThicknessMm === document.room.wallThicknessMm) {
                  return true;
                }
                return applyRoomChange({ wallThicknessMm });
              }}
            />
          </div>
          <p className="col-span-2 text-xs text-muted-foreground">
            Type a value or drag a number left and right to adjust it.
          </p>
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
