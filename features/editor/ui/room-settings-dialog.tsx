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
import { getRoomBounds } from '../domain/plan-document';
import { usePlannerStore } from '../state/planner-store';

type DraftSettings = {
  name: string;
  widthMm: string;
  depthMm: string;
  wallThicknessMm: string;
};

export function RoomSettingsDialog() {
  const [open, setOpen] = useState(false);
  const document = usePlannerStore((state) => state.document);
  const updateRoomSettings = usePlannerStore(
    (state) => state.updateRoomSettings,
  );
  const bounds = getRoomBounds(document.room);
  const [draft, setDraft] = useState<DraftSettings>({
    name: document.room.name,
    widthMm: String(bounds.width),
    depthMm: String(bounds.height),
    wallThicknessMm: String(document.room.wallThicknessMm),
  });

  const resetDraft = () => {
    const currentBounds = getRoomBounds(document.room);
    setDraft({
      name: document.room.name,
      widthMm: String(currentBounds.width),
      depthMm: String(currentBounds.height),
      wallThicknessMm: String(document.room.wallThicknessMm),
    });
  };

  const numbers = {
    widthMm: Math.round(Number(draft.widthMm)),
    depthMm: Math.round(Number(draft.depthMm)),
    wallThicknessMm: Math.round(Number(draft.wallThicknessMm)),
  };
  const valid =
    draft.name.trim().length > 0 &&
    Number.isFinite(numbers.widthMm) &&
    Number.isFinite(numbers.depthMm) &&
    Number.isFinite(numbers.wallThicknessMm) &&
    numbers.widthMm >= 500 &&
    numbers.depthMm >= 500 &&
    numbers.wallThicknessMm >= 50 &&
    numbers.wallThicknessMm <= 500;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) resetDraft();
        setOpen(nextOpen);
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <ScanLine aria-hidden="true" />
        <span className="hidden sm:inline">Room setup</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Room setup</DialogTitle>
          <DialogDescription>
            Changing width or depth scales every corner proportionally. Objects
            keep their current size and position.
          </DialogDescription>
        </DialogHeader>

        <form
          id="room-settings-form"
          className="grid grid-cols-2 gap-4 py-1"
          onSubmit={(event) => {
            event.preventDefault();
            if (!valid) return;
            if (updateRoomSettings({ name: draft.name, ...numbers })) {
              setOpen(false);
            }
          }}
        >
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="room-name">Room name</Label>
            <Input
              id="room-name"
              value={draft.name}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="room-width">Bounding width</Label>
            <Input
              id="room-width"
              type="number"
              min={500}
              step={10}
              value={draft.widthMm}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  widthMm: event.target.value,
                }))
              }
            />
            <p className="text-xs text-muted-foreground">millimetres</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="room-depth">Bounding depth</Label>
            <Input
              id="room-depth"
              type="number"
              min={500}
              step={10}
              value={draft.depthMm}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  depthMm: event.target.value,
                }))
              }
            />
            <p className="text-xs text-muted-foreground">millimetres</p>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="wall-thickness">Wall thickness</Label>
            <Input
              id="wall-thickness"
              type="number"
              min={50}
              max={500}
              step={10}
              value={draft.wallThicknessMm}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  wallThicknessMm: event.target.value,
                }))
              }
            />
          </div>
        </form>

        <DialogFooter showCloseButton>
          <Button type="submit" form="room-settings-form" disabled={!valid}>
            Apply dimensions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
