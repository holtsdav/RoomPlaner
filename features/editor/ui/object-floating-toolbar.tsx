'use client';

import {
  Copy,
  ChevronDown,
  FlipHorizontal2,
  FlipVertical2,
  Lock,
  LockOpen,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { isWallAttached } from '../domain/wall-attachment';
import { DimensionProvenance } from './dimension-provenance';
import { ObjectVariantMenu } from './object-variant-menu';
import {
  getObjectDefaultSize,
  objectCatalog,
  catalogFamilyKey,
  nameForObjectVariant,
} from '../domain/catalog';
import {
  getMeasurementSystem,
  formatMeasurement,
  millimetresToUnit,
  type PlanObject,
  unitToMillimetres,
} from '../domain/plan-document';
import { usePlannerStore } from '../state/planner-store';
import { ObjectColorMenu } from './object-color-menu';
import type { ToolbarSelectionBounds } from './toolbar-placement';
import { FloatingToolbarFrame } from './floating-toolbar-frame';
import { PositionMenu } from './position-menu';
import { ScrubbableNumberInput } from './scrubbable-number-input';
import { ToolbarTooltip } from './toolbar-tooltip';

type ObjectFloatingToolbarProps = {
  object: PlanObject;
  selectionBounds: ToolbarSelectionBounds;
};

function readable(value: number) {
  return String(Math.round(value * 100) / 100);
}

export function ObjectFloatingToolbar({
  object,
  selectionBounds,
}: ObjectFloatingToolbarProps) {
  const units = usePlannerStore((state) => state.document.units);
  const updateObject = usePlannerStore((state) => state.updateSelectedObject);
  const duplicate = usePlannerStore((state) => state.duplicateSelection);
  const deleteSelection = usePlannerStore((state) => state.deleteSelection);
  const variants = object.blueprint
    ? objectCatalog.filter(
        (preset) => catalogFamilyKey(preset) === catalogFamilyKey(object),
      )
    : [];
  const wallAttached = isWallAttached(object);
  const inputUnit = getMeasurementSystem(units) === 'imperial' ? 'in' : 'cm';
  const { widthMm: defaultWidthMm, depthMm: defaultDepthMm } =
    getObjectDefaultSize(object);

  return (
    <TooltipProvider delay={80}>
      <FloatingToolbarFrame
        compactTitle={object.name}
        compactSummary={`${formatMeasurement(object.widthMm, units)} × ${formatMeasurement(object.depthMm, units)}${object.locked ? ' · Locked' : ''}`}
        className="planner-object-toolbar absolute z-20 w-[448px] max-w-[calc(100%-16px)] rounded-[14px] border border-slate-200 bg-white p-2 shadow-[0_12px_32px_rgb(15_35_60/0.16)]"
        selectionBounds={selectionBounds}
        role="toolbar"
        aria-label={`Actions for ${object.name}`}
      >
        <div className="flex flex-col items-start gap-2 lg:h-8 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
          {variants.length > 1 ? (
            <ObjectVariantMenu
              presets={variants}
              units={units}
              disabled={object.locked}
              currentId={
                variants.find((preset) =>
                  object.blueprintProfile?.presetId
                    ? preset.id === object.blueprintProfile.presetId
                    : preset.widthMm === object.widthMm &&
                      preset.depthMm === object.depthMm,
                )?.id
              }
              trigger={
                <button
                  type="button"
                  aria-label="Change object variant"
                  title={object.name}
                  className="flex min-w-0 max-w-full items-center gap-1 rounded-md px-1 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50 lg:flex-1"
                >
                  <span className="truncate">{object.name}</span>
                  <ChevronDown className="size-3 shrink-0" aria-hidden="true" />
                </button>
              }
              onChoose={(preset) =>
                updateObject({
                  name: nameForObjectVariant(object, preset),
                  shape: preset.shape,
                  widthMm: preset.widthMm,
                  depthMm: preset.depthMm,
                  blueprintProfile: {
                    referenceWidthMm: preset.widthMm,
                    referenceDepthMm: preset.depthMm,
                    ...preset.blueprintProfile,
                    presetId: preset.id,
                  },
                  defaultSizeMm: {
                    widthMm: preset.widthMm,
                    depthMm: preset.depthMm,
                  },
                })
              }
            />
          ) : (
            <p
              title={object.name}
              className="min-w-0 max-w-full truncate pl-1 text-xs font-semibold text-slate-800 lg:flex-1"
            >
              {object.name}
            </p>
          )}
          <div className="flex max-w-full flex-wrap items-center gap-0.5 lg:shrink-0 lg:flex-nowrap">
            <ToolbarTooltip label="Duplicate" shortcut="⌘D">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Duplicate object"
                onClick={duplicate}
              >
                <Copy aria-hidden="true" />
              </Button>
            </ToolbarTooltip>
            <PositionMenu />
            <ObjectColorMenu objects={[object]} />
            <ToolbarTooltip label={object.locked ? 'Unlock' : 'Lock'}>
              <Button
                variant={object.locked ? 'secondary' : 'ghost'}
                size="icon-sm"
                aria-label={object.locked ? 'Unlock object' : 'Lock object'}
                aria-pressed={object.locked}
                onClick={() => updateObject({ locked: !object.locked })}
              >
                {object.locked ? (
                  <Lock aria-hidden="true" />
                ) : (
                  <LockOpen aria-hidden="true" />
                )}
              </Button>
            </ToolbarTooltip>
            <ToolbarTooltip
              label="Mirror horizontally"
              description={
                object.locked ? 'Unlock the object to enable' : undefined
              }
              disabled={object.locked}
            >
              <Button
                variant={object.mirroredHorizontally ? 'secondary' : 'ghost'}
                size="icon-sm"
                aria-label="Mirror object horizontally"
                aria-pressed={object.mirroredHorizontally}
                disabled={object.locked}
                onClick={() =>
                  updateObject({
                    mirroredHorizontally: !object.mirroredHorizontally,
                  })
                }
              >
                <FlipHorizontal2 aria-hidden="true" />
              </Button>
            </ToolbarTooltip>
            <ToolbarTooltip
              label="Mirror vertically"
              description={
                object.locked ? 'Unlock the object to enable' : undefined
              }
              disabled={object.locked}
            >
              <Button
                variant={object.mirroredVertically ? 'secondary' : 'ghost'}
                size="icon-sm"
                aria-label="Mirror object vertically"
                aria-pressed={object.mirroredVertically}
                disabled={object.locked}
                onClick={() =>
                  updateObject({
                    mirroredVertically: !object.mirroredVertically,
                  })
                }
              >
                <FlipVertical2 aria-hidden="true" />
              </Button>
            </ToolbarTooltip>
            <span className="mx-1 h-4 w-px bg-slate-200" aria-hidden="true" />
            <ToolbarTooltip
              label="Delete"
              shortcut="⌫"
              description={
                object.locked ? 'Unlock the object to enable' : undefined
              }
              disabled={object.locked}
            >
              <Button
                variant="destructive"
                size="icon-sm"
                aria-label="Delete object"
                disabled={object.locked}
                onClick={deleteSelection}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </ToolbarTooltip>
          </div>
        </div>

        <div className="planner-object-measurements mt-1.5 grid grid-cols-1 lg:grid-cols-[1fr_1fr_0.92fr] gap-2 border-t border-slate-100 pt-2">
          <span className="grid min-w-0 grid-cols-[52px_minmax(0,1fr)_44px] lg:grid-cols-[14px_minmax(0,1fr)_24px] items-center gap-1 text-[11px] font-semibold text-slate-600">
            <span aria-hidden="true">
              <span className="planner-measure-short">W</span>
              <span className="planner-measure-full hidden">Width</span>
            </span>
            <ScrubbableNumberInput
              aria-label={`Object width in ${inputUnit}`}
              value={millimetresToUnit(object.widthMm, inputUnit)}
              min={millimetresToUnit(1, inputUnit)}
              step={0.1}
              suffix={inputUnit}
              formatValue={readable}
              disabled={object.locked}
              onValueChange={(nextValue) => {
                const valueMm = unitToMillimetres(nextValue, inputUnit);
                if (valueMm === object.widthMm) return true;
                updateObject({ widthMm: valueMm });
              }}
              containerClassName="min-w-0 flex-1"
              className="h-8 rounded-lg border-slate-200 bg-slate-50 px-2 pr-7 font-mono text-xs shadow-none"
              suffixClassName="right-2 text-[11px]"
            />
            <ToolbarTooltip
              label="Reset width"
              disabled={object.locked || object.widthMm === defaultWidthMm}
            >
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Reset object width"
                disabled={object.locked || object.widthMm === defaultWidthMm}
                onClick={() => updateObject({ widthMm: defaultWidthMm })}
              >
                <RotateCcw aria-hidden="true" />
              </Button>
            </ToolbarTooltip>
          </span>
          <span className="grid min-w-0 grid-cols-[52px_minmax(0,1fr)_44px] lg:grid-cols-[14px_minmax(0,1fr)_24px] items-center gap-1 text-[11px] font-semibold text-slate-600">
            <span aria-hidden="true">
              <span className="planner-measure-short">D</span>
              <span className="planner-measure-full hidden">Depth</span>
            </span>
            <ScrubbableNumberInput
              aria-label={`Object depth in ${inputUnit}`}
              value={millimetresToUnit(object.depthMm, inputUnit)}
              min={millimetresToUnit(1, inputUnit)}
              step={0.1}
              suffix={inputUnit}
              formatValue={readable}
              disabled={object.locked || object.blueprint === 'window'}
              onValueChange={(nextValue) => {
                const valueMm = unitToMillimetres(nextValue, inputUnit);
                if (valueMm === object.depthMm) return true;
                updateObject({ depthMm: valueMm });
              }}
              containerClassName="min-w-0 flex-1"
              className="h-8 rounded-lg border-slate-200 bg-slate-50 px-2 pr-7 font-mono text-xs shadow-none"
              suffixClassName="right-2 text-[11px]"
            />
            <ToolbarTooltip
              label="Reset depth"
              disabled={
                object.locked ||
                object.blueprint === 'window' ||
                object.depthMm === defaultDepthMm
              }
            >
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Reset object depth"
                disabled={
                  object.locked ||
                  object.blueprint === 'window' ||
                  object.depthMm === defaultDepthMm
                }
                onClick={() => updateObject({ depthMm: defaultDepthMm })}
              >
                <RotateCcw aria-hidden="true" />
              </Button>
            </ToolbarTooltip>
          </span>
          <span className="grid min-w-0 grid-cols-[52px_minmax(0,1fr)_44px] lg:grid-cols-[14px_minmax(0,1fr)_24px] items-center gap-1 text-[11px] font-semibold text-slate-600">
            <span aria-hidden="true">
              <span className="planner-measure-short">R</span>
              <span className="planner-measure-full hidden">Rotation</span>
            </span>
            <ScrubbableNumberInput
              aria-label="Object rotation in degrees"
              value={object.rotationDeg}
              step={1}
              suffix="°"
              formatValue={readable}
              disabled={object.locked || wallAttached}
              onValueChange={(rotationDeg) => {
                if (rotationDeg === object.rotationDeg) return true;
                updateObject({ rotationDeg });
              }}
              containerClassName="min-w-0 flex-1"
              className="h-8 rounded-lg border-slate-200 bg-slate-50 px-2 pr-6 font-mono text-xs shadow-none"
              suffixClassName="right-2 text-[11px]"
            />
            <ToolbarTooltip
              label="Reset rotation"
              disabled={
                object.locked || wallAttached || object.rotationDeg === 0
              }
            >
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Reset object rotation"
                disabled={
                  object.locked || wallAttached || object.rotationDeg === 0
                }
                onClick={() => updateObject({ rotationDeg: 0 })}
              >
                <RotateCcw aria-hidden="true" />
              </Button>
            </ToolbarTooltip>
          </span>
        </div>
        <details className="mt-2 border-t border-slate-100">
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-1 text-[11px] text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600">
            Dimension reference
            <ChevronDown className="ml-auto size-3" aria-hidden="true" />
          </summary>
          <DimensionProvenance object={object} />
        </details>
      </FloatingToolbarFrame>
    </TooltipProvider>
  );
}
