'use client';

import { Check, Keyboard, RotateCcw, Settings } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';
import {
  getMeasurementSystem,
  millimetresToUnit,
  unitToMillimetres,
} from '../domain/plan-document';
import { usePlannerStore } from '../state/planner-store';
import { ScrubbableNumberInput } from './scrubbable-number-input';

const measurementSystems = [
  { id: 'metric', label: 'Metric', detail: 'Metres and centimetres' },
  { id: 'imperial', label: 'Imperial', detail: 'Feet and inches' },
] as const;

export const DEFAULT_SIDEBAR_SHORTCUT = 'mod+b';

const modifierKeys = new Set(['Alt', 'Control', 'Meta', 'Shift']);

function isApplePlatform() {
  return (
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad/.test(navigator.platform)
  );
}

function normalizeKey(key: string) {
  if (key === ' ') return 'space';
  return key.toLowerCase();
}

export function isValidSidebarShortcut(shortcut: string) {
  const parts = shortcut.split('+');
  const modifiers = new Set(parts.slice(0, -1));
  return (
    parts.length >= 2 &&
    parts.at(-1)?.length !== 0 &&
    ['mod', 'ctrl', 'meta', 'alt'].some((modifier) => modifiers.has(modifier))
  );
}

export function sidebarShortcutMatches(event: KeyboardEvent, shortcut: string) {
  const parts = shortcut.split('+');
  const key = parts.at(-1);
  const modifiers = new Set(parts.slice(0, -1));
  const apple = isApplePlatform();

  return (
    normalizeKey(event.key) === key &&
    event.metaKey ===
      (modifiers.has('meta') || (apple && modifiers.has('mod'))) &&
    event.ctrlKey ===
      (modifiers.has('ctrl') || (!apple && modifiers.has('mod'))) &&
    event.altKey === modifiers.has('alt') &&
    event.shiftKey === modifiers.has('shift')
  );
}

function shortcutFromEvent(event: React.KeyboardEvent) {
  if (modifierKeys.has(event.key)) return null;

  const apple = isApplePlatform();
  const parts: string[] = [];
  if (event.metaKey) parts.push(apple ? 'mod' : 'meta');
  if (event.ctrlKey) parts.push(apple ? 'ctrl' : 'mod');
  if (event.altKey) parts.push('alt');
  if (event.shiftKey) parts.push('shift');
  parts.push(normalizeKey(event.key));
  return parts.join('+');
}

function formatShortcut(shortcut: string, apple: boolean) {
  const labels: Record<string, string> = {
    mod: apple ? '⌘' : 'Ctrl',
    ctrl: apple ? '⌃' : 'Ctrl',
    meta: apple ? '⌘' : 'Meta',
    alt: apple ? '⌥' : 'Alt',
    shift: apple ? '⇧' : 'Shift',
    space: 'Space',
    arrowup: '↑',
    arrowdown: '↓',
    arrowleft: '←',
    arrowright: '→',
  };
  return shortcut.split('+').map((part) => labels[part] ?? part.toUpperCase());
}

