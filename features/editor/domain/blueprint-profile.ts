import { z } from 'zod';

export const blueprintProfileSchema = z.object({
  presetId: z.string().max(160).optional(),
  form: z.string().max(160).optional(),
  mounting: z
    .enum([
      'floor',
      'surface',
      'wall',
      'ceiling',
      'wall-perpendicular',
      'corner',
    ])
    .optional(),
  imageDiagonalIn: z.number().positive().max(1_000_000).optional(),
  imageWidthMm: z.number().positive().max(1_000_000).optional(),
  referenceWidthMm: z.number().positive().max(1_000_000),
  referenceDepthMm: z.number().positive().max(1_000_000),
  mattressWidthMm: z.number().positive().max(1_000_000).optional(),
  mattressDepthMm: z.number().positive().max(1_000_000).optional(),
  panelDepthMm: z.number().positive().max(1_000_000).optional(),
  curveRadiusMm: z.number().nonnegative().max(1_000_000).optional(),
  standWidthMm: z.number().positive().max(1_000_000).optional(),
  standStyle: z.enum(['plate', 'feet']).optional(),
  keyboardLayout: z.enum(['compact', '75', 'tkl', 'full']).optional(),
});
export type BlueprintProfile = z.infer<typeof blueprintProfileSchema>;

// Panel envelope is depth WITHOUT the stand, not the thickness of the screen.
// References and which internal details are schematic: docs/product/home-office-dimension-audit.md.
export const monitorProfiles: Record<
  string,
  [number, number, number, 'plate' | 'feet']
> = {
  'Monitor · 19″': [51, 0, 245, 'plate'],
  'Monitor · 22″': [52, 0, 245, 'plate'],
  'Monitor · 24″': [52, 0, 245, 'plate'],
  'Monitor · 25″': [50, 0, 245, 'plate'],
  'Monitor · 27″': [52, 0, 268, 'plate'],
  'Monitor · 28″': [64, 0, 300, 'feet'],
  'Monitor · 32″': [56, 0, 300, 'plate'],
  'Monitor · 43″': [64, 0, 320, 'plate'],
  'Ultrawide Monitor · 29″': [45, 0, 300, 'feet'],
  'Ultrawide Monitor · 30″': [103, 1500, 320, 'feet'],
  'Ultrawide Monitor · 34″': [86, 1800, 285, 'plate'],
  'Ultrawide Monitor · 35″': [94, 1800, 330, 'feet'],
  'Ultrawide Monitor · 38″': [102, 2300, 300, 'plate'],
  'Ultrawide Monitor · 39″': [198, 800, 350, 'plate'],
  'Ultrawide Monitor · 40″': [108, 2500, 320, 'plate'],
  'Ultrawide Monitor · 45″': [218, 800, 400, 'plate'],
  'Ultrawide Monitor · 49″': [294, 1000, 600, 'feet'],
  'Ultrawide Monitor · 57″': [338, 1000, 640, 'feet'],
};

export function profileForPreset(
  name: string,
  widthMm: number,
  depthMm: number,
): BlueprintProfile | undefined {
  const monitor = monitorProfiles[name];
  if (monitor)
    return {
      referenceWidthMm: widthMm,
      referenceDepthMm: depthMm,
      panelDepthMm: monitor[0],
      curveRadiusMm: monitor[1],
      standWidthMm: monitor[2],
      standStyle: monitor[3],
    };
  if (name.startsWith('Keyboard · '))
    return {
      referenceWidthMm: widthMm,
      referenceDepthMm: depthMm,
      keyboardLayout: name.includes('60%')
        ? 'compact'
        : name.includes('75%')
          ? '75'
          : name.includes('Tenkeyless')
            ? 'tkl'
            : 'full',
    };
}
