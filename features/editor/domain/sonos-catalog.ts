import { roomPreset as p } from './room-catalog';

// Width and floor depth in mm. Source audit: docs/product/room-object-dimensions.md.
// Round fractional manufacturer millimetres once when creating a preset.
export const sonosCatalog = [
  ...(
    [
      ['Arc Ultra', 1178, 110.6],
      ['Beam Ultra', 750, 105],
      ['Beam Gen 2', 651, 100],
      ['Ray', 559, 95],
    ] as const
  ).map(([name, w, d]) =>
    p('soundbar', `Sonos Soundbar · ${name}`, w, d, {
      mounting: 'surface',
    }),
  ),
  ...(
    [
      ['Era 100', 120, 130.5, 'oval'],
      ['Era 300', 260, 185, 'era300'],
      ['Five', 364, 154, 'box'],
      ['Move 2', 160, 126, 'oval'],
      ['Sonos Play', 112.5, 76.7, 'oval'],
      ['Roam 2', 62, 60, 'box'],
    ] as const
  ).map(([name, w, d, form]) =>
    p('sonos-speaker', `Sonos Speaker · ${name}`, w, d, {
      form,
      mounting: 'surface',
    }),
  ),
  ...(
    [
      ['Sub 4', 402, 158, 'box'],
      ['Sub Mini', 230, 230, 'cylinder'],
    ] as const
  ).map(([name, w, d, form]) => ({
    ...p('subwoofer', `Subwoofer · ${name}`, w, d, { form }),
    name: `Sonos Subwoofer · ${name}`,
  })),
  ...(
    [
      ['Amp', 217, 217, 'amp'],
      ['Amp Multi', 436.8, 265.2, 'box'],
      ['Port', 138, 138, 'box'],
    ] as const
  ).map(([name, w, d, form]) =>
    p('audio-component', `Sonos Component · ${name}`, w, d, {
      form,
      mounting: 'surface',
    }),
  ),
];
