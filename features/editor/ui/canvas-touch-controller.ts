import type Konva from 'konva';

export type CanvasViewport = { x: number; y: number; scale: number };
type Point = { x: number; y: number };
export type CanvasContact = Point & { id: number };
type Target = {
  tap: () => void;
  drag?: {
    start: () => void;
    move: (delta: Point) => void;
    end: () => void;
    cancel: () => void;
  };
};
type SingleGesture = {
  kind: 'single';
  contact: CanvasContact;
  viewport: CanvasViewport;
  target: Target;
  moved: boolean;
};
type PinchGesture = {
  kind: 'pinch';
  ids: number[];
  center: Point;
  distance: number;
  viewport: CanvasViewport;
};

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const center = (a: Point, b: Point) => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

// One owner for the entire touch sequence. In particular, lifting one finger
// after a pinch must never turn the remaining finger into an object drag/tap.
export function createCanvasTouchController(options: {
  viewport: () => CanvasViewport;
  setViewport: (viewport: CanvasViewport) => void;
  target: (point: Point) => Target;
  minScale: number;
  maxScale: number;
}) {
  let gesture: SingleGesture | PinchGesture | null = null;
  let navigating = false;
  const cancelEdit = () => {
    if (gesture?.kind === 'single' && gesture.moved)
      gesture.target.drag?.cancel();
  };
  const rebase = (contacts: CanvasContact[]) => {
    if (contacts.length >= 2) {
      cancelEdit();
      navigating = true;
      gesture = {
        kind: 'pinch',
        ids: contacts.slice(0, 2).map((contact) => contact.id),
        center: center(contacts[0], contacts[1]),
        distance: Math.max(1, distance(contacts[0], contacts[1])),
        viewport: options.viewport(),
      };
    } else if (contacts.length === 1) {
      gesture = {
        kind: 'single',
        contact: contacts[0],
        viewport: options.viewport(),
        target: navigating ? { tap() {} } : options.target(contacts[0]),
        moved: false,
      };
    } else {
      gesture = null;
      navigating = false;
    }
  };
  return {
    start: rebase,
    move(contacts: CanvasContact[]) {
      if (!gesture) return;
      if (gesture.kind === 'pinch') {
        const ids = gesture.ids;
        const a = contacts.find((contact) => contact.id === ids[0]);
        const b = contacts.find((contact) => contact.id === ids[1]);
        if (!a || !b) return;
        const nextCenter = center(a, b);
        const initial = gesture.viewport;
        const scale = Math.min(
          options.maxScale,
          Math.max(
            options.minScale,
            (initial.scale * distance(a, b)) / gesture.distance,
          ),
        );
        options.setViewport({
          scale,
          x:
            nextCenter.x -
            ((gesture.center.x - initial.x) * scale) / initial.scale,
          y:
            nextCenter.y -
            ((gesture.center.y - initial.y) * scale) / initial.scale,
        });
        return;
      }
      const id = gesture.contact.id;
      const contact = contacts.find((item) => item.id === id);
      if (!contact) return;
      const delta = {
        x: contact.x - gesture.contact.x,
        y: contact.y - gesture.contact.y,
      };
      if (!gesture.moved) {
        if (Math.hypot(delta.x, delta.y) < 6) return;
        gesture.moved = true;
        gesture.target.drag?.start();
      }
      if (gesture.target.drag) {
        gesture.target.drag.move({
          x: delta.x / gesture.viewport.scale,
          y: delta.y / gesture.viewport.scale,
        });
      } else {
        options.setViewport({
          ...gesture.viewport,
          x: gesture.viewport.x + delta.x,
          y: gesture.viewport.y + delta.y,
        });
      }
    },
    end(contacts: CanvasContact[]) {
      if (gesture?.kind === 'single') {
        if (gesture.moved) gesture.target.drag?.end();
        else if (!navigating) gesture.target.tap();
      }
      rebase(contacts);
    },
    cancel() {
      cancelEdit();
      gesture = null;
      navigating = false;
    },
  };
}

export function findCanvasTouchTarget(
  stage: Konva.Stage,
  point: Point,
): Konva.Node {
  // Visible corner dots stay small; their touch targets are 44 screen pixels.
  const corners = stage
    .find('.touch-corner')
    .filter((node) => node.isVisible());
  const corner = corners.sort(
    (a, b) =>
      distance(a.getAbsolutePosition(), point) -
      distance(b.getAbsolutePosition(), point),
  )[0];
  if (corner && distance(corner.getAbsolutePosition(), point) <= 22)
    return corner;
  const hit = stage.getIntersection(point);
  if (hit && (hit.findAncestor('.touch-object') || hit.draggable())) return hit;
  const nearby = stage
    .find('.touch-object')
    .filter((node) => {
      const rect = node.getClientRect();
      const padX = Math.max(0, (44 - rect.width) / 2);
      const padY = Math.max(0, (44 - rect.height) / 2);
      return (
        node.isVisible() &&
        point.x >= rect.x - padX &&
        point.x <= rect.x + rect.width + padX &&
        point.y >= rect.y - padY &&
        point.y <= rect.y + rect.height + padY
      );
    })
    .sort(
      (a, b) =>
        distance(a.getAbsolutePosition(), point) -
        distance(b.getAbsolutePosition(), point),
    );
  return nearby[0] ?? hit ?? stage;
}
