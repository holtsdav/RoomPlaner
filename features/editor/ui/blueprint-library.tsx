'use client';

import { DimensionProvenance } from './dimension-provenance';
import { ObjectVariantMenu } from './object-variant-menu';
import {
  catalogSearchText,
  catalogFamilyKey,
  type CatalogPreset,
} from '../domain/catalog';
import type { PlanDocument } from '../domain/plan-document';
import { ObjectPreview } from './object-preview';
import { formatMeasurement } from '../domain/plan-document';

function LibraryItem({
  presets,
  units,
  onAdd,
}: {
  presets: CatalogPreset[];
  units: PlanDocument['units'];
  onAdd: (preset: CatalogPreset) => void;
}) {
  const preset = presets[0];
  const name = preset.name.split(' · ')[0];
  const card = (
    <button
      type="button"
      aria-label={presets.length > 1 ? `Choose ${name}` : `Add ${name}`}
      onClick={presets.length > 1 ? undefined : () => onAdd(preset)}
      className="flex min-h-32 w-full flex-col items-center overflow-hidden rounded-[10px] border border-slate-200 bg-white text-center hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
    >
      <ObjectPreview {...preset} className="h-20 w-full px-2" />
      <span className="px-1 text-xs font-semibold text-slate-800">{name}</span>
      <span className="my-1 font-mono text-[10px] tabular-nums text-slate-600">
        {formatMeasurement(preset.widthMm, units)} ×{' '}
        {formatMeasurement(preset.depthMm, units)}
        {preset.heightMm !== undefined && (
          <> × {formatMeasurement(preset.heightMm, units)} H</>
        )}
      </span>
    </button>
  );
  const item =
    presets.length > 1 ? (
      <ObjectVariantMenu
        presets={presets}
        units={units}
        trigger={card}
        onChoose={onAdd}
      />
    ) : (
      card
    );
  return (
    <div className="min-w-0">
      {item}
      <details className="mt-1">
        <summary className="flex min-h-11 cursor-pointer items-center rounded px-1 text-[11px] text-slate-600 focus-visible:outline-2 focus-visible:outline-blue-600">
          About dimensions
        </summary>
        {presets.map((entry) => (
          <div key={entry.id}>
            <p className="text-xs font-medium">{entry.name}</p>
            <DimensionProvenance object={entry} />
          </div>
        ))}
      </details>
    </div>
  );
}

export function BlueprintLibrary({
  catalog,
  categoryName,
  query,
  units,
  onAdd,
}: {
  catalog: readonly CatalogPreset[];
  categoryName: string;
  query: string;
  units: PlanDocument['units'];
  onAdd: (preset: CatalogPreset) => void;
}) {
  const families = [...new Set(catalog.map(catalogFamilyKey))].map((kind) =>
    catalog.filter((preset) => catalogFamilyKey(preset) === kind),
  );
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {families
          .filter(
            (family) =>
              categoryName.toLowerCase().includes(query) ||
              family.some((preset) =>
                catalogSearchText(preset).includes(query),
              ),
          )
          .map((presets) => (
            <LibraryItem
              key={catalogFamilyKey(presets[0])}
              presets={presets}
              units={units}
              onAdd={onAdd}
            />
          ))}
      </div>
    </>
  );
}
