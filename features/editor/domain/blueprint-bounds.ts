import type { BlueprintPath } from './office-blueprints';

/** Fit absolute M/L/Q/axis-aligned ellipse paths to their real measured envelope.
 * Bézier control points are not extrema: evaluate the derivative roots instead.
 */
export function fitBlueprintBounds(
  paths: BlueprintPath[],
  width: number,
  depth: number,
): BlueprintPath[] {
  const parse = (d: string) =>
    [...d.matchAll(/([MLQCAZ])([^MLQCAZ]*)/g)].map((match) => ({
      command: match[1],
      values: match[2]
        .trim()
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(Number),
    }));
  const segments = paths.map((path) => parse(path.d));
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  const include = (x: number, y: number) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  };
  segments.forEach((parts, index) => {
    if (paths[index].detail) return;
    let x = 0,
      y = 0;
    for (const { command, values: v } of parts) {
      if (command === 'M' || command === 'L') {
        [x, y] = v;
        include(x, y);
      }
      if (command === 'Q') {
        const [cx, cy, ex, ey] = v;
        for (const [a, b, c] of [
          [x, cx, ex],
          [y, cy, ey],
        ]) {
          const t = (a - b) / (a - 2 * b + c);
          if (t > 0 && t < 1)
            include(
              (1 - t) ** 2 * x + 2 * (1 - t) * t * cx + t * t * ex,
              (1 - t) ** 2 * y + 2 * (1 - t) * t * cy + t * t * ey,
            );
        }
        [x, y] = [ex, ey];
        include(x, y);
      }
      if (command === 'C') {
        // These are axis-aligned ellipse quadrants: their controls stay within
        // the quadrant bounds, and their endpoints are the axis extrema.
        for (let i = 0; i < v.length; i += 2) include(v[i], v[i + 1]);
        [x, y] = v.slice(-2);
      }
      if (command === 'A') {
        const [rx, ry, , , , ex, ey] = v;
        const cx = (x + ex) / 2,
          cy = (y + ey) / 2;
        include(cx - rx, cy - ry);
        include(cx + rx, cy + ry);
        [x, y] = [ex, ey];
      }
    }
  });
  const sx = width / (maxX - minX),
    sy = depth / (maxY - minY);
  const tx = (x: number) => (x - minX) * sx - width / 2;
  const ty = (y: number) => (y - minY) * sy - depth / 2;
  return paths.map((path, index) => ({
    ...path,
    d: segments[index]
      .map(({ command, values: v }) => {
        if (command === 'A')
          v = [v[0] * sx, v[1] * sy, ...v.slice(2, 5), tx(v[5]), ty(v[6])];
        else v = v.map((n, i) => (i % 2 === 0 ? tx(n) : ty(n)));
        return `${command} ${v.join(' ')}`;
      })
      .join(' '),
  }));
}
