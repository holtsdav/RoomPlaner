import { describe, expect, it } from 'vitest';
import { scrubValue } from './number-scrub';

describe('scrubValue', () => {
  it('advances one tenth when dragging starts across a whole centimetre', () => {
    expect(scrubValue(0.9, 2, 0.1)).toBe(0.9);
    expect(scrubValue(0.9, 3, 0.1)).toBe(1);
    expect(scrubValue(0.9, 4, 0.1)).toBe(1);
    expect(scrubValue(0.9, 5, 0.1)).toBe(1.1);
    expect(scrubValue(1.9, 3, 0.1)).toBe(2);
  });

  it('steps down symmetrically and respects bounds', () => {
    expect(scrubValue(1, -3, 0.1)).toBe(0.9);
    expect(scrubValue(1, -5, 0.1)).toBe(0.8);
    expect(scrubValue(0.1, -3, 0.1, 0.1, 10)).toBe(0.1);
    expect(scrubValue(10, 3, 0.1, 0.1, 10)).toBe(10);
  });
});
