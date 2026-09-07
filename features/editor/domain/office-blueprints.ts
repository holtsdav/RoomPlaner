import { roomBlueprint, roomKinds } from './room-blueprints';
import { appleLogoPath } from './apple-logo';
import type { BlueprintProfile } from './blueprint-profile';
export const officeKinds = [
  'table',
  'ergonomic-chair',
  'chair',
  'desk-lamp',
  'keyboard',
  'monitor',
  'ultrawide-monitor',
  'mouse',
  'deskmat',
  'desktop-pc',
  'speaker',
  'laptop',
  'mac-mini',
  '3d-printer',
] as const;
export type OfficeKind = (typeof officeKinds)[number];
export const bedroomKinds = [
  'bed',
  'bedside-table',
  'wardrobe',
  'chest-of-drawers',
  'vanity',
  'pouf',
  'bedroom-bench',
  'bedside-lamp',
  'rug',
  'laundry-basket',
  'clothes-rail',
] as const;
export const structuralKinds = [
  'stairs-straight',
  'stairs-landing',
  'stairs-winder',
  'stairs-return',
  'door',
  'double-door',
  'window',
] as const;

// Retain removed blueprint IDs so older saved plans still load.
export const blueprintKinds = [
  ...officeKinds,
  ...bedroomKinds,
  ...structuralKinds,
  ...roomKinds,
  'standing-mirror',
  'upright-piano',
] as const;
export type BlueprintKind = (typeof blueprintKinds)[number];

export type BlueprintPath = {
  d: string;
  detail: boolean;
  solid?: boolean;
  part?: string;
};

