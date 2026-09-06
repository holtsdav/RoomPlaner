'use client';

import { ArrowDown, ArrowUp, BringToFront, SendToBack } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { objectsOverlap } from '../domain/selection';
import { usePlannerStore } from '../state/planner-store';
import { ToolbarTooltip } from './toolbar-tooltip';

export function PositionMenu() {
  const objects = usePlannerStore((state) => state.document.objects);
  const selectedIds = usePlannerStore((state) => state.selectedIds);
  const positionSelection = usePlannerStore((state) => state.positionSelection);
  const selectedIdSet = new Set(selectedIds);
  const selectedObjects = objects.filter((object) =>
    selectedIdSet.has(object.id),
  );
  const selectedIndices = selectedObjects.map((object) =>
    objects.indexOf(object),
  );
  const overlappingIndices = objects
    .map((object, index) => ({ object, index }))
    .filter(
      ({ object }) =>
        !selectedIdSet.has(object.id) &&
        selectedObjects.some((selectedObject) =>
          objectsOverlap(selectedObject, object),
        ),
    )
    .map(({ index }) => index);

  const backmostSelectedIndex = Math.min(...selectedIndices);
  const frontmostSelectedIndex = Math.max(...selectedIndices);
  const backmostOverlapIndex = Math.min(...overlappingIndices);
  const frontmostOverlapIndex = Math.max(...overlappingIndices);
  const hasOverlap = overlappingIndices.length > 0;
  const canMoveForward = overlappingIndices.some(
    (index) => index > frontmostSelectedIndex,
  );
  const canMoveBackward = overlappingIndices.some(
    (index) => index < backmostSelectedIndex,
  );

  return (
    <ToolbarTooltip
      label="Position"
      description={hasOverlap ? undefined : 'Overlap another object to enable'}
      disabled={!hasOverlap}
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Position overlapping objects"
              disabled={!hasOverlap}
            />
          }
        >
          <BringToFront aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 p-1.5">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Overlapping objects</DropdownMenuLabel>
            <DropdownMenuItem
              className="min-h-9 px-2"
              disabled={backmostSelectedIndex > frontmostOverlapIndex}
              onClick={() => positionSelection('bring-to-front')}
            >
              <BringToFront aria-hidden="true" />
              Bring to front
              <DropdownMenuShortcut>⇧⌘]</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="min-h-9 px-2"
              disabled={!canMoveForward}
              onClick={() => positionSelection('bring-forward')}
            >
              <ArrowUp aria-hidden="true" />
              Bring forward
              <DropdownMenuShortcut>⌘]</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="min-h-9 px-2"
              disabled={!canMoveBackward}
              onClick={() => positionSelection('send-backward')}
            >
              <ArrowDown aria-hidden="true" />
              Send backward
              <DropdownMenuShortcut>⌘[</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="min-h-9 px-2"
              disabled={frontmostSelectedIndex < backmostOverlapIndex}
              onClick={() => positionSelection('send-to-back')}
            >
              <SendToBack aria-hidden="true" />
              Send to back
              <DropdownMenuShortcut>⇧⌘[</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </ToolbarTooltip>
  );
}
