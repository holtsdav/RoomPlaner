'use client';

import {
  useCallback,
  useId,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from 'react';
import { SCRUB_THRESHOLD_PX, scrubValue } from './number-scrub';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { usePlannerStore } from '../state/planner-store';

type ScrubbableNumberInputProps = Omit<
  ComponentProps<typeof Input>,
  | 'type'
  | 'value'
  | 'defaultValue'
  | 'onChange'
  | 'onBlur'
  | 'onKeyDown'
  | 'onPointerDown'
  | 'onPointerMove'
  | 'onPointerUp'
  | 'onPointerCancel'
> & {
  value: number;
  onValueChange: (value: number) => boolean | void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  containerClassName?: string;
  suffixClassName?: string;
  formatValue?: (value: number) => string;
};

type DragState = {
  pointerId: number;
  startX: number;
  startValue: number;
  lastValue: number;
  moved: boolean;
};

function defaultFormat(value: number) {
  return String(Math.round(value * 100) / 100);
}

function clamp(value: number, min?: number, max?: number) {
  return Math.min(max ?? Infinity, Math.max(min ?? -Infinity, value));
}

function parseDraft(value: string) {
  const normalized = value.trim().replace(',', '.');
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ScrubbableNumberInput({
  value,
  onValueChange,
  min,
  max,
  step = 1,
  suffix,
  className,
  containerClassName,
  suffixClassName,
  formatValue = defaultFormat,
  disabled,
  ...props
}: ScrubbableNumberInputProps) {
  const errorId = useId();
  const invalidRef = useRef(false);
  const originalValueRef = useRef<number | null>(null);
  const cancelBlurRef = useRef(false);
  const beginEdit = () => {
    if (originalValueRef.current !== null) return;
    originalValueRef.current = value;
    usePlannerStore.getState().beginEdit();
  };
  const commitEdit = () => {
    originalValueRef.current = null;
    usePlannerStore.getState().finishEdit();
  };
  const [draft, setDraft] = useState(() => formatValue(value));
  const [invalid, updateInvalid] = useState(false);
  const setInvalid = (next: boolean) => {
    invalidRef.current = next;
    updateInvalid(next);
  };
  const [scrubbing, setScrubbing] = useState(false);
  const focusedRef = useRef(false);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focusedRef.current && !dragRef.current && !invalidRef.current) {
      setDraft(formatValue(value));
      setInvalid(false);
    }
  }, [formatValue, value]);

  const apply = (nextValue: number) => {
    if (
      !Number.isFinite(nextValue) ||
      (min !== undefined && nextValue < min) ||
      (max !== undefined && nextValue > max)
    ) {
      setInvalid(true);
      return false;
    }

    beginEdit();
    const accepted = onValueChange(nextValue) !== false;
    setInvalid(!accepted);
    return accepted;
  };

  const finishDrag = useCallback(
    (pointerId?: number) => {
      const drag = dragRef.current;
      if (!drag || (pointerId !== undefined && drag.pointerId !== pointerId)) {
        return;
      }

      const input = inputRef.current;
      if (input?.hasPointerCapture(drag.pointerId)) {
        input.releasePointerCapture(drag.pointerId);
      }
      dragRef.current = null;
      setScrubbing(false);
      if (drag.moved) {
        suppressClickRef.current = true;
        focusedRef.current = false;
        input?.blur();
        originalValueRef.current = null;
        usePlannerStore.getState().finishEdit();
        setDraft(formatValue(drag.lastValue));
      }
    },
    [formatValue],
  );

  useEffect(() => {
    const handlePointerEnd = (event: PointerEvent) => {
      finishDrag(event.pointerId);
    };
    const handleWindowBlur = () => finishDrag();
    const handleVisibilityChange = () => {
      if (globalThis.document.visibilityState !== 'visible') finishDrag();
    };

    window.addEventListener('pointerup', handlePointerEnd, true);
    window.addEventListener('pointercancel', handlePointerEnd, true);
    window.addEventListener('blur', handleWindowBlur);
    globalThis.document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    );
    return () => {
      window.removeEventListener('pointerup', handlePointerEnd, true);
      window.removeEventListener('pointercancel', handlePointerEnd, true);
      window.removeEventListener('blur', handleWindowBlur);
      globalThis.document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      );
    };
  }, [finishDrag]);

  useEffect(
    () => () => {
      if (originalValueRef.current !== null)
        usePlannerStore.getState().finishEdit();
    },
    [],
  );

  return (
    <span className={cn('relative block', containerClassName)}>
      <Input
        ref={inputRef}
        {...props}
        type="text"
        inputMode="decimal"
        value={draft}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={
          [props['aria-describedby'], invalid ? errorId : null]
            .filter(Boolean)
            .join(' ') || undefined
        }
        title={props.title ?? 'Type a value or drag left and right to adjust'}
        className={cn(
          'cursor-ew-resize select-none tabular-nums',
          suffix && 'pr-10',
          scrubbing && 'cursor-ew-resize bg-accent/60 ring-3 ring-ring/30',
          className,
        )}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onChange={(event) => {
          const nextDraft = event.currentTarget.value;
          setDraft(nextDraft);
          const nextValue = parseDraft(nextDraft);
          if (nextValue === null) {
            setInvalid(true);
            return;
          }
          apply(nextValue);
        }}
        onBlur={() => {
          focusedRef.current = false;
          if (cancelBlurRef.current) {
            cancelBlurRef.current = false;
            return;
          }
          if (dragRef.current?.moved) return;
          const nextValue = parseDraft(draft);
          if (nextValue === null || !apply(nextValue)) {
            setInvalid(true);
            commitEdit();
            return;
          }
          setDraft(formatValue(nextValue));
          commitEdit();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            const original = originalValueRef.current ?? value;
            // Reset local relative controls before restoring the exact document snapshot.
            if (originalValueRef.current !== null) onValueChange(original);
            usePlannerStore.getState().cancelEdit();
            originalValueRef.current = null;
            cancelBlurRef.current = true;
            setDraft(formatValue(original));
            setInvalid(false);
            event.currentTarget.blur();
            return;
          }
          if (event.key === 'Enter') {
            event.currentTarget.blur();
            return;
          }
          if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
          event.preventDefault();
          const currentValue = parseDraft(draft) ?? value;
          const direction = event.key === 'ArrowUp' ? 1 : -1;
          const nextValue = clamp(currentValue + direction * step, min, max);
          if (apply(nextValue)) setDraft(formatValue(nextValue));
        }}
        onPointerDown={(event) => {
          if (disabled || event.button !== 0 || event.pointerType !== 'mouse')
            return;
          const startValue = parseDraft(draft) ?? value;
          dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startValue,
            lastValue: startValue,
            moved: false,
          };
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            // Some embedded browsers can reject capture during an interrupted
            // pointer sequence. Window-level end listeners still finish it.
          }
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          if ((event.buttons & 1) === 0) {
            finishDrag(event.pointerId);
            return;
          }
          const distance = event.clientX - drag.startX;
          if (!drag.moved && Math.abs(distance) < SCRUB_THRESHOLD_PX) return;

          beginEdit();
          drag.moved = true;
          focusedRef.current = false;
          setScrubbing(true);
          event.preventDefault();
          event.currentTarget.blur();

          const nextValue = scrubValue(
            drag.startValue,
            distance,
            step,
            min,
            max,
          );
          if (nextValue === drag.lastValue) return;
          if (apply(nextValue)) {
            drag.lastValue = nextValue;
            setDraft(formatValue(nextValue));
          }
        }}
        onPointerUp={(event) => finishDrag(event.pointerId)}
        onPointerCancel={(event) => finishDrag(event.pointerId)}
        onLostPointerCapture={(event) => finishDrag(event.pointerId)}
        onClick={(event) => {
          if (!suppressClickRef.current) return;
          suppressClickRef.current = false;
          event.preventDefault();
          event.currentTarget.blur();
        }}
      />
      {invalid && (
        <output id={errorId} className="mt-1 block text-xs text-destructive">
          Enter a valid number{min !== undefined ? `, at least ${min}` : ''}
          {max !== undefined ? `, at most ${max}` : ''}. The last valid value is
          kept. Escape restores it.
        </output>
      )}
      {suffix && (
        <span
          className={cn(
            'pointer-events-none absolute top-0 h-9 right-3 grid place-items-center text-xs text-muted-foreground',
            suffixClassName,
          )}
        >
          {suffix}
        </span>
      )}
    </span>
  );
}
