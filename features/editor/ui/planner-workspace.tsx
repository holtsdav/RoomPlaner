'use client';

import {
  Armchair,
  Check,
  Copy,
  HardDrive,
  House,
  Laptop,
  LoaderCircle,
  Redo2,
  Ruler,
  Search,
  TableProperties,
  Trash2,
  TriangleAlert,
  Undo2,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { starterCatalog } from '../domain/catalog';
import { formatMillimetres } from '../domain/plan-document';
import { usePlannerStore } from '../state/planner-store';
import { PlannerCanvas } from './planner-canvas';
import { PropertiesPanel } from './properties-panel';
import { RoomSettingsDialog } from './room-settings-dialog';
import { useLocalPlan } from './use-local-plan';

const categoryIcon = {
  seating: Armchair,
  table: TableProperties,
  device: Laptop,
  custom: Ruler,
};

const saveCopy = {
  loading: { label: 'Opening local plan', icon: LoaderCircle },
  saving: { label: 'Saving locally', icon: LoaderCircle },
  saved: { label: 'Saved on this device', icon: Check },
  error: { label: 'Local save unavailable', icon: TriangleAlert },
};

export function PlannerWorkspace() {
  useLocalPlan();
  const [query, setQuery] = useState('');
  const document = usePlannerStore((state) => state.document);
  const selectedIds = usePlannerStore((state) => state.selectedIds);
  const past = usePlannerStore((state) => state.past);
  const future = usePlannerStore((state) => state.future);
  const saveStatus = usePlannerStore((state) => state.saveStatus);
  const addPreset = usePlannerStore((state) => state.addPreset);
  const selectObject = usePlannerStore((state) => state.selectObject);
  const duplicateSelection = usePlannerStore(
    (state) => state.duplicateSelection,
  );
  const deleteSelection = usePlannerStore((state) => state.deleteSelection);
  const undo = usePlannerStore((state) => state.undo);
  const redo = usePlannerStore((state) => state.redo);
  const save = saveCopy[saveStatus];
  const SaveIcon = save.icon;
  const filteredCatalog = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return starterCatalog;
    return starterCatalog.filter((item) =>
      item.name.toLowerCase().includes(normalizedQuery),
    );
  }, [query]);

  return (
    <main className="flex h-dvh min-h-[560px] flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-3 sm:px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Ruler className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">
              {document.name}
            </p>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              {document.room.name} · millimetres
            </p>
          </div>
          <Badge variant="secondary" className="hidden gap-1.5 md:inline-flex">
            <HardDrive className="size-3" aria-hidden="true" />
            Local only
          </Badge>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          <output
            className="mr-1 hidden items-center gap-1.5 text-xs text-muted-foreground lg:flex"
            aria-live="polite"
          >
            <SaveIcon
              className={`size-3.5 ${saveStatus === 'saving' || saveStatus === 'loading' ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            {save.label}
          </output>
          <RoomSettingsDialog />
          <Button
            render={<Link href="/" />}
            variant="ghost"
            size="icon"
            aria-label="Home"
          >
            <House aria-hidden="true" />
          </Button>
          <Separator orientation="vertical" className="mx-0.5 h-6" />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Undo"
            disabled={past.length === 0}
            onClick={undo}
          >
            <Undo2 aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Redo"
            disabled={future.length === 0}
            onClick={redo}
          >
            <Redo2 aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:inline-flex"
            aria-label="Duplicate selection"
            disabled={selectedIds.length === 0}
            onClick={duplicateSelection}
          >
            <Copy aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:inline-flex"
            aria-label="Delete selection"
            disabled={selectedIds.length === 0}
            onClick={deleteSelection}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_288px]">
        <aside className="hidden min-h-0 overflow-y-auto border-r bg-sidebar p-4 lg:block">
          <div>
            <p className="text-sm font-semibold">Object library</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Generic footprints
            </p>
          </div>

          <div className="relative my-4">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search object library"
              placeholder="Search objects"
              className="h-9 pl-8 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            {filteredCatalog.map((preset) => {
              const Icon = categoryIcon[preset.category];
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => addPreset(preset)}
                  className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors hover:border-sidebar-border hover:bg-sidebar-accent focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-background text-primary shadow-sm ring-1 ring-border">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {preset.name}
                    </span>
                    <span className="block text-xs tabular-nums text-muted-foreground">
                      {formatMillimetres(preset.widthMm)} ×{' '}
                      {formatMillimetres(preset.depthMm)}
                    </span>
                  </span>
                  <span className="text-lg leading-none text-muted-foreground transition-colors group-hover:text-primary">
                    +
                  </span>
                </button>
              );
            })}
          </div>

          <Separator className="my-5" />
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              On this plan
            </p>
            <span className="text-xs tabular-nums text-muted-foreground">
              {document.objects.length}
            </span>
          </div>
          <div className="space-y-1">
            {document.objects.map((object) => (
              <button
                key={object.id}
                type="button"
                aria-pressed={selectedIds.includes(object.id)}
                onClick={(event) => selectObject(object.id, event.shiftKey)}
                className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${
                  selectedIds.includes(object.id)
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'hover:bg-sidebar-accent'
                }`}
              >
                {object.name}
              </button>
            ))}
          </div>
        </aside>

        <PlannerCanvas />

        <aside className="hidden min-h-0 overflow-y-auto border-l bg-card p-5 lg:block">
          <PropertiesPanel />
        </aside>
      </div>
    </main>
  );
}
