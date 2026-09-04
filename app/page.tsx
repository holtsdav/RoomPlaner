import {
  Armchair,
  Box,
  ChevronDown,
  Cuboid,
  DoorOpen,
  Grid2X2,
  Headphones,
  Laptop,
  MousePointer2,
  Redo2,
  Ruler,
  Save,
  Search,
  Shapes,
  Undo2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const libraryGroups = [
  { label: 'Furniture', icon: Armchair, count: 0 },
  { label: 'Doors & windows', icon: DoorOpen, count: 0 },
  { label: 'Audio', icon: Headphones, count: 0 },
  { label: 'Devices', icon: Laptop, count: 0 },
  { label: '3D printers', icon: Box, count: 0 },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Ruler className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">
              Room Planner
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Untitled room · millimetres
            </p>
          </div>
          <Badge variant="secondary" className="hidden sm:inline-flex">
            Foundation
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" aria-label="Undo" disabled>
            <Undo2 aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Redo" disabled>
            <Redo2 aria-hidden="true" />
          </Button>
          <Separator orientation="vertical" className="mx-1 h-6" />
          <Button variant="outline" size="sm" disabled>
            <Save aria-hidden="true" />
            <span className="hidden sm:inline">Save</span>
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_280px]">
        <aside className="hidden border-r bg-sidebar p-4 lg:block">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Object library</p>
              <p className="text-xs text-muted-foreground">
                Catalog coming next
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Search library"
              disabled
            >
              <Search aria-hidden="true" />
            </Button>
          </div>

          <nav aria-label="Object categories" className="space-y-1">
            {libraryGroups.map(({ label, icon: Icon, count }) => (
              <button
                key={label}
                type="button"
                disabled
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-sidebar-foreground opacity-70"
              >
                <Icon className="size-4" aria-hidden="true" />
                <span className="flex-1">{label}</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {count}
                </span>
              </button>
            ))}
          </nav>
        </aside>

        <section
          className="bg-canvas relative min-h-[620px] overflow-hidden"
          aria-label="Planning canvas preview"
        >
          <div className="absolute left-4 top-4 z-10 flex items-center gap-1 rounded-xl border bg-card/95 p-1 shadow-sm backdrop-blur lg:left-6 lg:top-6">
            <Button
              variant="secondary"
              size="icon-sm"
              aria-label="Select tool"
              disabled
            >
              <MousePointer2 aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Draw room"
              disabled
            >
              <Shapes aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Add dimensions"
              disabled
            >
              <Ruler aria-hidden="true" />
            </Button>
          </div>

          <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-xl border bg-card/95 px-3 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur lg:right-6 lg:top-6">
            <Grid2X2 className="size-3.5" aria-hidden="true" />
            100% · 100 mm grid
          </div>

          <div className="absolute inset-0 grid place-items-center p-16 sm:p-24">
            <div className="relative aspect-[4/3] w-full max-w-3xl border-[3px] border-foreground/80 bg-background/65 shadow-[0_18px_60px_rgb(10_31_68/10%)]">
              <div className="bg-canvas absolute -top-8 left-1/2 -translate-x-1/2 px-2 text-xs font-medium tabular-nums text-muted-foreground">
                4,800 mm
              </div>
              <div className="bg-canvas absolute -left-16 top-1/2 -translate-y-1/2 -rotate-90 px-2 text-xs font-medium tabular-nums text-muted-foreground">
                3,600 mm
              </div>
              <div className="absolute left-[12%] top-[18%] h-[22%] w-[42%] rounded-sm border-2 border-primary/70 bg-primary/10">
                <span className="absolute inset-0 grid place-items-center text-xs font-medium text-primary/80">
                  Sofa footprint
                </span>
              </div>
              <div className="absolute bottom-[16%] right-[15%] aspect-square w-[20%] rounded-full border-2 border-dashed border-accent-foreground/50 bg-accent/70" />
              <div className="absolute bottom-[-3px] left-[24%] h-[3px] w-[20%] bg-background" />
              <div className="absolute bottom-0 left-[24%] h-[22%] w-[20%] origin-bottom-left rounded-tr-full border-r-2 border-t-2 border-dashed border-foreground/45" />
            </div>
          </div>

          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border bg-card/95 px-4 py-2 text-center text-xs text-muted-foreground shadow-sm backdrop-blur">
            The workspace shell is ready. Editor interactions are the next
            product slice.
          </div>
        </section>

        <aside className="hidden border-l bg-card p-5 lg:block">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Properties</p>
              <p className="text-xs text-muted-foreground">Nothing selected</p>
            </div>
            <ChevronDown
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
          <Separator className="my-5" />
          <div className="grid min-h-52 place-items-center rounded-xl border border-dashed bg-muted/30 px-6 text-center">
            <div>
              <Cuboid
                className="mx-auto mb-3 size-7 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="text-sm font-medium">Select an object</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Position, dimensions, rotation and clearance will appear here.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
