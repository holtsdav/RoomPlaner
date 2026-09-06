'use client';

import { Palette, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { PlanObject } from '../domain/plan-document';
import { usePlannerStore } from '../state/planner-store';
import { colorChoices } from './object-colors';

export function ObjectColorMenu({ objects }: { objects: PlanObject[] }) {
  const setColor = usePlannerStore((state) => state.setSelectionColor);
  const editable = objects.filter((object) => !object.locked);
  const colors = new Set(editable.map((object) => object.color));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={editable.length === 0}
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Object color">
            <Palette aria-hidden="true" />
          </Button>
        }
      />
      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {colors.size > 1 ? 'Object color · Mixed' : 'Object color'}
          </DropdownMenuLabel>
          {[{ name: 'Default', value: undefined }, ...colorChoices].map(
            (choice) => (
              <DropdownMenuItem
                key={choice.name}
                onClick={() => setColor(choice.value)}
                className="min-h-11 gap-3"
              >
                <span
                  className="size-5 rounded-full border border-slate-400"
                  style={{ background: choice.value ?? '#e2e8f0' }}
                  aria-hidden="true"
                />
                <span className="flex-1">{choice.name}</span>
                {colors.size === 1 && colors.has(choice.value) && (
                  <Check className="size-4" aria-label="Current color" />
                )}
              </DropdownMenuItem>
            ),
          )}
          {editable.length < objects.length && (
            <DropdownMenuLabel>
              Locked objects keep their color
            </DropdownMenuLabel>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
