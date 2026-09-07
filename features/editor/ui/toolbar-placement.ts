export type ToolbarSelectionBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

/** Return a position only when the entire toolbar clears the selection and handles. */
export function placeSelectionToolbar(
  selection: ToolbarSelectionBounds,
  canvas: { width: number; height: number },
  toolbar: { width: number; height: number },
) {
  const inset = 8;
  const gap = 24;
  const topEdge = Math.min(72, canvas.height / 4);
  const bottomEdge = canvas.height - Math.min(128, canvas.height / 3);
  const rightEdge = canvas.width - inset - toolbar.width;
  const bottomTop = bottomEdge - toolbar.height;
  if (rightEdge < inset || bottomTop < topEdge) return null;
  const left = Math.max(
    inset,
    Math.min((selection.minX + selection.maxX - toolbar.width) / 2, rightEdge),
  );
  const top = Math.max(
    topEdge,
    Math.min((selection.minY + selection.maxY - toolbar.height) / 2, bottomTop),
  );
  const candidates = [
    { left, top: selection.minY - gap - toolbar.height },
    { left, top: selection.maxY + gap },
    { left: selection.maxX + gap, top },
    { left: selection.minX - gap - toolbar.width, top },
  ];
  return (
    candidates.find(
      (position) =>
        position.left >= inset &&
        position.left <= rightEdge &&
        position.top >= topEdge &&
        position.top <= bottomTop,
    ) ?? null
  );
}
