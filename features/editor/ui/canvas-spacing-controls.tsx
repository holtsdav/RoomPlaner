'use client';

import { Crosshair, Grid2X2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DEFAULT_GRID_SIZE_MM,
  DEFAULT_SNAP_SIZE_MM,
  formatMeasurement,
  getMeasurementSystem,
  millimetresToUnit,
  unitToMillimetres,
} from '../domain/plan-document';
import { usePlannerStore } from '../state/planner-store';
import { ScrubbableNumberInput } from './scrubbable-number-input';

export function CanvasSpacingControls() {
  const document = usePlannerStore((state) => state.document);
  const updateSettings = usePlannerStore(
    (state) => state.updatePlannerSettings,
  );
  const inputUnit =
    getMeasurementSystem(document.units) === 'imperial' ? 'in' : 'cm';
  const settingsUnits =
    getMeasurementSystem(document.units) === 'imperial' ? 'ft-in' : 'm';
  const gridValue = millimetresToUnit(document.gridSizeMm, inputUnit);
  const snapValue = millimetresToUnit(document.snapSizeMm, inputUnit);
  const resetGridLabel = `Reset grid to ${formatMeasurement(DEFAULT_GRID_SIZE_MM, document.units)}`;
  const resetSnapLabel = `Reset snap to ${formatMeasurement(DEFAULT_SNAP_SIZE_MM, document.units)}`;

  return (
    <div className="absolute bottom-4 left-1/2 z-20 w-[calc(100%-16px)] max-w-[440px] -translate-x-1/2 lg:w-auto lg:max-w-none">
      <div className="flex items-center rounded-[10px] border border-slate-200 bg-white p-1 text-xs text-slate-500 shadow-[0_5px_18px_rgb(31_55_81/0.1)]">
        <div className="flex min-w-0 flex-1 items-center gap-1 lg:gap-1.5 lg:pl-2">
          <Button
            variant="ghost"
            size="sm"
            className={`h-11 min-w-11 gap-1.5 px-2 text-xs font-medium lg:h-7 sm:px-1.5 ${document.gridEnabled ? 'bg-[#e6efff] text-primary' : 'text-slate-400'}`}
            aria-label={document.gridEnabled ? 'Hide grid' : 'Show grid'}
            aria-pressed={document.gridEnabled}
            title={document.gridEnabled ? 'Hide grid' : 'Show grid'}
            onClick={() =>
              updateSettings({
                units: settingsUnits,
                gridSizeMm: document.gridSizeMm,
                snapSizeMm: document.snapSizeMm,
                gridEnabled: !document.gridEnabled,
              })
            }
          >
            <Grid2X2 className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Grid</span>
          </Button>
          <ScrubbableNumberInput
            aria-label={`Grid size in ${inputUnit}`}
            value={gridValue}
            min={snapValue}
            max={millimetresToUnit(5000, inputUnit)}
            step={0.1}
            suffix={inputUnit}
            onValueChange={(nextValue) => {
              const gridSizeMm = unitToMillimetres(nextValue, inputUnit);
              if (gridSizeMm === document.gridSizeMm) return true;
              updateSettings({
                units: settingsUnits,
                gridSizeMm,
                snapSizeMm: document.snapSizeMm,
              });
            }}
            containerClassName="min-w-0 flex-1 lg:w-16 lg:flex-none"
            className="h-11 rounded-lg border-transparent bg-transparent px-2 pr-7 text-center font-mono text-xs shadow-none hover:bg-slate-100 lg:h-7"
            suffixClassName="right-2 h-full text-[11px] leading-none"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-11 shrink-0 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:size-7"
            disabled={document.gridSizeMm === DEFAULT_GRID_SIZE_MM}
            aria-label={resetGridLabel}
            title={resetGridLabel}
            onClick={() =>
              updateSettings({
                units: settingsUnits,
                gridSizeMm: DEFAULT_GRID_SIZE_MM,
                snapSizeMm: Math.min(document.snapSizeMm, DEFAULT_GRID_SIZE_MM),
              })
            }
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
        <div className="flex min-w-0 flex-1 items-center gap-1 lg:gap-1.5 lg:pr-1">
          <Button
            variant="ghost"
            size="sm"
            className={`h-11 min-w-11 gap-1.5 px-2 text-xs font-medium lg:h-7 sm:px-1.5 ${document.snapEnabled ? 'bg-[#e6efff] text-primary' : 'text-slate-400'}`}
            aria-label={
              document.snapEnabled ? 'Turn snapping off' : 'Turn snapping on'
            }
            aria-pressed={document.snapEnabled}
            title={
              document.snapEnabled ? 'Turn snapping off' : 'Turn snapping on'
            }
            onClick={() =>
              updateSettings({
                units: settingsUnits,
                gridSizeMm: document.gridSizeMm,
                snapSizeMm: document.snapSizeMm,
                snapEnabled: !document.snapEnabled,
              })
            }
          >
            <Crosshair className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Snap</span>
          </Button>
          <ScrubbableNumberInput
            aria-label={`Snap size in ${inputUnit}`}
            value={snapValue}
            min={millimetresToUnit(1, inputUnit)}
            max={gridValue}
            step={0.1}
            suffix={inputUnit}
            onValueChange={(nextValue) => {
              const snapSizeMm = unitToMillimetres(nextValue, inputUnit);
              if (snapSizeMm === document.snapSizeMm) return true;
              updateSettings({
                units: settingsUnits,
                gridSizeMm: document.gridSizeMm,
                snapSizeMm,
              });
            }}
            containerClassName="min-w-0 flex-1 lg:w-16 lg:flex-none"
            className="h-11 rounded-lg border-transparent bg-transparent px-2 pr-7 text-center font-mono text-xs shadow-none hover:bg-slate-100 lg:h-7"
            suffixClassName="right-2 h-full text-[11px] leading-none"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-11 shrink-0 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:size-7"
            disabled={document.snapSizeMm === DEFAULT_SNAP_SIZE_MM}
            aria-label={resetSnapLabel}
            title={resetSnapLabel}
            onClick={() =>
              updateSettings({
                units: settingsUnits,
                gridSizeMm: Math.max(document.gridSizeMm, DEFAULT_SNAP_SIZE_MM),
                snapSizeMm: DEFAULT_SNAP_SIZE_MM,
              })
            }
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
