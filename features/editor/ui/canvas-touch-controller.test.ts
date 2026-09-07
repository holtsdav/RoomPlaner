import { describe, expect, it, vi } from 'vitest';
import {
  createCanvasTouchController,
  type CanvasViewport,
} from './canvas-touch-controller';

const finger = (id: number, x: number, y: number) => ({ id, x, y });
function setup(editable = false) {
  let viewport: CanvasViewport = { x: 20, y: 30, scale: 0.2 };
  let position = { x: 100, y: 200 };
  const original = { ...position };
  const tap = vi.fn();
  const start = vi.fn();
  const end = vi.fn();
  const cancel = vi.fn(() => {
    position = { ...original };
  });
  const move = vi.fn((delta: { x: number; y: number }) => {
    position = { x: original.x + delta.x, y: original.y + delta.y };
  });
  const target = vi.fn(() => ({
    tap,
    drag: editable ? { start, move, end, cancel } : undefined,
  }));
  const controller = createCanvasTouchController({
    viewport: () => viewport,
    setViewport: (next) => {
      viewport = next;
    },
    target,
    minScale: 0.01,
    maxScale: 0.8,
  });
  return {
    controller,
    tap,
    start,
    move,
    end,
    cancel,
    target,
    viewport: () => viewport,
    position: () => position,
  };
}

describe('canvas touch gestures', () => {
  it('selects on release despite finger jitter, without editing', () => {
    const s = setup(true);
    s.controller.start([finger(1, 100, 100)]);
    s.controller.move([finger(1, 103, 102)]);
    s.controller.end([]);
    expect(s.tap).toHaveBeenCalledOnce();
    expect(s.start).not.toHaveBeenCalled();
    expect(s.end).not.toHaveBeenCalled();
  });

  it('pans empty space without triggering a deselection tap', () => {
    const s = setup();
    s.controller.start([finger(1, 100, 100)]);
    s.controller.move([finger(1, 140, 160)]);
    s.controller.end([]);
    expect(s.viewport()).toEqual({ x: 60, y: 90, scale: 0.2 });
    expect(s.tap).not.toHaveBeenCalled();
  });

  it('moves geometry in world units and commits only once on release', () => {
    const s = setup(true);
    s.controller.start([finger(1, 100, 100)]);
    s.controller.move([finger(1, 120, 130)]);
    s.controller.move([finger(1, 140, 160)]);
    expect(s.position()).toEqual({ x: 300, y: 500 });
    expect(s.viewport()).toEqual({ x: 20, y: 30, scale: 0.2 });
    expect(s.start).toHaveBeenCalledOnce();
    expect(s.end).not.toHaveBeenCalled();
    s.controller.end([]);
    expect(s.end).toHaveBeenCalledOnce();
    expect(s.tap).not.toHaveBeenCalled();
  });

  it('zooms around the moving midpoint and matches contacts by identifier', () => {
    const s = setup();
    s.controller.start([finger(1, 100, 100), finger(2, 200, 100)]);
    s.controller.move([finger(2, 270, 130), finger(1, 70, 130)]);
    expect(s.viewport()).toEqual({ x: -90, y: -10, scale: 0.4 });
    s.controller.end([]);
    expect(s.tap).not.toHaveBeenCalled();
    expect(s.target).not.toHaveBeenCalled();
  });

  it('uses two fingers to pan without a scale change', () => {
    const s = setup(true);
    s.controller.start([finger(1, 100, 100), finger(2, 200, 100)]);
    s.controller.move([finger(1, 140, 170), finger(2, 240, 170)]);
    expect(s.viewport()).toEqual({ x: 60, y: 100, scale: 0.2 });
    expect(s.start).not.toHaveBeenCalled();
  });

  it('rolls back a preview when a second finger starts navigation', () => {
    const s = setup(true);
    s.controller.start([finger(1, 100, 100)]);
    s.controller.move([finger(1, 120, 130)]);
    s.controller.start([finger(1, 120, 130), finger(2, 220, 130)]);
    expect(s.cancel).toHaveBeenCalledOnce();
    expect(s.position()).toEqual({ x: 100, y: 200 });
    s.controller.move([finger(1, 100, 130), finger(2, 240, 130)]);
    s.controller.end([finger(1, 100, 130)]);
    const before = s.viewport();
    s.controller.move([finger(1, 130, 160)]);
    expect(s.viewport()).toEqual({
      ...before,
      x: before.x + 30,
      y: before.y + 30,
    });
    s.controller.end([]);
    expect(s.end).not.toHaveBeenCalled();
    expect(s.tap).not.toHaveBeenCalled();
    // The next independent touch can edit again.
    s.controller.start([finger(3, 100, 100)]);
    s.controller.end([]);
    expect(s.tap).toHaveBeenCalledOnce();
  });

  it('does not select after a pinch when the remaining finger lifts without moving', () => {
    const s = setup(true);
    s.controller.start([finger(1, 100, 100)]);
    s.controller.start([finger(1, 100, 100), finger(2, 200, 100)]);
    s.controller.end([finger(2, 200, 100)]);
    s.controller.end([]);
    expect(s.tap).not.toHaveBeenCalled();
    expect(s.end).not.toHaveBeenCalled();
  });

  it('rebases when a third finger replaces one pinch contact without jumping', () => {
    const s = setup();
    s.controller.start([finger(1, 100, 100), finger(2, 200, 100)]);
    s.controller.move([finger(1, 100, 100), finger(2, 250, 100)]);
    s.controller.start([
      finger(1, 100, 100),
      finger(2, 250, 100),
      finger(3, 300, 200),
    ]);
    s.controller.end([finger(2, 250, 100), finger(3, 300, 200)]);
    const before = s.viewport();
    s.controller.move([finger(2, 250, 100), finger(3, 300, 200)]);
    expect(s.viewport()).toEqual(before);
  });

  it('cancels an interrupted edit and accepts a fresh gesture', () => {
    const s = setup(true);
    s.controller.start([finger(1, 100, 100)]);
    s.controller.move([finger(1, 150, 130)]);
    s.controller.cancel();
    s.controller.end([]);
    expect(s.position()).toEqual({ x: 100, y: 200 });
    expect(s.end).not.toHaveBeenCalled();
    s.controller.start([finger(2, 100, 100)]);
    s.controller.move([finger(2, 140, 140)]);
    s.controller.end([]);
    expect(s.end).toHaveBeenCalledOnce();
  });

  it('clamps zoom while keeping the pinch anchor fixed', () => {
    const s = setup();
    s.controller.start([finger(1, 140, 100), finger(2, 160, 100)]);
    s.controller.move([finger(1, -850, 100), finger(2, 1150, 100)]);
    expect(s.viewport()).toEqual({ x: -370, y: -180, scale: 0.8 });
    s.controller.move([finger(1, 150, 100), finger(2, 150, 100)]);
    expect(s.viewport()).toEqual({ x: 143.5, y: 96.5, scale: 0.01 });
  });
});
