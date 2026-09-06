import { roomPreset } from './room-catalog';

// Apple physical envelopes; mini rounds to the document's integer millimetres.
// Sources and rounding: docs/product/homepod-dimensions.md.
export const homepodCatalog = [
  {
    ...roomPreset('homepod', 'Apple HomePod (2nd generation)', 142, 142, 168, {
      form: 'full',
    }),
    shape: 'ellipse' as const,
  },
  {
    ...roomPreset('homepod', 'Apple HomePod mini', 97.9, 97.9, 84.3, {
      form: 'mini',
    }),
    shape: 'ellipse' as const,
  },
];
