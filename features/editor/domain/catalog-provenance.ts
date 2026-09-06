import sources from './catalog-sources.json';
import { objectCatalog, type CatalogPreset } from './catalog';
import type { PlanObject } from './plan-document';

export function catalogProvenance(object: CatalogPreset | PlanObject) {
  const preset =
    'locked' in object
      ? objectCatalog.find(
          (candidate) =>
            candidate.id === object.blueprintProfile?.presetId ||
            candidate.name === object.name.replace(/(?: copy)+$/, ''),
        )
      : object;
  const reference =
    preset &&
    sources.find(
      (source) =>
        source.size[0] === preset.widthMm &&
        source.size[1] === preset.depthMm &&
        source.size[2] === preset.heightMm,
    );
  return {
    label: reference
      ? 'Manufacturer reference'
      : preset
        ? 'Generic planning size'
        : 'Custom dimensions',
    model: reference?.model,
    url: reference?.url,
    checked: reference?.checked,
    note: reference
      ? 'Reference outer dimensions, rounded to millimetres. Blueprint details are schematic. Your dimensions remain editable.'
      : 'A representative planning footprint. Measure your actual object before relying on the fit.',
    clearance:
      preset?.blueprint === '3d-printer'
        ? 'Allow extra space for moving beds, doors, lids, AMS, spools, waste, cables and ventilation. Operating clearance is not included.'
        : 'Operating, door-opening, cable and access clearances are not included.',
  };
}
