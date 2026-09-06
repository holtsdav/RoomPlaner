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

/** Keep the complete measured toolbar inside its canvas, even for off-screen objects. */
export function FloatingToolbarFrame({
  style,
  children,
  compactTitle,
  compactSummary,
  ...props
}: ComponentProps<'div'> & { compactTitle: string; compactSummary: string }) {
  const touchInput = useTouchInput();
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const [canvasHeight, setCanvasHeight] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    const parent = element?.parentElement;
    if (!element || !parent) return;
    const observer = new ResizeObserver(() => {
      setHeight(element.getBoundingClientRect().height);
      setCanvasHeight(parent.clientHeight);
    });
    observer.observe(element);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [touchInput]);
  const reserved = Math.min(72, canvasHeight / 4);
  const bottomReserved = Math.min(128, canvasHeight / 3);
  const available = Math.max(32, canvasHeight - reserved - bottomReserved);
  const top = canvasHeight
    ? Math.max(
        Math.min(height, available) + reserved,
        Math.min(Number(style?.top) || 0, canvasHeight - bottomReserved),
      )
    : style?.top;
  if (touchInput)
    return (
      <Sheet>
        <div className="planner-object-compact absolute bottom-20 left-2 right-2 z-20 mx-auto flex max-w-md items-center gap-3 rounded-xl bg-white p-2 shadow-[0_6px_24px_rgb(15_35_60/0.16)]">
          <div className="min-w-0 flex-1 pl-1">
            <p className="truncate text-sm font-semibold text-slate-800">
              {compactTitle}
            </p>
            <p className="truncate text-xs text-slate-600">{compactSummary}</p>
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
    );
  return (
    <div
      {...props}
      ref={ref}
      style={{
        ...style,
        top,
        maxHeight: canvasHeight ? available : undefined,
        overflowY: 'auto',
      }}
    >
      {children}
    </div>
  );
}
