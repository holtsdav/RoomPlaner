'use client';

import { useLayoutEffect, useRef, useState, type ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useTouchInput } from './use-touch-input';
import {
  placeSelectionToolbar,
  type ToolbarSelectionBounds,
} from './toolbar-placement';

/** Keep the complete measured toolbar inside its canvas, even for off-screen objects. */
export function FloatingToolbarFrame({
  style,
  children,
  selectionBounds,
  compactTitle,
  compactSummary,
  ...props
}: ComponentProps<'div'> & {
  selectionBounds: ToolbarSelectionBounds;
  compactTitle: string;
  compactSummary: string;
}) {
  const touchInput = useTouchInput();
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const [canvas, setCanvas] = useState({ width: 0, height: 0 });
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    const parent = element?.parentElement;
    if (!element || !parent) return;
    const observer = new ResizeObserver(() => {
      setHeight(element.getBoundingClientRect().height);
      setWidth(element.getBoundingClientRect().width);
      setCanvas({ width: parent.clientWidth, height: parent.clientHeight });
    });
    observer.observe(element);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [touchInput]);
  const available = Math.max(
    32,
    canvas.height -
      Math.min(72, canvas.height / 4) -
      Math.min(128, canvas.height / 3),
  );
  const position =
    canvas.width && height
      ? placeSelectionToolbar(selectionBounds, canvas, { width, height })
      : null;
  const compact = touchInput || !position;
  return (
    <>
      {!touchInput && (
        <div
          {...props}
          ref={ref}
          style={{
            ...style,
            left: position?.left ?? 8,
            top: position?.top ?? 72,
            maxHeight: canvas.height ? available : undefined,
            overflowY: 'auto',
            visibility: position ? 'visible' : 'hidden',
          }}
          inert={!position}
          aria-hidden={!position || undefined}
        >
          {children}
        </div>
      )}
      {compact && (
        <Sheet>
          <div className="planner-object-compact absolute bottom-20 left-2 right-2 z-20 mx-auto flex max-w-md items-center gap-3 rounded-xl bg-white p-2 shadow-[0_6px_24px_rgb(15_35_60/0.16)]">
            <div className="min-w-0 flex-1 pl-1">
              <p className="truncate text-sm font-semibold text-slate-800">
                {compactTitle}
              </p>
              <p className="truncate text-xs text-slate-600">
                {compactSummary}
              </p>
            </div>
            <SheetTrigger
              render={
                <Button
                  variant="secondary"
                  className="h-11 px-4"
                  aria-label="Edit selected objects"
                />
              }
            >
              Edit
            </SheetTrigger>
          </div>
          <SheetContent
            side="bottom"
            className="max-h-[85dvh] overflow-y-auto rounded-t-2xl gap-0 pb-[max(16px,env(safe-area-inset-bottom))]"
          >
            <SheetHeader className="pr-16">
              <SheetTitle>{compactTitle}</SheetTitle>
              <SheetDescription>{compactSummary}</SheetDescription>
            </SheetHeader>
            <div
              {...props}
              className="planner-object-toolbar planner-touch-editor px-4 pb-2"
            >
              {children}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
