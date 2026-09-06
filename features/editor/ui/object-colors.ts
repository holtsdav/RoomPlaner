import type { ObjectCategory } from '../domain/plan-document';

const greyBlueprint = {
  fill: '#e2e8f0',
  stroke: '#475569',
  detail: '#94a3b8',
};

export const objectColors = {
  seating: greyBlueprint,
  table: greyBlueprint,
  device: greyBlueprint,
  custom: greyBlueprint,
} satisfies Record<ObjectCategory, Record<string, string>>;

export const windowColors = {
  fill: '#dbefff',
  stroke: '#648ba8',
  detail: '#8fb9d6',
};

export const colorChoices = [
  { name: 'Blue', value: '#93c5fd' },
  { name: 'Green', value: '#86efac' },
  { name: 'Amber', value: '#fcd34d' },
  { name: 'Rose', value: '#fda4af' },
  { name: 'Purple', value: '#c4b5fd' },
  { name: 'Slate', value: '#94a3b8' },
];

export function getObjectColors(object: {
  category: ObjectCategory;
  blueprint?: string;
  color?: string;
}) {
  if (!object.color)
    return object.blueprint === 'window'
      ? windowColors
      : objectColors[object.category];
  const channels = [1, 3, 5].map((index) =>
    Number.parseInt(object.color!.slice(index, index + 2), 16),
  );
  const mix = (amount: number) =>
    `#${channels
      .map((channel) =>
        Math.round(channel * amount)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')}`;
  return { fill: object.color, stroke: mix(0.35), detail: mix(0.58) };
}
