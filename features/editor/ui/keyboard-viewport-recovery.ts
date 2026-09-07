export type KeyboardViewport = {
  height: number;
  width: number;
  scale: number;
  x: number;
  y: number;
  editing: boolean;
};

// Safari can dismiss the software keyboard without blurring the input, and
// can apply another scroll offset after its first viewport-resize event.
export function createKeyboardViewportRecovery(options: {
  read: () => KeyboardViewport;
  restore: (x: number, y: number) => void;
}) {
  let session: { before: KeyboardViewport; opened: boolean } | null = null;
  let blurred = false;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers.clear();
  };
  const recover = (allowBlurFallback: boolean) => {
    if (!session) return;
    const now = options.read();
    const { before, opened } = session;
    // Rotation and browser pinch zoom are not keyboard dismissal.
    if (
      Math.abs(now.width - before.width) > 40 ||
      Math.abs(now.scale - before.scale) > 0.01
    ) {
      session = null;
      return;
    }
    const fullHeight = now.height >= before.height - 80;
    if ((opened && fullHeight) || (allowBlurFallback && !now.editing)) {
      options.restore(before.x, before.y);
      return true;
    }
  };
  const schedule = () => {
    if (timers.size) return;
    // Wait until focus/click handling and the keyboard animation finish.
    // Recheck each time; switching fields must not hide the next input.
    for (const delay of [150, 400, 800]) {
      const timer = setTimeout(() => {
        timers.delete(timer);
        const restored = recover(blurred && delay >= 400);
        if (delay === 800 && restored) session = null;
      }, delay);
      timers.add(timer);
    }
  };
  return {
    focus() {
      clearTimers();
      blurred = false;
      const now = options.read();
      // Retain the original position when moving between fields (including
      // portalled dialogs/sheets) while the same keyboard is still open.
      if (!session) {
        session = { before: now, opened: false };
      }
    },
    change(this: void) {
      if (!session) return;
      const now = options.read();
      if (session.before.height - now.height > 100) session.opened = true;
      schedule();
    },
    blur() {
      blurred = true;
      schedule();
    },
    dispose() {
      clearTimers();
      session = null;
    },
  };
}
