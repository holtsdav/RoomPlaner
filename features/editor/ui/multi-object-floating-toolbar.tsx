'use client';

import {
  Copy,
  FlipHorizontal2,
  FlipVertical2,
  Group,
  Lock,
  LockOpen,
  RotateCcw,
  Trash2,
  Ungroup,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { PlanObject } from '../domain/plan-document';
import { usePlannerStore } from '../state/planner-store';
import { ObjectColorMenu } from './object-color-menu';
import { FloatingToolbarFrame } from './floating-toolbar-frame';
import { PositionMenu } from './position-menu';
import { ScrubbableNumberInput } from './scrubbable-number-input';
import { ToolbarTooltip } from './toolbar-tooltip';

type MultiObjectFloatingToolbarProps = {
  objects: PlanObject[];
  left: number;
  top: number;
};

export function MultiObjectFloatingToolbar({
  objects,
  left,
  top,
}: MultiObjectFloatingToolbarProps) {
  const [scalePercent, setScalePercent] = useState(100);
  const [rotationDelta, setRotationDelta] = useState(0);
  const scalePercentRef = useRef(100);
  const scaleBaseline = useRef(objects);
  const rotationBaseline = useRef(objects);
  const ownTransform = useRef(false);
  const rotationDeltaRef = useRef(0);
  const groups = usePlannerStore((state) => state.document.groups);
  const duplicate = usePlannerStore((state) => state.duplicateSelection);
  const scale = usePlannerStore((state) => state.scaleSelection);
  const rotate = usePlannerStore((state) => state.rotateSelection);
  const mirror = usePlannerStore((state) => state.mirrorSelection);
  const setLocked = usePlannerStore((state) => state.setSelectionLocked);
  const group = usePlannerStore((state) => state.groupSelection);
  const ungroup = usePlannerStore((state) => state.ungroupSelection);
  const deleteSelection = usePlannerStore((state) => state.deleteSelection);
  const selectedIds = new Set(objects.map((object) => object.id));
  const selectedGroups = groups.filter((candidate) =>
    candidate.objectIds.some((id) => selectedIds.has(id)),
  );
  const selectionIsSingleGroup =
    selectedGroups.length === 1 &&
    selectedGroups[0].objectIds.length === selectedIds.size &&
    selectedGroups[0].objectIds.every((id) => selectedIds.has(id));
  const allLocked = objects.every((object) => object.locked);
  const anyLocked = objects.some((object) => object.locked);

  const selectionKey = objects.map((object) => object.id).join(':');
  useEffect(() => {
    const ids = new Set(selectionKey.split(':'));
    const geometry = (objects: PlanObject[]) =>
      JSON.stringify(
        objects
          .filter((object) => ids.has(object.id))
          .map((object) => [
            object.id,
            object.positionMm,
            object.widthMm,
            object.depthMm,
            object.rotationDeg,
            object.mirroredHorizontally,
            object.mirroredVertically,
            object.locked,
          ]),
      );
    return usePlannerStore.subscribe((state, previous) => {
      if (
        ownTransform.current ||
        geometry(state.document.objects) === geometry(previous.document.objects)
      )
        return;
      const baseline = state.document.objects.filter((object) =>
        ids.has(object.id),
      );
      scaleBaseline.current = baseline;
      rotationBaseline.current = baseline;
      scalePercentRef.current = 100;
      rotationDeltaRef.current = 0;
      setScalePercent(100);
      setRotationDelta(0);
    });
  }, [selectionKey]);

  const updateScale = (nextPercent: number) => {
    const previousPercent = scalePercentRef.current;
    if (nextPercent === previousPercent) return true;
    ownTransform.current = true;
    try {
      scale(nextPercent / 100, scaleBaseline.current);
    } finally {
      ownTransform.current = false;
    }
    rotationBaseline.current = usePlannerStore
      .getState()
      .document.objects.filter((object) => selectedIds.has(object.id));
    rotationDeltaRef.current = 0;
    setRotationDelta(0);
    scalePercentRef.current = nextPercent;
    setScalePercent(nextPercent);
    return true;
  };

  const updateRotation = (nextRotation: number) => {
    const previousRotation = rotationDeltaRef.current;
    if (nextRotation === previousRotation) return true;
    ownTransform.current = true;
    try {
      rotate(nextRotation, rotationBaseline.current);
    } finally {
      ownTransform.current = false;
    }
    // A new orientation becomes the baseline for the next scale operation.
    scaleBaseline.current = usePlannerStore
      .getState()
      .document.objects.filter((object) => selectedIds.has(object.id));
    scalePercentRef.current = 100;
    setScalePercent(100);
    rotationDeltaRef.current = nextRotation;
    setRotationDelta(nextRotation);
    return true;
  };

  return (
    <TooltipProvider delay={80}>
      <FloatingToolbarFrame
        compactTitle={
          selectionIsSingleGroup
            ? selectedGroups[0].name
            : `${objects.length} objects`
        }
        compactSummary={
          selectionIsSingleGroup
            ? `${objects.length} objects in group`
            : 'Edit size, rotation and color together'
        }
        className="planner-object-toolbar absolute z-20 w-[448px] max-w-[calc(100%-16px)] -translate-x-1/2 -translate-y-full rounded-[14px] bg-white p-2 shadow-[0_12px_32px_rgb(15_35_60/0.16)] ring-1 ring-slate-200"
        style={{ left, top }}
        role="toolbar"
        aria-label={`Actions for ${objects.length} selected objects`}
      >
        <div className="flex flex-col items-start gap-2 lg:min-h-8 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
          <div className="flex min-w-0 items-center gap-2 pl-1">
            <p className="truncate text-xs font-semibold text-slate-800">
              {objects.length} objects
            </p>
            {selectedGroups.length > 0 && (
              <span className="max-w-24 shrink-0 truncate rounded-full bg-[#e6efff] px-2 py-0.5 font-mono text-[11px] font-medium tabular-nums text-primary">
                {selectedGroups.length === 1
                  ? selectedGroups[0].name
                  : `${selectedGroups.length} groups`}
              </span>
            )}
          </div>
          <div className="flex max-w-full flex-wrap items-center gap-0.5">
            <ToolbarTooltip
              label="Group selection"
              shortcut="⌘G"
              disabled={selectionIsSingleGroup}
            >
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Group selected objects"
                disabled={selectionIsSingleGroup}
                onClick={group}
              >
                <Group aria-hidden="true" />
              </Button>
            </ToolbarTooltip>
            <ToolbarTooltip
              label="Ungroup selection"
              shortcut="⇧⌘G"
              disabled={selectedGroups.length === 0}
            >
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Ungroup selected objects"
                disabled={selectedGroups.length === 0}
                onClick={ungroup}
              >
                <Ungroup aria-hidden="true" />
              </Button>
            </ToolbarTooltip>
            <ToolbarTooltip label="Duplicate" shortcut="⌘D">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Duplicate selected objects"
                onClick={duplicate}
              >
                <Copy aria-hidden="true" />
              </Button>
            </ToolbarTooltip>
            <PositionMenu />
            <ObjectColorMenu objects={objects} />
            <ToolbarTooltip
              label={allLocked ? 'Unlock selection' : 'Lock selection'}
            >
              <Button
                variant={anyLocked ? 'secondary' : 'ghost'}
                size="icon-sm"
                aria-label={
                  allLocked
                    ? 'Unlock selected objects'
                    : 'Lock selected objects'
                }
                aria-pressed={anyLocked}
                onClick={() => setLocked(!allLocked)}
              >
                {allLocked ? (
                  <Lock aria-hidden="true" />
                ) : (
                  <LockOpen aria-hidden="true" />
                )}
              </Button>
            </ToolbarTooltip>
            <ToolbarTooltip
              label="Mirror horizontally"
              description={
                allLocked ? 'Unlock the selection to enable' : undefined
              }
              disabled={allLocked}
            >
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Mirror selected objects horizontally"
                disabled={allLocked}
                onClick={() => mirror('horizontal')}
              >
                <FlipHorizontal2 aria-hidden="true" />
              </Button>
            </ToolbarTooltip>
            <ToolbarTooltip
              label="Mirror vertically"
              description={
                allLocked ? 'Unlock the selection to enable' : undefined
              }
              disabled={allLocked}
            >
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Mirror selected objects vertically"
                disabled={allLocked}
                onClick={() => mirror('vertical')}
              >
                <FlipVertical2 aria-hidden="true" />
              </Button>
            </ToolbarTooltip>
            <span className="mx-1 h-4 w-px bg-slate-200" aria-hidden="true" />
            <ToolbarTooltip
              label="Delete selection"
              shortcut="⌫"
              description={
                allLocked ? 'Unlock the selection to enable' : undefined
              }
              disabled={allLocked}
            >
              <Button
                variant="destructive"
                size="icon-sm"
                aria-label="Delete selected objects"
                disabled={allLocked}
                onClick={deleteSelection}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </ToolbarTooltip>
          </div>
        </div>

        <div className="mt-1.5 grid grid-cols-1 lg:grid-cols-2 gap-2 border-t border-slate-100 pt-2">
          <span className="grid min-w-0 grid-cols-[52px_minmax(0,1fr)_44px] lg:grid-cols-[52px_minmax(0,1fr)_24px] items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <span>Scale</span>
            <ScrubbableNumberInput
              aria-label="Selection scale percentage"
              value={scalePercent}
              min={1}
              step={1}
              suffix="%"
              disabled={allLocked}
              onValueChange={updateScale}
              containerClassName="min-w-0 flex-1"
              className="h-8 rounded-lg border-slate-200 bg-slate-50 px-2 pr-6 font-mono text-xs shadow-none"
              suffixClassName="right-2 text-[11px]"
            />
            <ToolbarTooltip
              label="Reset selection scale"
              disabled={allLocked || scalePercent === 100}
            >
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Reset selection scale"
                disabled={allLocked || scalePercent === 100}
                onClick={() => updateScale(100)}
              >
                <RotateCcw aria-hidden="true" />
              </Button>
            </ToolbarTooltip>
          </span>
          <span className="grid min-w-0 grid-cols-[52px_minmax(0,1fr)_44px] lg:grid-cols-[52px_minmax(0,1fr)_24px] items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <span>Rotation</span>
            <ScrubbableNumberInput
              aria-label="Selection rotation in degrees"
              value={rotationDelta}
              step={1}
              suffix="°"
              disabled={allLocked}
              onValueChange={updateRotation}
              containerClassName="min-w-0 flex-1"
              className="h-8 rounded-lg border-slate-200 bg-slate-50 px-2 pr-6 font-mono text-xs shadow-none"
              suffixClassName="right-2 text-[11px]"
            />
            <ToolbarTooltip
              label="Reset selection rotation"
              disabled={allLocked || rotationDelta === 0}
            >
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Reset selection rotation"
                disabled={allLocked || rotationDelta === 0}
                onClick={() => updateRotation(0)}
              >
                <RotateCcw aria-hidden="true" />
              </Button>
            </ToolbarTooltip>
          </span>
        </div>
      </FloatingToolbarFrame>
    </TooltipProvider>
  );
}
