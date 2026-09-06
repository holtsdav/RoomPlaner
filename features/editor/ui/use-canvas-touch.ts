'use client';

import type Konva from 'konva';
import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import {
  createCanvasTouchController,
  findCanvasTouchTarget,
  type CanvasViewport,
} from './canvas-touch-controller';

export function useCanvasTouch({
  containerRef,
  stageRef,
  ready,
  roomId,
  setViewport,
  cancelEdit,
  minScale,
  maxScale,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  stageRef: RefObject<Konva.Stage | null>;
  ready: boolean;
  roomId: string;
  setViewport: (viewport: CanvasViewport) => void;
  cancelEdit: () => void;
  minScale: number;
  maxScale: number;
}) {
  const callbacks = useRef({ setViewport, cancelEdit });
  useLayoutEffect(() => {
    callbacks.current = { setViewport, cancelEdit };
  });
  useEffect(() => {
    const element = containerRef.current;
    const stage = stageRef.current;
    if (!ready || !element || !stage) return;
    let nativeEvent: TouchEvent;
    const activeIds = new Set<number>();
    const controller = createCanvasTouchController({
      minScale,
      maxScale,
      viewport: () => ({ x: stage.x(), y: stage.y(), scale: stage.scaleX() }),
      setViewport: (viewport) => {
        // Keep hit testing and consecutive events current before React renders.
        stage.position(viewport);
        stage.scale({ x: viewport.scale, y: viewport.scale });
        callbacks.current.setViewport(viewport);
      },
      target: (point) => {
        const target = findCanvasTouchTarget(stage, point);
        let draggable: Konva.Node | null = target;
        while (draggable && draggable !== stage && !draggable.draggable())
          draggable = draggable.getParent();
        const node = draggable && draggable !== stage ? draggable : null;
        const origin = node?.position();
        const tap = () =>
          flushSync(() => target.fire('tap', { evt: nativeEvent }, true));
        return {
          tap,
          drag:
            node && origin
              ? {
                  start: () => {
                    // Selection must render first so group movement uses current IDs.
                    tap();
                    node.fire('dragstart', { evt: nativeEvent }, true);
                  },
                  move: (delta) => {
                    node.position({
                      x: origin.x + delta.x,
                      y: origin.y + delta.y,
                    });
                    node.fire('dragmove', { evt: nativeEvent }, true);
                  },
                  end: () => node.fire('dragend', { evt: nativeEvent }, true),
                  cancel: () => {
                    node.position(origin);
                    callbacks.current.cancelEdit();
                  },
                }
              : undefined,
        };
      },
    });
    const contacts = (event: TouchEvent) => {
      const bounds = stage.container().getBoundingClientRect();
      return Array.from(event.touches)
        .filter((touch) => activeIds.has(touch.identifier))
        .map((touch) => ({
          id: touch.identifier,
          x: touch.clientX - bounds.left,
          y: touch.clientY - bounds.top,
        }));
    };
    const claim = (event: TouchEvent) => {
      nativeEvent = event;
      if (event.cancelable) event.preventDefault();
      // Konva's native touch drag must not compete with this gesture owner.
      event.stopImmediatePropagation();
      stage.setPointersPositions(event);
    };
    const start = (event: TouchEvent) => {
      if (
        !(event.target instanceof Element) ||
        !event.target.closest('.konvajs-content')
      )
        return;
      for (const touch of Array.from(event.changedTouches))
        activeIds.add(touch.identifier);
      claim(event);
      controller.start(contacts(event));
    };
    const move = (event: TouchEvent) => {
      if (!activeIds.size) return;
      claim(event);
      controller.move(contacts(event));
    };
    const end = (event: TouchEvent) => {
      if (
        !Array.from(event.changedTouches).some((touch) =>
          activeIds.has(touch.identifier),
        )
      )
        return;
      claim(event);
      for (const touch of Array.from(event.changedTouches))
        activeIds.delete(touch.identifier);
      controller.end(contacts(event));
    };
    const cancel = () => {
      controller.cancel();
      activeIds.clear();
    };
    const touchCancel = (event: TouchEvent) => {
      if (!activeIds.size) return;
      claim(event);
      cancel();
    };
    const options = { capture: true, passive: false };
    element.addEventListener('touchstart', start, options);
    window.addEventListener('touchmove', move, options);
    window.addEventListener('touchend', end, options);
    window.addEventListener('touchcancel', touchCancel, options);
    window.addEventListener('blur', cancel);
    return () => {
      cancel();
      element.removeEventListener('touchstart', start, true);
      window.removeEventListener('touchmove', move, true);
      window.removeEventListener('touchend', end, true);
      window.removeEventListener('touchcancel', touchCancel, true);
      window.removeEventListener('blur', cancel);
    };
  }, [containerRef, stageRef, ready, roomId, minScale, maxScale]);
}
