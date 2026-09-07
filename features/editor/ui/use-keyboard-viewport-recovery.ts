'use client';

import { useEffect } from 'react';
import { createKeyboardViewportRecovery } from './keyboard-viewport-recovery';

function isTextEntry(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement)
    return !target.readOnly && !target.disabled;
  return (
    target instanceof HTMLInputElement &&
    !target.readOnly &&
    !target.disabled &&
    ['text', 'number', 'search', 'email', 'tel', 'url', 'password'].includes(
      target.type,
    )
  );
}

export function useKeyboardViewportRecovery() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const recovery = createKeyboardViewportRecovery({
      read: () => ({
        height: viewport.height,
        width: viewport.width,
        scale: viewport.scale,
        x: window.scrollX,
        y: window.scrollY,
        editing: isTextEntry(document.activeElement),
      }),
      restore: (left, top) => {
        // Reset the document scroll, not the canvas camera or sheet scrollers.
        // An explicit scroll also asks WebKit to clear its stale visual offset
        // when scrollY has already returned to zero.
        window.scrollTo({ left, top, behavior: 'instant' });
      },
    });
    const focus = (event: FocusEvent | PointerEvent) => {
      if (isTextEntry(event.target)) recovery.focus();
    };
    const blur = (event: FocusEvent) => {
      if (isTextEntry(event.target)) recovery.blur();
    };
    document.addEventListener('pointerdown', focus, true);
    document.addEventListener('focusin', focus);
    document.addEventListener('focusout', blur);
    viewport.addEventListener('resize', recovery.change);
    viewport.addEventListener('scroll', recovery.change);
    window.addEventListener('resize', recovery.change);
    return () => {
      recovery.dispose();
      document.removeEventListener('pointerdown', focus, true);
      document.removeEventListener('focusin', focus);
      document.removeEventListener('focusout', blur);
      viewport.removeEventListener('resize', recovery.change);
      viewport.removeEventListener('scroll', recovery.change);
      window.removeEventListener('resize', recovery.change);
    };
  }, []);
}
