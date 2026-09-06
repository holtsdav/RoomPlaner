// Shared by numeric fields and canvas wall labels.
export const SCRUB_THRESHOLD_PX = 3;
export function scrubValue(
  start: number,
  distancePx: number,
  step: number,
  min = -Infinity,
  max = Infinity,
) {
  // Crossing the drag threshold should advance once, not skip the first step.
  const distance = Math.abs(distancePx);
  const steps =
    distance < SCRUB_THRESHOLD_PX
      ? 0
      : Math.sign(distancePx) *
        (1 + Math.floor((distance - SCRUB_THRESHOLD_PX) / 2));
  const next = Number((start + steps * step).toFixed(10));
  return Math.min(max, Math.max(min, next));
}
