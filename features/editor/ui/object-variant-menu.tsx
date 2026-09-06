'use client';

import { ObjectPreview } from './object-preview';
import type { ReactElement } from 'react';
import { Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { CatalogPreset } from '../domain/catalog';
import { formatMeasurement, type PlanDocument } from '../domain/plan-document';

export function ObjectVariantMenu({
  presets,
  units,
  trigger,
  onChoose,
  currentId,
  disabled = false,
}: {
  presets: CatalogPreset[];
  units: PlanDocument['units'];
  trigger: ReactElement;
  onChoose: (preset: CatalogPreset) => void;
  currentId?: string;
  disabled?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} disabled={disabled} />
      <DropdownMenuContent
        className="w-72 max-w-[calc(100vw-24px)]"
        align="start"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            Choose {presets[0].name.split(' · ')[0].toLowerCase()}
          </DropdownMenuLabel>
          {presets.map((preset) => (
            <DropdownMenuItem
              key={preset.id}
              onClick={() => onChoose(preset)}
              className="min-h-11 gap-3"
            >
              <ObjectPreview {...preset} className="size-10 w-14 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block">
                  {preset.name.split(' · ')[1] ?? preset.name}
                </span>
                {preset.blueprint === 'bed' &&
                  preset.blueprintProfile?.mattressWidthMm &&
                  preset.blueprintProfile.mattressDepthMm && (
                    <span className="block font-mono text-[11px] text-slate-500">
                      Mattress{' '}
                      {formatMeasurement(
                        preset.blueprintProfile.mattressWidthMm,
                        units,
                      )}{' '}
                      ×{' '}
                      {formatMeasurement(
                        preset.blueprintProfile.mattressDepthMm,
                        units,
                      )}
                    </span>
                  )}
                <span className="block font-mono text-[11px] text-slate-500">
                  {preset.blueprint === 'bed' ? 'Frame ' : ''}
                  {formatMeasurement(preset.widthMm, units)} ×{' '}
                  {formatMeasurement(preset.depthMm, units)}
                  {preset.heightMm !== undefined && (
                    <> × {formatMeasurement(preset.heightMm, units)} H</>
                  )}
                </span>
              </span>
              {currentId === preset.id && (
                <Check aria-label="Current size" className="size-4" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
