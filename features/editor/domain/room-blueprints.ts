import { fitBlueprintBounds } from './blueprint-bounds';
import type { BlueprintProfile } from './blueprint-profile';
import type { BlueprintPath } from './office-blueprints';

export const roomKinds = [
  'grand-piano',
  'electric-piano',
  'acoustic-drums',
  'guitar-stand',
  'guitar-wall',
  'framed-picture',
  'dining-table',
  'dining-chair',
  'toilet',
  'basin-vanity',
  'bathtub',
  'shower',
  'shower-screen',
  'bidet',
  'bathroom-cabinet',
  'washing-machine',
  'dryer',
  'towel-rail',
  'kitchen-cabinet',
  'wall-cabinet',
  'pantry',
  'kitchen-island',
  'kitchen-sink',
  'hob',
  'oven',
  'cooker',
  'fridge',
  'dishwasher',
  'microwave',
  'extractor',
  'coffee-machine',
  'kettle',
  'toaster',
  'waste-bin',
  'bar-stool',
  'sofa',
  'armchair',
  'coffee-table',
  'side-table',
  'tv',
  'media-cabinet',
  'sideboard',
  'bookcase',
  'display-cabinet',
  'floor-lamp',
  'plant',
  'projector-screen',
  'projector',
  'soundbar',
  'sonos-speaker',
  'homepod',
  'speaker-base',
  'tower-speaker',
  'centre-speaker',
  'subwoofer',
  'av-receiver',
  'audio-component',
  'speaker-stand',
  'cinema-seat',
  'acoustic-panel',
  'bass-trap',
] as const;

