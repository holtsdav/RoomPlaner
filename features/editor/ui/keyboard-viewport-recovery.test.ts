import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  createKeyboardViewportRecovery,
  type KeyboardViewport,
} from './keyboard-viewport-recovery';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
function setup() {
  const viewport: KeyboardViewport = {
    width: 390,
    height: 800,
    scale: 1,
    x: 0,
    y: 0,
    editing: true,
  };
  const restore = vi.fn();
  const recovery = createKeyboardViewportRecovery({
    read: () => ({ ...viewport }),
    restore,
  });
  recovery.focus();
  return { viewport, restore, recovery };
}

it('restores after keyboard dismissal even when the input remains focused', () => {
  const s = setup();
  s.viewport.height = 450;
  s.viewport.y = 320;
  s.recovery.change();
  vi.advanceTimersByTime(1000);
  expect(s.restore).not.toHaveBeenCalled();
  s.viewport.height = 800;
  s.recovery.change();
  vi.advanceTimersByTime(150);
  expect(s.restore).toHaveBeenLastCalledWith(0, 0);
});

it('retries after late Safari offsets but stops responding after recovery', () => {
  const s = setup();
  s.viewport.height = 450;
  s.recovery.change();
  s.viewport.height = 800;
  s.recovery.change();
  s.restore.mockImplementation(() => s.recovery.change());
  vi.advanceTimersByTime(2000);
  expect(s.restore).toHaveBeenCalledTimes(3);
  s.recovery.change();
  vi.advanceTimersByTime(2000);
  expect(s.restore).toHaveBeenCalledTimes(3);
});

it('waits for dismissal and keeps the original position across input switches', () => {
  const s = setup();
  s.viewport.height = 450;
  s.viewport.y = 300;
  s.recovery.change();
  s.viewport.editing = false;
  s.recovery.blur();
  s.viewport.editing = true;
  s.recovery.focus();
  s.recovery.change();
  vi.advanceTimersByTime(1000);
  expect(s.restore).not.toHaveBeenCalled();
  s.viewport.height = 800;
  s.recovery.change();
  vi.advanceTimersByTime(800);
  expect(s.restore).toHaveBeenLastCalledWith(0, 0);
});

it('recovers on blur when WebKit never reports the restored viewport height', () => {
  const s = setup();
  s.viewport.y = 300;
  s.viewport.height = 450;
  s.recovery.change();
  s.viewport.editing = false;
  s.recovery.blur();
  vi.advanceTimersByTime(150);
  expect(s.restore).not.toHaveBeenCalled();
  vi.advanceTimersByTime(250);
  expect(s.restore).toHaveBeenLastCalledWith(0, 0);
});

it.each([
  { scale: 2, height: 400 },
  { width: 800, height: 390 },
])('does not reset browser zoom or rotation: %j', (change) => {
  const s = setup();
  Object.assign(s.viewport, change, { editing: false });
  s.recovery.change();
  s.recovery.blur();
  vi.advanceTimersByTime(1000);
  expect(s.restore).not.toHaveBeenCalled();
});

it('ignores browser chrome resizing and hardware keyboard focus', () => {
  const s = setup();
  s.viewport.height = 740;
  s.recovery.change();
  vi.advanceTimersByTime(1000);
  expect(s.restore).not.toHaveBeenCalled();
});

it('cleans up pending restoration when the workspace unmounts', () => {
  const s = setup();
  s.viewport.editing = false;
  s.recovery.blur();
  s.recovery.dispose();
  vi.advanceTimersByTime(1000);
  expect(s.restore).not.toHaveBeenCalled();
});

it('can recover a second keyboard session', () => {
  const s = setup();
  for (let i = 0; i < 2; i++) {
    s.recovery.focus();
    s.viewport.height = 450;
    s.recovery.change();
    s.viewport.height = 800;
    s.recovery.change();
    vi.advanceTimersByTime(1000);
  }
  expect(s.restore).toHaveBeenCalledTimes(6);
});
