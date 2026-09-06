import { formatMeasurement, type PlanDocument } from '../domain/plan-document';
import { insideRoomBounds } from '../domain/room-measurements';

export function RoomMeasurementHelp({ document }: { document: PlanDocument }) {
  const bounds = insideRoomBounds(document.room);
  return (
    <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
      <p>
        Enter your measurements from the inside faces of the walls, just as you
        measure with a tape. Wall thickness is handled automatically.
      </p>
      <p>
        <strong>
          Inside bounds: {formatMeasurement(bounds.width, document.units)} ×{' '}
          {formatMeasurement(bounds.height, document.units)}
        </strong>
      </p>
      <p className="text-xs">
        For irregular rooms, width and depth span the inside outline. Each
        canvas label measures its individual inside wall face, accounting for
        the corners.
      </p>
    </div>
  );
}