/** Shared top-down paths for previews, canvas and exports. */
export function roomBlueprint(
  kind: string,
  width: number,
  depth: number,
  profile?: BlueprintProfile,
  offsetY = 0,
): BlueprintPath[] {
  const paths: BlueprintPath[] = [];
  const p = (x: number, y: number) =>
    `${(x - 0.5) * width} ${(y - 0.5) * depth + offsetY}`;
  const path = (d: string, detail = false, solid = false) =>
    paths.push({ d, detail, solid });
  const line = (points: number[][]) =>
    path(`M ${points.map(([x, y]) => p(x, y)).join(' L ')}`, true);
  const polygon = (points: number[][], detail = false) =>
    path(`M ${points.map(([x, y]) => p(x, y)).join(' L ')} Z`, detail);
  const rect = (
    x: number,
    y: number,
    w: number,
    h: number,
    radius = 0.025,
    detail = false,
  ) => {
    const r = Math.min(
        (width * w) / 2,
        (depth * h) / 2,
        Math.min(width, depth) * radius,
      ),
      rx = r / width,
      ry = r / depth;
    path(
      `M ${p(x + rx, y)} L ${p(x + w - rx, y)} Q ${p(x + w, y)} ${p(x + w, y + ry)} L ${p(x + w, y + h - ry)} Q ${p(x + w, y + h)} ${p(x + w - rx, y + h)} L ${p(x + rx, y + h)} Q ${p(x, y + h)} ${p(x, y + h - ry)} L ${p(x, y + ry)} Q ${p(x, y)} ${p(x + rx, y)} Z`,
      detail,
    );
  };
  const ellipse = (
    x: number,
    y: number,
    rx: number,
    ry: number,
    detail = false,
    solid = false,
  ) =>
    path(
      `M ${p(x - rx, y)} C ${p(x - rx, y - ry * 0.5522847498)} ${p(x - rx * 0.5522847498, y - ry)} ${p(x, y - ry)} C ${p(x + rx * 0.5522847498, y - ry)} ${p(x + rx, y - ry * 0.5522847498)} ${p(x + rx, y)} C ${p(x + rx, y + ry * 0.5522847498)} ${p(x + rx * 0.5522847498, y + ry)} ${p(x, y + ry)} C ${p(x - rx * 0.5522847498, y + ry)} ${p(x - rx, y + ry * 0.5522847498)} ${p(x - rx, y)} Z`,
      detail,
      solid,
    );
  const leaf = (
    baseX: number,
    baseY: number,
    tipX: number,
    tipY: number,
    spread: number,
    detail = false,
  ) => {
    const dx = tipX - baseX;
    const dy = tipY - baseY;
    const length = Math.hypot(dx, dy);
    const shoulderX = baseX + dx * 0.52;
    const shoulderY = baseY + dy * 0.52;
    const normalX = (-dy / length) * spread;
    const normalY = (dx / length) * spread;
    path(
      `M ${p(baseX, baseY)} Q ${p(shoulderX + normalX, shoulderY + normalY)} ${p(tipX, tipY)} Q ${p(shoulderX - normalX, shoulderY - normalY)} ${p(baseX, baseY)} Z`,
      detail,
    );
  };
  const cabinet = () => {
    rect(0, 0, 1, 1);
    line([
      [0.03, 0.93],
      [0.97, 0.93],
    ]);
  };
  const burners = () => {
    for (const x of [0.28, 0.72])
      for (const y of [0.3, 0.7]) ellipse(x, y, 0.13, 0.13, true);
  };
  const form = profile?.form ?? '';
  const basin = (x: number, w: number) => {
    rect(x, 0.2, w, 0.65, 0.12, true);
    ellipse(x + w / 2, 0.54, 0.025, 0.035, true);
    line([
      [x + w / 2, 0.04],
      [x + w / 2, 0.25],
    ]);
  };
  switch (kind) {
    case 'grand-piano': {
      // Concert grand: straight bass rim at left and curved treble wing at right.
      path(`M ${p(0, 1)} L ${p(0, 0.12)} Q ${p(0, 0)} ${p(0.25, 0)}
        Q ${p(0.64, 0)} ${p(0.65, 0.24)}
        Q ${p(0.64, 0.47)} ${p(0.84, 0.6)}
        Q ${p(1, 0.69)} ${p(1, 0.8)} L ${p(1, 1)} Z`);
      path(
        `M ${p(0.04, 0.8)} L ${p(0.04, 0.13)} Q ${p(0.04, 0.035)} ${p(0.25, 0.035)}
        Q ${p(0.59, 0.035)} ${p(0.61, 0.24)}
        Q ${p(0.6, 0.49)} ${p(0.81, 0.62)}
        Q ${p(0.94, 0.7)} ${p(0.95, 0.8)} Z`,
        true,
      );
      line([
        [0.085, 0.075],
        [0.085, 0.79],
      ]);
      rect(0.17, 0.755, 0.66, 0.035, 0.005, true);
      rect(0.055, 0.865, 0.89, 0.12, 0, true);
      line([
        [0.04, 0.835],
        [0.96, 0.835],
      ]);
      for (let i = 1; i < 52; i++) {
        const x = 0.055 + (i / 52) * 0.89;
        line([
          [x, 0.865],
          [x, 0.985],
        ]);
        if (![1, 4].includes((i - 1) % 7))
          path(
            `M ${p(x - 0.005, 0.865)} L ${p(x + 0.005, 0.865)} L ${p(x + 0.005, 0.94)} L ${p(x - 0.005, 0.94)} Z`,
            true,
            true,
          );
      }
      break;
    }
    case 'upright-piano':
    case 'electric-piano': {
      rect(0, 0, 1, 1, 0.025);
      const keyTop = kind === 'upright-piano' ? 0.63 : 0.4;
      rect(0.05, keyTop, 0.9, 0.34, 0, true);
      // An 88-key piano has 52 white keys, starting on A.
      for (let i = 1; i < 52; i++) {
        const x = 0.05 + (i / 52) * 0.9;
        line([
          [x, keyTop],
          [x, keyTop + 0.34],
        ]);
        if (![1, 4].includes((i - 1) % 7))
          path(
            `M ${p(x - 0.005, keyTop)} L ${p(x + 0.005, keyTop)} L ${p(x + 0.005, keyTop + 0.2)} L ${p(x - 0.005, keyTop + 0.2)} Z`,
            true,
            true,
          );
      }
      if (kind === 'upright-piano') {
        line([
          [0.03, 0.12],
          [0.97, 0.12],
        ]);
        line([
          [0.05, 0.55],
          [0.95, 0.55],
        ]);
      } else {
        rect(0.42, 0.12, 0.16, 0.14, 0.01, true);
        for (const x of [0.08, 0.85]) rect(x, 0.08, 0.07, 0.21, 0.01, true);
      }
      break;
    }
    case 'acoustic-drums': {
      // Drummer sits at the bottom: kick ahead, rack toms in the middle,
      // snare and hi-hat on the left, floor tom and ride on the right.
      const drum = (x: number, y: number, r: number) => {
        const ry = (r * 2000) / 1450;
        ellipse(x, y, r, ry);
        ellipse(x, y, r * 0.9, ry * 0.9, true);
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          line([
            [x + Math.cos(a) * r * 0.91, y + Math.sin(a) * ry * 0.91],
            [x + Math.cos(a) * r, y + Math.sin(a) * ry],
          ]);
        }
      };
      const cymbal = (x: number, y: number, r: number) => {
        const ry = (r * 2000) / 1450;
        ellipse(x, y, r, ry);
        ellipse(x, y, r * 0.94, ry * 0.94, true);
        ellipse(x, y, r * 0.18, ry * 0.18, true);
        ellipse(x, y, 0.007, 0.008, true, true);
      };
      rect(0.355, 0, 0.29, 0.35, 0.02);
      rect(0.35, 0, 0.3, 0.025, 0.006);
      rect(0.35, 0.325, 0.3, 0.025, 0.006);
      for (const x of [0.38, 0.44, 0.56, 0.62]) {
        line([
          [x, 0.03],
          [x, 0.085],
        ]);
        line([
          [x, 0.265],
          [x, 0.32],
        ]);
      }
      drum(0.31, 0.54, 0.105);
      drum(0.76, 0.54, 0.135);
      drum(0.405, 0.335, 0.092);
      drum(0.59, 0.345, 0.105);
      cymbal(0.235, 0.285, 0.135);
      cymbal(0.845, 0.29, 0.155);
      cymbal(0.11, 0.56, 0.11);
      ellipse(0.5, 1 - 345 / 1450, 0.1125, 225 / 1450);
      ellipse(0.5, 1 - 345 / 1450, 0.1, 200 / 1450, true);
      break;
    }
    case 'guitar-stand':
    case 'guitar-wall': {
      const wall = kind === 'guitar-wall';
      if (wall) {
        rect(0.405, 0, 0.19, 0.075, 0.015);
        ellipse(0.435, 0.037, 0.012, 0.014, true);
        ellipse(0.565, 0.037, 0.012, 0.014, true);
        rect(0.475, 0.075, 0.05, 0.21, 0.01);
        path(
          `M ${p(0.39, 0.19)} L ${p(0.39, 0.32)} Q ${p(0.5, 0.4)} ${p(0.61, 0.32)} L ${p(0.61, 0.19)}`,
          true,
        );
      } else {
        // Two padded A-frame rails and a rear crossbar, seen from above.
        rect(0.08, 0, 0.065, 1, 0.025);
        rect(0.855, 0, 0.065, 1, 0.025);
        rect(0.145, 0.22, 0.71, 0.045, 0.01);
        polygon([
          [0.12, 0.29],
          [0.15, 0.27],
          [0.43, 0.84],
          [0.4, 0.87],
        ]);
        polygon([
          [0.88, 0.29],
          [0.85, 0.27],
          [0.57, 0.84],
          [0.6, 0.87],
        ]);
      }
      const referenceWidth = Math.max(
        412,
        profile?.referenceWidthMm ?? (wall ? 412 : 500),
      );
      const referenceDepth = profile?.referenceDepthMm ?? (wall ? 200 : 450);
      paths.push(
        ...roomBlueprint(
          'guitar-body',
          (width * 412) / referenceWidth,
          (depth * (118 / 0.6)) / referenceDepth,
          undefined,
          (depth * (wall ? 100 - 118 / 1.2 : 50)) / referenceDepth,
        ),
      );
      if (!wall) {
        rect(0.16, 0.82, 0.06, 0.09, 0.02);
        rect(0.78, 0.82, 0.06, 0.09, 0.02);
      }
      break;
    }
    case 'guitar-body': {
      // Shared physical body, independent of stand footprint. Its 0.6-depth
      // projection is 118 mm; width is 412 mm (Yamaha FG-series reference).
      const left = 0,
        right = 1,
        back = 0.4,
        front = 1;
      const bodyStart = paths.length;
      path(`M ${p(0.5, back)} Q ${p(left, back)} ${p(left + 0.055, back + 0.16)}
        Q ${p(left + 0.1, back + 0.23)} ${p(left + 0.035, front - 0.14)}
        Q ${p(left, front - 0.11)} ${p(left, front - 0.045)}
        Q ${p(left, front)} ${p(0.5, front)}
        Q ${p(right, front)} ${p(right, front - 0.045)}
        Q ${p(right, front - 0.11)} ${p(right - 0.035, front - 0.14)}
        Q ${p(right - 0.1, back + 0.23)} ${p(right - 0.055, back + 0.16)}
        Q ${p(right, back)} ${p(0.5, back)} Z`);
      paths[bodyStart].part = 'guitar-body';
      const face = front - 0.14;
      path(
        `M ${p(left, front - 0.045)} Q ${p(left + 0.15, face - 0.04)} ${p(0.5, face)} Q ${p(right - 0.15, face - 0.04)} ${p(right, front - 0.045)}`,
        true,
      );
      ellipse(0.5, face + 0.027, 0.145, 0.028, true);
      ellipse(0.5, face + 0.027, 0.12, 0.019, true);
      rect(0.445, 0.36, 0.11, face - 0.34, 0, false);
      polygon([
        [0.435, 0.38],
        [0.405, 0.2],
        [0.5, 0.13],
        [0.595, 0.2],
        [0.565, 0.38],
      ]);
      for (let i = 0; i < 3; i++) {
        const y = 0.235 + i * 0.052;
        rect(0.365, y, 0.055, 0.021, 0.009);
        rect(0.58, y, 0.055, 0.021, 0.009);
        ellipse(0.465, y + 0.012, 0.013, 0.012, true);
        ellipse(0.535, y + 0.012, 0.013, 0.012, true);
      }
      for (let i = 1; i <= 5; i++) {
        const y = 0.38 + ((face - 0.38) * i) / 6;
        line([
          [0.448, y],
          [0.552, y],
        ]);
      }
      rect(0.3, front - 0.05, 0.4, 0.018, 0.005, true);
      for (let i = 0; i < 6; i++) {
        const x = 0.46 + i * 0.016;
        line([
          [x, 0.37],
          [x, front - 0.025],
        ]);
      }
      break;
    }
    case 'framed-picture':
      rect(0, 0, 1, 1, 0);
      line([
        [0.025, 0],
        [0.025, 1],
      ]);
      line([
        [0.975, 0],
        [0.975, 1],
      ]);
      line([
        [0.025, 0.72],
        [0.975, 0.72],
      ]);
      break;
    case 'toilet':
      ellipse(0.5, 0.57, 0.4, 0.43);
      ellipse(0.5, 0.58, 0.29, 0.3, true);
      if (form !== 'wall-hung') {
        rect(0, 0, 1, 0.22, 0.04);
        rect(0.44, 0.06, 0.12, 0.05, 0.02, true);
      } else
        line([
          [0.17, 0.02],
          [0.83, 0.02],
        ]);
      break;
    case 'bidet':
      ellipse(0.5, 0.5, 0.5, 0.5);
      ellipse(0.5, 0.57, 0.32, 0.3, true);
      line([
        [0.5, 0.08],
        [0.5, 0.28],
      ]);
      break;
    case 'basin-vanity':
    case 'kitchen-sink':
      rect(0, 0, 1, 1);
      if (form === 'double') {
        basin(0.06, 0.4);
        basin(0.54, 0.4);
      } else basin(0.1, 0.8);
      break;
    case 'bathtub':
      rect(0, 0, 1, 1, 0.2);
      rect(0.07, 0.05, 0.86, 0.9, 0.22, true);
      ellipse(0.5, 0.16, 0.04, 0.025, true);
      break;
    case 'shower':
      rect(0, 0, 1, 1, 0.03);
      rect(0.04, 0.04, 0.92, 0.92, 0.02, true);
      ellipse(0.77, 0.2, 0.035, 0.035, true);
      line([
        [0, 0.76],
        [0, 0],
        [1, 0],
        [1, 1],
        [0.75, 1],
      ]);
      line([
        [0.75, 1],
        [0.75, 0.3],
      ]);
      path(
        `M ${p(0.05, 1)} A ${width * 0.7} ${depth * 0.7} 0 0 1 ${p(0.75, 0.3)}`,
        true,
      );
      break;
    case 'shower-screen':
      rect(0, 0, 1, 1, 0);
      line([
        [0.03, 0.5],
        [0.97, 0.5],
      ]);
      break;
    case 'bathroom-cabinet':
    case 'pantry':
    case 'media-cabinet':
    case 'sideboard':
    case 'wall-cabinet':
    case 'display-cabinet':
      cabinet();
      line([
        [0.5, 0.93],
        [0.5, 1],
      ]);
      if (kind === 'display-cabinet')
        line([
          [0.05, 0.85],
          [0.95, 0.85],
        ]);
      break;
    case 'bookcase':
      cabinet();
      line([
        [0.04, 0.82],
        [0.96, 0.82],
      ]);
      break;
    case 'washing-machine':
    case 'dryer':
    case 'dishwasher':
    case 'oven':
      cabinet();
      rect(0.09, 0.92, 0.28, 0.045, 0.008, true);
      line([
        [0.35, 0.98],
        [0.65, 0.98],
      ]);
      break;
    case 'towel-rail':
      rect(0.06, 0, 0.08, 1, 0.02);
      rect(0.86, 0, 0.08, 1, 0.02);
      rect(0, 0.38, 1, 0.24, 0.03);
      break;
    case 'kitchen-cabinet':
      if (form === 'corner') {
        polygon([
          [0, 0],
          [1, 0],
          [1, 0.55],
          [0.55, 0.55],
          [0.55, 1],
          [0, 1],
        ]);
        line([
          [0.05, 0.95],
          [0.5, 0.95],
          [0.5, 0.5],
          [0.95, 0.5],
        ]);
      } else cabinet();
      break;
    case 'kitchen-island':
      rect(0, 0, 1, 1, 0.02);
      rect(0.03, 0.04, 0.94, 0.92, 0.01, true);
      break;
    case 'hob':
    case 'cooker':
      rect(0, 0, 1, 1, 0.035);
      burners();
      if (kind === 'cooker')
        line([
          [0.04, 0.95],
          [0.96, 0.95],
        ]);
      break;
    case 'fridge':
      cabinet();
      line([
        [0.08, 0.96],
        [0.4, 0.96],
      ]);
      if (form === 'side-by-side') {
        line([
          [0.5, 0.86],
          [0.5, 1],
        ]);
        line([
          [0.6, 0.96],
          [0.92, 0.96],
        ]);
      }
      break;
    case 'microwave':
      cabinet();
      line([
        [0.84, 0.92],
        [0.84, 1],
      ]);
      break;
    case 'extractor':
      rect(0, 0, 1, 1);
      rect(0.3, 0, 0.4, 0.55, 0.02, true);
      break;
    case 'coffee-machine':
      rect(0, 0, 1, 0.82, 0.05);
      rect(0.1, 0.7, 0.8, 0.3, 0.025);
      rect(0.32, 0.24, 0.36, 0.28, 0.04, true);
      line([
        [0.2, 0.9],
        [0.8, 0.9],
      ]);
      break;
    case 'kettle':
      // Closed handle loop, rounded body and pouring spout, seen from above.
      path(
        `M ${p(0.72, 0.22)} L ${p(0.89, 0.22)} Q ${p(1, 0.22)} ${p(1, 0.34)} L ${p(1, 0.72)} Q ${p(1, 0.84)} ${p(0.89, 0.84)} L ${p(0.72, 0.84)} L ${p(0.72, 0.75)} L ${p(0.88, 0.75)} Q ${p(0.91, 0.75)} ${p(0.91, 0.71)} L ${p(0.91, 0.35)} Q ${p(0.91, 0.31)} ${p(0.88, 0.31)} L ${p(0.72, 0.31)} Z`,
      );
      ellipse(0.44, 0.53, 0.39, 0.47);
      path(
        `M ${p(0.14, 0.24)} L ${p(0, 0.07)} L ${p(0.09, 0)} L ${p(0.29, 0.15)} Q ${p(0.21, 0.2)} ${p(0.14, 0.24)} Z`,
      );
      ellipse(0.44, 0.53, 0.27, 0.32, true);
      rect(0.37, 0.48, 0.14, 0.1, 0.04, true);
      break;
    case 'toaster':
      rect(0, 0, 1, 1, 0.15);
      rect(0.13, 0.25, 0.68, 0.1, 0.035, true);
      rect(0.13, 0.62, 0.68, 0.1, 0.035, true);
      break;
    case 'waste-bin':
      rect(0, 0, 1, 1, 0.2);
      rect(0.1, 0.1, 0.8, 0.8, 0.15, true);
      line([
        [0.37, 0.85],
        [0.63, 0.85],
      ]);
      break;
    case 'dining-chair':
      rect(0.06, 0, 0.88, 0.2, 0.06);
      rect(0, 0.16, 1, 0.84, 0.1);
      rect(0.06, 0.23, 0.88, 0.7, 0.06, true);
      break;
    case 'bar-stool':
      ellipse(0.5, 0.5, 0.5, 0.5);
      ellipse(0.5, 0.5, 0.42, 0.42, true);
      line([
        [0.3, 0.1],
        [0.7, 0.1],
      ]);
      break;
    case 'sofa': {
      const l = form === 'l',
        u = form === 'u';
      if (l || u)
        polygon(
          u
            ? [
                [0, 0],
                [1, 0],
                [1, 1],
                [0.73, 1],
                [0.73, 0.5],
                [0.27, 0.5],
                [0.27, 1],
                [0, 1],
              ]
            : [
                [0, 0],
                [1, 0],
                [1, 0.5],
                [0.35, 0.5],
                [0.35, 1],
                [0, 1],
              ],
        );
      else rect(0, 0, 1, 1, 0.08);
      const seatDepth = l || u ? 0.26 : 0.7;
      rect(0.05, 0.04, 0.9, 0.12, 0.035, true);
      for (let i = 0; i < 3; i++)
        rect(0.08 + i * 0.28, 0.2, 0.26, seatDepth, 0.04, true);
      if (l || u) {
        rect(0.05, 0.59, u ? 0.17 : 0.25, 0.34, 0.035, true);
        if (u) rect(0.78, 0.59, 0.17, 0.34, 0.035, true);
      } else {
        rect(0, 0.15, 0.06, 0.85, 0.03);
        rect(0.94, 0.15, 0.06, 0.85, 0.03);
      }
      break;
    }
    case 'armchair':
    case 'cinema-seat': {
      const reclined = form === 'reclined';
      rect(0, 0, 1, 1, 0.09);
      rect(0.1, 0.04, 0.8, 0.2, 0.06, true);
      rect(0.17, 0.28, 0.66, reclined ? 0.34 : 0.62, 0.07, true);
      rect(0.02, 0.25, 0.12, reclined ? 0.4 : 0.7, 0.025);
      rect(0.86, 0.25, 0.12, reclined ? 0.4 : 0.7, 0.025);
      if (reclined) rect(0.17, 0.67, 0.66, 0.3, 0.03, true);
      if (kind === 'cinema-seat') {
        ellipse(0.08, 0.4, 0.025, 0.02, true);
        ellipse(0.92, 0.4, 0.025, 0.02, true);
      }
      break;
    }
    case 'dining-table':
    case 'coffee-table':
    case 'side-table':
      if (form === 'round') ellipse(0.5, 0.5, 0.5, 0.5);
      else rect(0, 0, 1, 1, 0.06);
      break;
    case 'tv': {
      const panel =
        Math.min(
          (profile?.panelDepthMm ?? 60) *
            Math.min(
              width / (profile?.referenceWidthMm ?? width),
              depth / (profile?.referenceDepthMm ?? depth),
            ),
          depth,
        ) / depth;
      if (profile?.mounting !== 'wall') {
        rect(0.15, 0, 0.05, 1, 0.02);
        rect(0.8, 0, 0.05, 1, 0.02);
      }
      // The mounting bracket accounts for the rear clearance in the 70 mm envelope.
      if (profile?.mounting === 'wall') rect(0.3, 0, 0.4, 1, 0.01);
      rect(0, 1 - panel, 1, panel, 0.015);
      line([
        [0.04, 0.05],
        [0.96, 0.05],
      ]);
      break;
    }
    case 'floor-lamp':
      ellipse(0.5, 0.5, 0.5, 0.5);
      ellipse(0.5, 0.5, 0.12, 0.12, true);
      break;
    case 'plant':
      if (form === 'succulent') {
        for (const [tipX, tipY] of [
          [0.5, 0.08],
          [0.78, 0.18],
          [0.92, 0.5],
          [0.78, 0.82],
          [0.5, 0.92],
          [0.22, 0.82],
          [0.08, 0.5],
          [0.22, 0.18],
        ])
          leaf(0.5, 0.5, tipX, tipY, 0.09);
        ellipse(0.5, 0.5, 0.23, 0.23, false, true);
        ellipse(0.5, 0.5, 0.13, 0.13, true);
      } else if (form === 'desk-plant' || form === 'compact-floor') {
        const compact = form === 'compact-floor';
        for (const [tipX, tipY] of [
          [0.5, 0.04],
          [0.83, 0.14],
          [0.94, 0.46],
          [0.75, 0.9],
          [0.28, 0.91],
          [0.06, 0.58],
          [0.17, 0.19],
        ])
          leaf(0.5, 0.5, tipX, tipY, compact ? 0.13 : 0.1);
        ellipse(
          0.5,
          0.5,
          compact ? 0.2 : 0.23,
          compact ? 0.2 : 0.23,
          false,
          true,
        );
        ellipse(0.5, 0.5, compact ? 0.13 : 0.15, compact ? 0.13 : 0.15, true);
      } else if (form === 'broadleaf') {
        for (const [baseX, baseY, tipX, tipY] of [
          [0.47, 0.47, 0.35, 0.03],
          [0.53, 0.47, 0.73, 0.06],
          [0.54, 0.5, 0.96, 0.34],
          [0.54, 0.54, 0.82, 0.9],
          [0.49, 0.55, 0.4, 0.97],
          [0.46, 0.53, 0.07, 0.76],
          [0.46, 0.49, 0.04, 0.31],
        ])
          leaf(baseX, baseY, tipX, tipY, 0.15);
        ellipse(0.5, 0.5, 0.18, 0.18, false, true);
        ellipse(0.5, 0.5, 0.11, 0.11, true);
      } else {
        const large = form === 'large-palm';
        for (const [tipX, tipY] of [
          [0.5, 0.02],
          [0.73, 0.04],
          [0.91, 0.16],
          [0.98, 0.39],
          [0.93, 0.68],
          [0.7, 0.94],
          [0.43, 0.98],
          [0.16, 0.9],
          [0.03, 0.66],
          [0.04, 0.35],
          [0.2, 0.1],
        ])
          leaf(0.5, 0.5, tipX, tipY, large ? 0.075 : 0.095);
        ellipse(
          0.5,
          0.5,
          large ? 0.14 : 0.17,
          large ? 0.14 : 0.17,
          false,
          true,
        );
        ellipse(0.5, 0.5, large ? 0.08 : 0.1, large ? 0.08 : 0.1, true);
      }
      break;
    case 'projector-screen':
      rect(0, 0, 1, 1, form === 'retractable' ? 0.15 : 0);
      line([
        [0.025, 0.65],
        [0.975, 0.65],
      ]);
      rect(0, 0, 0.015, 1, 0);
      rect(0.985, 0, 0.015, 1, 0);
      break;
    case 'projector':
      rect(0, 0, 1, 1, 0.07);
      if (form === 'ust') rect(0.17, 0.15, 0.66, 0.18, 0.06, true);
      else {
        rect(0.64, 0.87, 0.23, 0.13, 0.03, true);
        line([
          [0.09, 0.2],
          [0.4, 0.2],
        ]);
      }
      break;
    case 'soundbar':
      rect(0, 0, 1, 1, 0.45);
      line([
        [0.07, 0.78],
        [0.93, 0.78],
      ]);
      line([
        [0.46, 0.3],
        [0.54, 0.3],
      ]);
      break;
    case 'homepod': {
      ellipse(0.5, 0.5, 0.5, 0.5);
      const topRadius = form === 'mini' ? 0.27 : 0.37;
      ellipse(0.5, 0.5, topRadius, topRadius, true);
      line([
        [0.36, 0.5],
        [0.42, 0.5],
      ]);
      line([
        [0.58, 0.5],
        [0.64, 0.5],
      ]);
      line([
        [0.61, 0.47],
        [0.61, 0.53],
      ]);
      break;
    }
    case 'sonos-speaker':
      if (form === 'lamp') {
        ellipse(0.5, 0.5, 0.5, 0.5);
        ellipse(0.5, 0.5, 0.1, 0.1, true);
      } else if (form === 'picture') {
        rect(0, 0, 1, 1, 0.025);
        line([
          [0.025, 0.7],
          [0.975, 0.7],
        ]);
      } else if (form === 'era300') {
        path(
          `M ${p(0.08, 0)} Q ${p(0.5, 0.2)} ${p(0.92, 0)} Q ${p(1, 0.4)} ${p(0.98, 0.9)} Q ${p(0.5, 1)} ${p(0.02, 0.9)} Q ${p(0, 0.4)} ${p(0.08, 0)} Z`,
        );
        line([
          [0.12, 0.8],
          [0.88, 0.8],
        ]);
      } else {
        rect(0, 0, 1, 1, form === 'oval' ? 0.4 : 0.13);
        line([
          [0.18, 0.76],
          [0.82, 0.76],
        ]);
      }
      break;
    case 'speaker-base':
    case 'centre-speaker':
      rect(0, 0, 1, 1, 0.09);
      line([
        [0.05, 0.93],
        [0.95, 0.93],
      ]);
      break;
    case 'tower-speaker':
      rect(0, 0, 1, 1, 0.04);
      rect(0.07, 0.04, 0.86, 0.89, 0.035, true);
      break;
    case 'subwoofer':
      if (form === 'cylinder') ellipse(0.5, 0.5, 0.5, 0.5);
      else rect(0, 0, 1, 1, 0.12);
      // Driver opening is on the SIDE, invisible in the plan view.
      line([
        [0.43, 0.13],
        [0.57, 0.13],
      ]);
      break;
    case 'av-receiver':
    case 'audio-component':
      rect(0, 0, 1, 1, 0.04);
      line([
        [0.03, 0.94],
        [0.97, 0.94],
      ]);
      if (form === 'amp') ellipse(0.5, 0.47, 0.32, 0.32, true);
      else
        for (let i = 0; i < 3; i++)
          line([
            [0.18, 0.2 + i * 0.1],
            [0.82, 0.2 + i * 0.1],
          ]);
      break;
    case 'speaker-stand':
      rect(0, 0, 1, 1, 0.09);
      rect(0.28, 0.25, 0.44, 0.5, 0.025, true);
      break;
    case 'acoustic-panel':
      rect(0, 0, 1, 1, 0.02);
      line([
        [0.04, 0.78],
        [0.96, 0.78],
      ]);
      break;
    case 'bass-trap':
      polygon([
        [0, 0],
        [1, 0],
        [0, 1],
      ]);
      line([
        [0.08, 0.85],
        [0.85, 0.08],
      ]);
      break;
  }
  return kind === 'plant' || (kind === 'sonos-speaker' && form === 'era300')
    ? fitBlueprintBounds(paths, width, depth)
    : paths;
}
