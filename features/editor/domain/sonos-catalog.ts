import { roomPreset as p } from './room-catalog';

// Width, floor depth, height in mm. Source audit: docs/product/room-object-dimensions.md.
// Round fractional manufacturer millimetres once when creating a preset.
export const sonosCatalog = [
  ...(
    [
      ['Arc Ultra', 1178, 110.6, 75],
      ['Beam Ultra', 750, 105, 63],
      ['Beam Gen 2', 651, 100, 68],
      ['Ray', 559, 95, 71],
    ] as const
  ).map(([name, w, d, h]) =>
    p('soundbar', `Sonos Soundbar · ${name}`, w, d, h, {
      mounting: 'surface',
      mountingHeightMm: 500,
    }),
  ),
  ...(
    [
      ['Era 100', 120, 130.5, 182.5, 'oval'],
      ['Era 300', 260, 185, 160, 'era300'],
      ['Five', 364, 154, 203, 'box'],
      ['Move 2', 160, 126, 242, 'oval'],
      ['Sonos Play', 112.5, 76.7, 192.3, 'oval'],
      ['Roam 2', 62, 60, 168, 'box'],
    ] as const
  ).map(([name, w, d, h, form]) =>
    p('sonos-speaker', `Sonos Speaker · ${name}`, w, d, h, {
      form,
      mounting: 'surface',
      mountingHeightMm: 0,
    }),
  ),
  ...(
    [
      ['Sub 4', 402, 158, 389, 'box'],
      ['Sub Mini', 230, 230, 305, 'cylinder'],
    ] as const
  ).map(([name, w, d, h, form]) => ({
    ...p('subwoofer', `Subwoofer · ${name}`, w, d, h, { form }),
    name: `Sonos Subwoofer · ${name}`,
  })),
  ...(
    [
      ['Amp', 217, 217, 64, 'amp'],
      ['Amp Multi', 436.8, 265.2, 64.5, 'box'],
      ['Port', 138, 138, 41, 'box'],
    ] as const
  ).map(([name, w, d, h, form]) =>
    p('audio-component', `Sonos Component · ${name}`, w, d, h, {
      form,
      mounting: 'surface',
      mountingHeightMm: 200,
    }),
  ),
];
