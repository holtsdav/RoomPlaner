import type { CatalogPreset } from '../domain/catalog';
import type { PlanObject } from '../domain/plan-document';
import { catalogProvenance } from '../domain/catalog-provenance';

export function DimensionProvenance({
  object,
}: {
  object: CatalogPreset | PlanObject;
}) {
  const source = catalogProvenance(object);
  return (
    <div className="space-y-1 py-2 text-xs leading-5 text-slate-600">
      <p className="font-medium">{source.label}</p>
      {source.url && (
        <p>
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            {source.model}
          </a>
          {source.checked && <> · Source checked {source.checked}</>}
        </p>
      )}
      <p>{source.note}</p>
      <p>{source.clearance}</p>
    </div>
  );
}