export function PlannerSettingsDialog({
  triggerClassName,
  sidebarShortcut,
  onSidebarShortcutChange,
}: {
  triggerClassName?: string;
  sidebarShortcut: string;
  onSidebarShortcutChange: (shortcut: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [recordingShortcut, setRecordingShortcut] = useState(false);
  const [shortcutError, setShortcutError] = useState<string | null>(null);
  const applePlatform = isApplePlatform();
  const document = usePlannerStore((state) => state.document);
  const updatePlannerSettings = usePlannerStore(
    (state) => state.updatePlannerSettings,
  );
  const measurementSystem = getMeasurementSystem(document.units);
  const imperial = measurementSystem === 'imperial';
  const inputUnit = imperial ? 'in' : 'cm';

  const changeMeasurementSystem = (nextSystem: 'metric' | 'imperial') => {
    if (nextSystem === measurementSystem) return;
    updatePlannerSettings({
      units: nextSystem === 'imperial' ? 'ft-in' : 'm',
      gridSizeMm: document.gridSizeMm,
      snapSizeMm: document.snapSizeMm,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={cn('size-11 lg:size-8', triggerClassName)}
            aria-label="Settings"
          />
        }
      >
        <Settings aria-hidden="true" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Planner settings</DialogTitle>
          <DialogDescription>
            Measurement and spacing changes appear on the canvas immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Measurement units</legend>
            <div className="grid grid-cols-2 gap-2">
              {measurementSystems.map((system) => {
                const selected = system.id === measurementSystem;
                return (
                  <label
                    key={system.id}
                    className={`relative cursor-pointer rounded-xl border p-3 text-left outline-none transition-colors has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/40 ${
                      selected
                        ? 'border-primary bg-primary/8 text-foreground'
                        : 'hover:border-primary/35 hover:bg-muted/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="measurement-system"
                      value={system.id}
                      checked={selected}
                      onChange={() => changeMeasurementSystem(system.id)}
                      className="sr-only"
                    />
                    <span className="block pr-5 text-sm font-medium">
                      {system.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {system.detail}
                    </span>
                    {selected && (
                      <Check
                        className="absolute right-2.5 top-2.5 size-4 text-primary"
                        aria-hidden="true"
                      />
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="grid-size">Grid spacing</Label>
              <ScrubbableNumberInput
                id="grid-size"
                aria-label={`Grid spacing in ${inputUnit}`}
                value={millimetresToUnit(document.gridSizeMm, inputUnit)}
                min={millimetresToUnit(document.snapSizeMm, inputUnit)}
                max={millimetresToUnit(5000, inputUnit)}
                step={0.1}
                suffix={inputUnit}
                onValueChange={(nextValue) => {
                  const gridSizeMm = unitToMillimetres(nextValue, inputUnit);
                  if (gridSizeMm === document.gridSizeMm) return true;
                  updatePlannerSettings({
                    units: imperial ? 'ft-in' : 'm',
                    gridSizeMm,
                    snapSizeMm: document.snapSizeMm,
                  });
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="snap-size">Snap spacing</Label>
              <ScrubbableNumberInput
                id="snap-size"
                aria-label={`Snap spacing in ${inputUnit}`}
                value={millimetresToUnit(document.snapSizeMm, inputUnit)}
                min={millimetresToUnit(1, inputUnit)}
                max={millimetresToUnit(document.gridSizeMm, inputUnit)}
                step={0.1}
                suffix={inputUnit}
                onValueChange={(nextValue) => {
                  const snapSizeMm = unitToMillimetres(nextValue, inputUnit);
                  if (snapSizeMm === document.snapSizeMm) return true;
                  updatePlannerSettings({
                    units: imperial ? 'ft-in' : 'm',
                    gridSizeMm: document.gridSizeMm,
                    snapSizeMm,
                  });
                }}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Type a value or drag a number left and right. Snap spacing cannot
            exceed the grid spacing.
          </p>

          <section
            className="border-t pt-5"
            aria-labelledby="sidebar-shortcut-label"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[#e6efff] text-primary">
                  <Keyboard className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <Label id="sidebar-shortcut-label">Sidebar shortcut</Label>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Opens or closes the object library.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Record sidebar shortcut"
                  aria-pressed={recordingShortcut}
                  onClick={() => {
                    setShortcutError(null);
                    setRecordingShortcut(true);
                  }}
                  onBlur={() => setRecordingShortcut(false)}
                  onKeyDown={(event) => {
                    if (!recordingShortcut) return;
                    event.preventDefault();
                    event.stopPropagation();

                    if (event.key === 'Escape') {
                      setRecordingShortcut(false);
                      setShortcutError(null);
                      return;
                    }

                    const shortcut = shortcutFromEvent(event);
                    if (!shortcut) return;
                    if (!isValidSidebarShortcut(shortcut)) {
                      setShortcutError('Include Command, Ctrl, or Alt.');
                      return;
                    }

                    onSidebarShortcutChange(shortcut);
                    setRecordingShortcut(false);
                    setShortcutError(null);
                  }}
                  className={`flex h-10 min-w-28 items-center justify-center rounded-[10px] border px-3 text-xs font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/40 ${
                    recordingShortcut
                      ? 'border-primary bg-primary/8 text-primary'
                      : 'border-input bg-background hover:bg-muted'
                  }`}
                >
                  {recordingShortcut ? (
                    'Press shortcut…'
                  ) : (
                    <KbdGroup>
                      {formatShortcut(sidebarShortcut, applePlatform).map(
                        (key) => (
                          <Kbd key={key}>{key}</Kbd>
                        ),
                      )}
                    </KbdGroup>
                  )}
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Reset sidebar shortcut"
                  title="Reset to default"
                  disabled={sidebarShortcut === DEFAULT_SIDEBAR_SHORTCUT}
                  onClick={() => {
                    onSidebarShortcutChange(DEFAULT_SIDEBAR_SHORTCUT);
                    setShortcutError(null);
                  }}
                >
                  <RotateCcw aria-hidden="true" />
                </Button>
              </div>
            </div>
            {shortcutError && (
              <p className="mt-2 text-xs text-destructive" role="alert">
                {shortcutError}
              </p>
            )}
          </section>
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
