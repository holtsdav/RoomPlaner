import {
  formatWallMeasurement,
  type PlanDocument,
} from '../domain/plan-document';

export function WallLengthLabel({
  widthPx,
  wallIndex,
  lengthMm,
  units,
  left,
  top,
  angleDeg,
}: {
  widthPx: number;
  wallIndex: number;
  lengthMm: number;
  units: PlanDocument['units'];
  left: number;
  top: number;
  angleDeg: number;
}) {
  return (
    <span
      aria-label={`Wall ${wallIndex + 1} inside length: ${formatWallMeasurement(lengthMm, units)}`}
      className="pointer-events-none absolute z-10 flex h-7 items-center justify-center rounded bg-[#fcfdff] px-2 font-mono text-xs font-medium whitespace-nowrap text-[#294b68]"
      style={{
        left,
        top,
        width: widthPx,
        transform: `translate(-50%, -50%) rotate(${angleDeg}deg)`,
      }}
    >
      {formatWallMeasurement(lengthMm, units)}
    </span>
  );
}
