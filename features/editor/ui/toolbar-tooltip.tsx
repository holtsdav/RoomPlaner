'use client';

import type { ReactNode } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function ToolbarTooltip({
  label,
  shortcut,
  description,
  disabled = false,
  children,
}: {
  label: string;
  shortcut?: string;
  description?: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  const trigger = (
    <span className="inline-flex" data-disabled={disabled || undefined} />
  );

  return (
    <Tooltip>
      <TooltipTrigger render={trigger}>{children}</TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={7}
        className="flex-col items-start gap-0.5 px-2.5 py-2"
      >
        <span className="font-medium leading-4">{label}</span>
        {description && (
          <span className="max-w-48 text-[11px] leading-4 text-background/70">
            {description}
          </span>
        )}
        {shortcut && (
          <kbd className="font-mono text-[11px] leading-4 text-background/70">
            {shortcut}
          </kbd>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