// All coordinates are fractions of the footprint. Corners use the smaller axis,
// so even very narrow custom sizes stay within their measured bounds.
function buildOfficeBlueprint(
  kind: BlueprintKind,
  width: number,
  depth: number,
  profile?: BlueprintProfile,
): BlueprintPath[] {
  if (
    kind === 'upright-piano' ||
    (roomKinds as readonly string[]).includes(kind)
  )
    return roomBlueprint(kind, width, depth, profile);
  const paths: BlueprintPath[] = [];
  const p = (x: number, y: number) =>
    `${(x - 0.5) * width} ${(y - 0.5) * depth}`;
  const line = (points: number[][], detail = true, closed = false) =>
    paths.push({
      d: `M ${points.map(([x, y]) => p(x, y)).join(' L ')}${closed ? ' Z' : ''}`,
      detail,
    });
  const rect = (
    x: number,
    y: number,
    w: number,
    h: number,
    radius = 0.04,
    detail = false,
  ) => {
    const r = Math.min(
      (width * w) / 2,
      (depth * h) / 2,
      Math.min(width, depth) * radius,
    );
    const rx = r / width,
      ry = r / depth;
    paths.push({
      d: `M ${p(x + rx, y)} L ${p(x + w - rx, y)} Q ${p(x + w, y)} ${p(x + w, y + ry)} L ${p(x + w, y + h - ry)} Q ${p(x + w, y + h)} ${p(x + w - rx, y + h)} L ${p(x + rx, y + h)} Q ${p(x, y + h)} ${p(x, y + h - ry)} L ${p(x, y + ry)} Q ${p(x, y)} ${p(x + rx, y)} Z`,
      detail,
    });
  };
  const ellipse = (
    x: number,
    y: number,
    rx: number,
    ry: number,
    detail = false,
  ) =>
    paths.push({
      d: `M ${p(x - rx, y)} A ${rx * width} ${ry * depth} 0 1 0 ${p(x + rx, y)} A ${rx * width} ${ry * depth} 0 1 0 ${p(x - rx, y)} Z`,
      detail,
    });
  switch (kind) {
    case 'stairs-straight':
      rect(0, 0, 1, 1, 0);
      for (let i = 1; i < 12; i++)
        line([
          [0, i / 12],
          [1, i / 12],
        ]);
      line(
        [
          [0.5, 0.92],
          [0.5, 0.08],
        ],
        true,
      );
      line(
        [
          [0.4, 0.17],
          [0.5, 0.08],
          [0.6, 0.17],
        ],
        true,
      );
      break;
    case 'stairs-landing':
    case 'stairs-winder': {
      const turn = 0.4;
      line(
        [
          [0, 0],
          [1, 0],
          [1, turn],
          [turn, turn],
          [turn, 1],
          [0, 1],
        ],
        false,
        true,
      );
      for (let i = 1; i <= 7; i++) {
        const step = turn + ((1 - turn) * i) / 8;
        line([
          [0, step],
          [turn, step],
        ]);
        line([
          [step, 0],
          [step, turn],
        ]);
      }
      line([
        [0, turn],
        [turn, turn],
        [turn, 0],
      ]);
      if (kind === 'stairs-winder') {
        line([
          [0, 0],
          [turn, turn],
        ]);
        line([
          [0, turn / 2],
          [turn, turn],
        ]);
        line([
          [turn / 2, 0],
          [turn, turn],
        ]);
      }
      line(
        [
          [0.2, 0.92],
          [0.2, 0.2],
          [0.92, 0.2],
        ],
        true,
      );
      line(
        [
          [0.83, 0.14],
          [0.92, 0.2],
          [0.83, 0.26],
        ],
        true,
      );
      break;
    }
    case 'stairs-return':
      rect(0, 0, 1, 1, 0);
      rect(0.46, 0.3, 0.08, 0.7, 0);
      line([
        [0, 0.3],
        [1, 0.3],
      ]);
      for (let i = 1; i < 9; i++) {
        const y = 0.3 + (i * 0.7) / 9;
        line([
          [0, y],
          [0.46, y],
        ]);
        line([
          [0.54, y],
          [1, y],
        ]);
      }
      line(
        [
          [0.23, 0.92],
          [0.23, 0.15],
          [0.77, 0.15],
          [0.77, 0.92],
        ],
        true,
      );
      line(
        [
          [0.69, 0.83],
          [0.77, 0.92],
          [0.85, 0.83],
        ],
        true,
      );
      break;
    case 'door':
      // Closed leaf at the threshold; the arc shows its opening clearance.
      rect(0, 0, 1, 0.045, 0);
      line([
        [0, 0],
        [0, 1],
      ]);
      paths.push({
        d: `M ${p(0, 1)} A ${width} ${depth} 0 0 0 ${p(1, 0)}`,
        detail: true,
      });
      break;
    case 'double-door':
      // Two closed leaves; each swings from its outer jamb toward the room.
      rect(0, 0, 0.5, 0.05, 0);
      rect(0.5, 0, 0.5, 0.05, 0);
      line([
        [0, 0],
        [0, 1],
      ]);
      line([
        [1, 0],
        [1, 1],
      ]);
      paths.push({
        d: `M ${p(0, 1)} A ${width / 2} ${depth} 0 0 0 ${p(0.5, 0)} M ${p(1, 1)} A ${width / 2} ${depth} 0 0 1 ${p(0.5, 0)}`,
        detail: true,
      });
      break;
    case 'window':
      rect(0, 0, 1, 1, 0);
      line([
        [0.025, 0.33],
        [0.975, 0.33],
      ]);
      line([
        [0.025, 0.67],
        [0.975, 0.67],
      ]);
      rect(0, 0, 0.025, 1, 0);
      rect(0.975, 0, 0.025, 1, 0);
      rect(0.49, 0, 0.02, 1, 0);
      break;
    case 'bed': {
      const unit = Math.min(
        width / (profile?.referenceWidthMm ?? 1624),
        depth / (profile?.referenceDepthMm ?? 2182),
      );
      const side = Math.min(50 * unit, width * 0.1) / width;
      const head = Math.min(100 * unit, depth * 0.1) / depth;
      const foot = Math.min(50 * unit, depth * 0.05) / depth;
      rect(0, 0, 1, 1, 0.015);
      rect(0, 0, 1, head, 0.01);
      rect(side, head, 1 - side * 2, 1 - head - foot, 0.03);
      const count = width / depth >= 0.62 ? 2 : 1;
      const pillowW = Math.min(550 * unit, (width - side * width * 2) * 0.4);
      const pillowD = Math.min(350 * unit, depth * 0.19);
      for (let i = 0; i < count; i++) {
        const cx =
          count === 1
            ? 0.5
            : 0.5 + (i === 0 ? -1 : 1) * ((pillowW * 0.55) / width);
        rect(
          cx - pillowW / width / 2,
          head + 0.035,
          pillowW / width,
          pillowD / depth,
          0.045,
          true,
        );
        paths[paths.length - 1].part = 'pillow';
      }
      line([
        [side, head + 0.035 + pillowD / depth + 0.055],
        [1 - side, head + 0.035 + pillowD / depth + 0.055],
      ]);
      break;
    }
    case 'bedside-table':
    case 'chest-of-drawers':
      rect(0, 0, 1, 1, 0.025);
      line([
        [0.04, 0.9],
        [0.96, 0.9],
      ]);
      line([
        [0.38, 0.95],
        [0.62, 0.95],
      ]);
      break;
    case 'wardrobe':
      rect(0, 0, 1, 1, 0.015);
      line([
        [0, 0.91],
        [1, 0.91],
      ]);
      for (const x of [1 / 3, 2 / 3])
        line([
          [x, 0.91],
          [x, 1],
        ]);
      break;
    case 'vanity':
      rect(0, 0, 1, 1, 0.025);
      rect(0.2, 0, 0.6, 0.06, 0.012);
      line([
        [0.04, 0.93],
        [0.96, 0.93],
      ]);
      break;
    case 'pouf':
      rect(0, 0, 1, 1, 0.2);
      rect(0.08, 0.08, 0.84, 0.84, 0.17, true);
      break;
    case 'bedroom-bench':
      rect(0, 0, 1, 1, 0.09);
      rect(0.04, 0.1, 0.92, 0.8, 0.06, true);
      break;
    case 'bedside-lamp':
      ellipse(0.5, 0.5, 0.5, 0.5);
      ellipse(0.5, 0.5, 0.1, 0.1, true);
      break;
    case 'rug':
      rect(0, 0, 1, 1, 0.008);
      rect(0.025, 0.025, 0.95, 0.95, 0.005, true);
      break;
    case 'standing-mirror':
      // A leaning panel projects onto the floor; the rear easel stays visible.
      line(
        [
          [0.12, 0.2],
          [0.22, 0.96],
          [0.78, 0.96],
          [0.88, 0.2],
        ],
        true,
      );
      rect(0.16, 0.93, 0.68, 0.07, 0.025);
      rect(0, 0, 1, 0.3, 0.035);
      rect(0.045, 0.045, 0.91, 0.21, 0.015, true);
      line([
        [0.7, 0.08],
        [0.61, 0.22],
      ]);
      line([
        [0.77, 0.08],
        [0.68, 0.22],
      ]);
      break;
    case 'laundry-basket':
      rect(0, 0, 1, 1, 0.2);
      rect(0.08, 0.08, 0.84, 0.84, 0.16, true);
      // A rumpled towel beneath a loose shirt, contained by the basket rim.
      paths.push({
        d: `M ${p(0.21, 0.58)} Q ${p(0.14, 0.7)} ${p(0.21, 0.82)} Q ${p(0.4, 0.88)} ${p(0.59, 0.79)} L ${p(0.77, 0.8)} Q ${p(0.87, 0.68)} ${p(0.77, 0.55)} Q ${p(0.59, 0.5)} ${p(0.45, 0.59)} Z`,
        detail: true,
      });
      line([
        [0.26, 0.74],
        [0.43, 0.77],
        [0.56, 0.71],
        [0.74, 0.72],
      ]);
      line(
        [
          [0.3, 0.21],
          [0.41, 0.18],
          [0.45, 0.25],
          [0.53, 0.27],
          [0.59, 0.22],
          [0.7, 0.28],
          [0.79, 0.43],
          [0.68, 0.51],
          [0.62, 0.43],
          [0.6, 0.66],
          [0.31, 0.61],
          [0.36, 0.4],
          [0.27, 0.46],
          [0.2, 0.34],
        ],
        false,
        true,
      );
      line([
        [0.43, 0.43],
        [0.4, 0.54],
      ]);
      line([
        [0.34, 0.04],
        [0.66, 0.04],
      ]);
      line([
        [0.34, 0.96],
        [0.66, 0.96],
      ]);
      break;
    case 'clothes-rail':
      rect(0, 0, 0.055, 1, 0.025);
      rect(0.945, 0, 0.055, 1, 0.025);
      // Hanging garments seen edge-on from above, perpendicular to the rail.
      for (const [x, start, end] of [
        [0.22, 0.12, 0.86],
        [0.37, 0.2, 0.8],
        [0.53, 0.1, 0.9],
        [0.7, 0.17, 0.84],
      ]) {
        paths.push({
          d: `M ${p(x, start)} Q ${p(x - 0.035, start + 0.13)} ${p(x - 0.02, 0.46)} Q ${p(x - 0.05, 0.68)} ${p(x - 0.025, end)} L ${p(x + 0.04, end - 0.02)} Q ${p(x + 0.015, 0.64)} ${p(x + 0.04, 0.47)} Q ${p(x + 0.02, start + 0.1)} ${p(x + 0.045, start)} Z`,
          detail: false,
        });
      }
      rect(0, 0.475, 1, 0.05, 0.02);
      break;
    case 'table':
      rect(0, 0, 1, 1, 0.025);
      break;
    case 'deskmat':
      rect(0, 0, 1, 1, 0.06);
      rect(0.025, 0.04, 0.95, 0.92, 0.04, true);
      break;
    case 'ergonomic-chair':
      line(
        [
          [0.5, 0.53],
          [0.5, 0],
        ],
        false,
      );
      line(
        [
          [0.5, 0.53],
          [1, 0.42],
        ],
        false,
      );
      line(
        [
          [0.5, 0.53],
          [0.8, 1],
        ],
        false,
      );
      line(
        [
          [0.5, 0.53],
          [0.2, 1],
        ],
        false,
      );
      line(
        [
          [0.5, 0.53],
          [0, 0.42],
        ],
        false,
      );
      rect(0.13, 0.22, 0.74, 0.67, 0.12);
      rect(0.14, 0.08, 0.72, 0.17, 0.07);
      rect(0.04, 0.3, 0.12, 0.42, 0.05);
      rect(0.84, 0.3, 0.12, 0.42, 0.05);
      break;
    case 'chair':
      rect(0.1, 0.12, 0.8, 0.88, 0.12);
      rect(0, 0, 1, 0.18, 0.055);
      break;
    case 'desk-lamp':
      ellipse(
        0.5,
        0.72,
        Math.min(width * 0.45, depth * 0.28) / width,
        Math.min(width * 0.45, depth * 0.28) / depth,
      );
      line(
        [
          [0.5, 0.72],
          [0.5, 0.12],
        ],
        false,
      );
      rect(0, 0, 1, 0.23, 0.1);
      break;
    case 'keyboard': {
      rect(0, 0, 1, 1, 0.06);
      const layout = profile?.keyboardLayout ?? 'full';
      const end =
        layout === 'compact'
          ? 0.94
          : layout === '75'
            ? 0.88
            : layout === 'tkl'
              ? 0.78
              : 0.65;
      for (const y of [0.2, 0.39, 0.58, 0.77])
        line([
          [0.06, y],
          [end, y],
        ]);
      line([
        [0.2, 0.9],
        [end * 0.8, 0.9],
      ]);
      if (layout === '75' || layout === 'tkl' || layout === 'full')
        rect(end + 0.035, 0.18, 0.06, 0.68, 0.015, true);
      if (layout === 'full') rect(0.81, 0.18, 0.13, 0.68, 0.015, true);
      break;
    }
    case 'monitor':
    case 'ultrawide-monitor': {
      const referenceWidth = profile?.referenceWidthMm ?? 808;
      const referenceDepth = profile?.referenceDepthMm ?? 238;
      const sx = width / referenceWidth,
        sy = depth / referenceDepth;
      const detailScale = Math.min(sx, sy);
      const radius = profile?.curveRadiusMm ?? (kind === 'monitor' ? 0 : 1800);
      const half = referenceWidth / 2;
      const safeRadius = Math.max(radius, half + 1);
      const sag =
        radius === 0 ? 0 : safeRadius - Math.sqrt(safeRadius ** 2 - half ** 2);
      const panelDepth = Math.min(
        depth * 0.85,
        (profile?.panelDepthMm ?? 86) * sy,
      );
      // The thin screen edge stays separate from the curved envelope and the
      // rear electronics housing. Width-only resizing never fattens the panel.
      const thickness = Math.min(18 * detailScale, panelDepth * 0.4);
      const scaledSag = Math.min(sag * sx, panelDepth - thickness);
      const baseWidth = Math.min(
        width * 0.9,
        (profile?.standWidthMm ?? 285) * detailScale,
      );
      const bw = baseWidth / width;
      const neck = Math.min(width * 0.12, 45 * detailScale) / width;
      if (profile?.standStyle === 'feet') {
        line(
          [
            [0.5, 0.04],
            [0.5 - bw / 2, 0.48],
            [0.5 - bw / 2 + 0.035, 0.52],
            [0.5, 0.15],
            [0.5 + bw / 2 - 0.035, 0.52],
            [0.5 + bw / 2, 0.48],
          ],
          false,
          true,
        );
      } else rect(0.5 - bw / 2, 0, bw, 0.55, 0.025);
      rect(0.5 - neck / 2, 0, neck, 1 - scaledSag / depth, 0.025);
      // Schematic housing reaches the published without-stand envelope.
      const housingWidth = Math.min(width * 0.38, 220 * detailScale) / width;
      const rearY = 1 - panelDepth / depth;
      rect(
        0.5 - housingWidth / 2,
        rearY,
        housingWidth,
        Math.max(0.001, (panelDepth - scaledSag) / depth),
        0.03,
      );
      const edge = Array.from({ length: 41 }, (_, index) => {
        const x = index / 40;
        const dx = (x - 0.5) * referenceWidth;
        const rise =
          sag === 0
            ? 0
            : (safeRadius - Math.sqrt(Math.max(0, safeRadius ** 2 - dx ** 2))) /
              sag;
        return [x, 1 - scaledSag / depth + (rise * scaledSag) / depth];
      });
      line(
        [
          ...edge.map(([x, y]) => [x, y - thickness / depth]),
          ...edge.toReversed(),
        ],
        false,
        true,
      );
      paths[paths.length - 1].part = 'screen';
      break;
    }
    case 'mouse':
      ellipse(0.5, 0.5, 0.5, 0.5);
      line([
        [0.05, 0.38],
        [0.95, 0.38],
      ]);
      rect(0.46, 0.16, 0.08, 0.2, 0.04, true);
      break;
    case '3d-printer': {
      // Schematic top view: bed, gantry and toolhead within the machine envelope.
      const form = profile?.form;
      if (form === 'cantilever' || form === 'bed-slinger') {
        rect(0.3, 0, 0.38, 1, 0.035);
        rect(0.14, 0.32, 0.62, 0.64, 0.025);
        rect(0.18, 0.36, 0.54, 0.56, 0.015, true);
        rect(0.84, 0.12, 0.16, 0.36, 0.02);
        if (form === 'bed-slinger') rect(0, 0.12, 0.12, 0.36, 0.02);
        rect(0.04, 0.22, 0.88, 0.08, 0.015);
        rect(0.43, 0.19, 0.16, 0.18, 0.025);
        rect(0.78, 0.72, 0.22, 0.18, 0.025);
        rect(0.81, 0.75, 0.16, 0.1, 0.01, true);
      } else {
        rect(0, 0, 1, 1, 0.035);
        rect(0.07, 0.07, 0.86, 0.81, 0.02, true);
        rect(0.18, 0.18, 0.64, 0.62, 0.015, true);
        rect(0.1, 0.38, 0.8, 0.055, 0.01);
        rect(0.44, 0.34, 0.15, 0.17, 0.02);
        if (form !== 'open-corexy') {
          line([
            [0.08, 0.91],
            [0.92, 0.91],
          ]);
          rect(0.67, 0.93, 0.16, 0.035, 0.01, true);
        }
      }
      break;
    }
    case 'desktop-pc':
      rect(0, 0, 1, 1, 0.035);
      rect(0.12, 0.12, 0.76, 0.62, 0.025, true);
      line([
        [0.12, 0.88],
        [0.7, 0.88],
      ]);
      ellipse(0.85, 0.88, 0.035, 0.025, true);
      break;
    case 'speaker':
      rect(0, 0, 1, 1, 0.035);
      line([
        [0.06, 0.88],
        [0.94, 0.88],
      ]);
      break;
    case 'laptop':
      rect(0, 0, 1, 1, 0.065);
      line([
        [0.1, 0.07],
        [0.9, 0.07],
      ]);
      break;
    case 'mac-mini':
      rect(0, 0, 1, 1, 0.17);
      break;
  }
  if (kind === 'laptop' || kind === 'mac-mini')
    paths.push({
      d: appleLogoPath(width, depth),
      detail: true,
      solid: true,
      part: 'apple-logo',
    });
  return paths;
}

// Shared bounded geometry cache: identical presets are reused by SVG, canvas and PNG.
const blueprintCache = new Map<string, BlueprintPath[]>();
export function officeBlueprint(
  kind: BlueprintKind,
  width: number,
  depth: number,
  profile?: BlueprintProfile,
): BlueprintPath[] {
  const key = JSON.stringify([kind, width, depth, profile]);
  const existing = blueprintCache.get(key);
  if (existing) return existing;
  const paths = buildOfficeBlueprint(kind, width, depth, profile);
  if (blueprintCache.size >= 512)
    blueprintCache.delete(blueprintCache.keys().next().value!);
  blueprintCache.set(key, paths);
  return paths;
}
