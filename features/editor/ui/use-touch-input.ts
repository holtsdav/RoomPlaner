'use client';

import { useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';

// Pointer events distinguish a finger from a mouse, including on hybrid devices.
// The media query only supplies the initial mode before the first interaction.
let lastPointer: boolean | null = null;
const listeners = new Set<() => void>();
function snapshot() {
  return lastPointer ?? window.matchMedia('(pointer: coarse)').matches;
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1)
    window.addEventListener('pointerdown', onPointer, true);
  const media = window.matchMedia('(pointer: coarse)');
  // Capability changes must not override the pointer the user actually used.
  media.addEventListener('change', listener);
  return () => {
    listeners.delete(listener);
    media.removeEventListener('change', listener);
    if (!listeners.size)
      window.removeEventListener('pointerdown', onPointer, true);
  };
}
function onPointer(event: PointerEvent) {
  const touch = event.pointerType === 'touch';
  if (lastPointer === touch) return;
  // Apply before Konva receives the following mouse/touch start event so the
  // very first gesture uses the correct draggable nodes.
  flushSync(() => {
    lastPointer = touch;
    listeners.forEach((listener) => listener());
  });
}
export function useTouchInput() {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
