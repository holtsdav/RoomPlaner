export type Viewport = { x: number; y: number; scale: number };
export type ViewSize = { width: number; height: number };

/** Preserve the world point at the centre while making a smaller viewport usable. */
export function resizeViewport(
  viewport: Viewport,
  previous: ViewSize,
  next: ViewSize,
  minScale: number,
): Viewport {
  const scale = Math.max(
    minScale,
    viewport.scale *
      Math.min(1, next.width / previous.width, next.height / previous.height),
  );
  const centre = {
    x: (previous.width / 2 - viewport.x) / viewport.scale,
    y: (previous.height / 2 - viewport.y) / viewport.scale,
  };
  return {
    scale,
    x: next.width / 2 - centre.x * scale,
    y: next.height / 2 - centre.y * scale,
  };
}
