'use client';

import { LazyDetails } from './lazy-details';
import { BlueprintLibrary } from './blueprint-library';

import {
  Check,
  ChevronRight,
  LoaderCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Redo2,
  Ruler,
  Search,
  Trash2,
  TriangleAlert,
  Undo2,
} from 'lucide-react';
import {
  lazy,
  Suspense,
  memo,
  useCallback,
  useEffect,
  useId,
  useState,
} from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { libraryCategories, catalogSearchText } from '../domain/catalog';
import {
  formatMeasurement,
  type PlanDocument,
  type PlanObject,
} from '../domain/plan-document';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { usePlannerStore } from '../state/planner-store';
import { ObjectPreview } from './object-preview';
const PlannerCanvas = lazy(() =>
  import('./planner-canvas').then((module) => ({
    default: module.PlannerCanvas,
  })),
);
import {
  DEFAULT_SIDEBAR_SHORTCUT,
  isValidSidebarShortcut,
  PlannerSettingsDialog,
  sidebarShortcutMatches,
} from './planner-settings-dialog';
import { RoomActions } from './room-actions';
import { useLocalPlan } from './use-local-plan';
import { useKeyboardViewportRecovery } from './use-keyboard-viewport-recovery';

const saveCopy = {
  loading: { label: 'Opening local plan', icon: LoaderCircle },
  saving: { label: 'Saving locally', icon: LoaderCircle },
  saved: { label: 'Saved on this device', icon: Check },
  error: { label: 'Local save unavailable', icon: TriangleAlert },
};

const SIDEBAR_SHORTCUT_STORAGE_KEY = 'room-planner-sidebar-shortcut';

const PlacedObjectRow = memo(function PlacedObjectRow({
  object,
  selected,
  units,
  selectObject,
  onChoose,
}: {
  object: PlanObject;
  selected: boolean;
  units: PlanDocument['units'];
  selectObject: (id: string, extend: boolean) => void;
  onChoose?: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={(event) => {
        selectObject(object.id, event.shiftKey);
        onChoose?.();
        requestAnimationFrame(() =>
          globalThis.document
            .getElementById('planner-canvas')
            ?.focus({ preventScroll: true }),
        );
      }}
      className={`flex min-h-14 w-full items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 ${
        selected
          ? 'bg-[#dfeaff] text-[#144b99]'
          : 'text-slate-700 hover:bg-white'
      }`}
    >
      <span className="grid h-11 w-16 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-[#315474]">
        <ObjectPreview
          color={object.color}
          blueprint={object.blueprint}
          blueprintProfile={object.blueprintProfile}
          category={object.category}
          shape={object.shape}
          name={object.name}
          widthMm={object.widthMm}
          depthMm={object.depthMm}
          className="h-10 w-14"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium">
          {object.name}
        </span>
        <span
          className={`block font-mono text-[11px] font-medium leading-4 tabular-nums ${selected ? 'text-[#315f9e]' : 'text-slate-600'}`}
        >
          {formatMeasurement(object.widthMm, units)} ×{' '}
          {formatMeasurement(object.depthMm, units)}
        </span>
      </span>
    </button>
  );
});

function ObjectLibrary({
  query,
  setQuery,
  units,
  objects,
  selectedIds,
  selectObject,
  onChoose,
  onCollapse,
}: {
  query: string;
  setQuery: (query: string) => void;
  units: PlanDocument['units'];
  objects: PlanObject[];
  selectedIds: string[];
  selectObject: (id: string, extend: boolean) => void;
  onChoose?: () => void;
  onCollapse?: () => void;
}) {
  const categoryGroupName = useId();
  const normalizedQuery = query.trim().toLowerCase();
  const isSearching = normalizedQuery.length > 0;
  const addPreset = usePlannerStore((state) => state.addPreset);
  return (
    <div className="p-4">
      <div className="flex min-h-8 items-center justify-between gap-3 px-1">
        <h2 className="text-sm font-semibold tracking-[-0.01em] text-slate-900">
          Objects
        </h2>
        {onCollapse && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Collapse object library"
            title="Collapse object library"
            onClick={onCollapse}
          >
            <PanelLeftClose aria-hidden="true" />
          </Button>
        )}
      </div>

      <div className="relative my-4">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search object library"
          placeholder="Search library"
          className="h-11 rounded-[10px] border-slate-200 bg-white pl-9 text-sm shadow-none placeholder:text-slate-400 lg:h-10"
        />
      </div>

      <div className="mb-4">
        <h3 className="mb-2 px-1 text-xs font-semibold text-slate-700">
          Categories
        </h3>
        <div className="space-y-1">
          {libraryCategories
            .filter((category) =>
              [
                category.name,
                ...(category.presets ?? []).map(catalogSearchText),
              ].some((name) => name.toLowerCase().includes(normalizedQuery)),
            )
            .map((category) => (
              <LazyDetails
                key={`${category.id}:${normalizedQuery}`}
                name={isSearching ? undefined : categoryGroupName}
                open={isSearching}
                className="group/category"
              >
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-[10px] px-2 text-xs font-medium text-slate-700 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 [&::-webkit-details-marker]:hidden">
                  <ChevronRight
                    aria-hidden="true"
                    className="size-3.5 shrink-0 transition-transform group-open/category:rotate-90"
                  />
                  <span className="flex-1">{category.name}</span>
                </summary>
                <div className="pb-3 px-1">
                  {category.id !== 'basic-shapes' &&
                  !!category.presets?.length ? (
                    <BlueprintLibrary
                      catalog={category.presets ?? []}
                      categoryName={category.name}
                      query={normalizedQuery}
                      units={units}
                      onAdd={(preset) => {
                        addPreset(preset);
                        onChoose?.();
                        requestAnimationFrame(() =>
                          globalThis.document
                            .getElementById('planner-canvas')
                            ?.focus({ preventScroll: true }),
                        );
                      }}
                    />
                  ) : category.presets?.length ? (
                    <div className="grid grid-cols-2 gap-2">
                      {category.presets
                        .filter(
                          (preset) =>
                            category.name
                              .toLowerCase()
                              .includes(normalizedQuery) ||
                            preset.name.toLowerCase().includes(normalizedQuery),
                        )
                        .map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            aria-label={`Add ${preset.name}`}
                            onClick={() => {
                              addPreset(preset);
                              onChoose?.();
                              requestAnimationFrame(() =>
                                globalThis.document
                                  .getElementById('planner-canvas')
                                  ?.focus({ preventScroll: true }),
                              );
                            }}
                            className="group flex min-h-32 w-full flex-col overflow-hidden rounded-[10px] border border-slate-200 bg-white text-center transition-colors hover:border-[#b8cef0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                          >
                            <span className="grid h-[76px] w-full place-items-center border-b border-slate-100 bg-[#fafdff] px-2">
                              <ObjectPreview
                                {...preset}
                                className="h-16 w-full"
                              />
                            </span>
                            <span className="w-full px-2 py-2">
                              <span className="block text-xs font-semibold text-slate-800">
                                {preset.name}
                              </span>
                              <span className="mt-0.5 block whitespace-nowrap font-mono text-[10px] leading-4 tabular-nums text-slate-600">
                                {formatMeasurement(preset.widthMm, units)} ×{' '}
                                {formatMeasurement(preset.depthMm, units)}
                              </span>
                            </span>
                          </button>
                        ))}
                    </div>
                  ) : (
                    <p className="pl-6 text-xs leading-5 text-slate-500">
                      No objects in this category yet.
                    </p>
                  )}
                </div>
              </LazyDetails>
            ))}
          {!libraryCategories.some((category) =>
            [
              category.name,
              ...(category.presets ?? []).map(catalogSearchText),
            ].some((name) => name.toLowerCase().includes(normalizedQuery)),
          ) && (
            <p className="px-1 py-2 text-xs text-slate-500">
              No categories match “{query.trim()}”.
            </p>
          )}
        </div>
      </div>

      <Separator className="my-4 bg-slate-200" />
      <LazyDetails className="group/placed">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-[10px] px-2 text-xs font-semibold text-slate-700 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 [&::-webkit-details-marker]:hidden">
          <ChevronRight
            aria-hidden="true"
            className="size-3.5 shrink-0 transition-transform group-open/placed:rotate-90"
          />
          <span className="flex-1">Placed in room</span>
          <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-600">
            {objects.length}
          </span>
        </summary>
        <div className="mt-1 space-y-1">
          {objects.map((object) => (
            <PlacedObjectRow
              key={object.id}
              object={object}
              selected={selectedIds.includes(object.id)}
              units={units}
              selectObject={selectObject}
              onChoose={onChoose}
            />
          ))}
          {objects.length === 0 && (
            <p className="px-2 py-3 text-xs leading-5 text-slate-500">
              No objects placed in this room.
            </p>
          )}
        </div>
      </LazyDetails>
    </div>
  );
}

export function PlannerWorkspace() {
  const hydrated = usePlannerStore((state) => state.hydrated);
  const roomOperationPending = usePlannerStore(
    (state) => state.roomOperationPending,
  );
  useLocalPlan();
  useKeyboardViewportRecovery();
  const [query, setQuery] = useState('');
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [mobileLibraryOpen, setMobileLibraryOpen] = useState(false);
  const closeMobileLibrary = useCallback(() => setMobileLibraryOpen(false), []);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [sidebarShortcut, setSidebarShortcut] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_SIDEBAR_SHORTCUT;
    const storedShortcut = window.localStorage.getItem(
      SIDEBAR_SHORTCUT_STORAGE_KEY,
    );
    return storedShortcut && isValidSidebarShortcut(storedShortcut)
      ? storedShortcut
      : DEFAULT_SIDEBAR_SHORTCUT;
  });
  const document = usePlannerStore((state) => state.document);
  const selectedIds = usePlannerStore((state) => state.selectedIds);
  const past = usePlannerStore((state) => state.past);
  const future = usePlannerStore((state) => state.future);
  const saveStatus = usePlannerStore((state) => state.saveStatus);
  const selectObject = usePlannerStore((state) => state.selectObject);
  const clearCanvas = usePlannerStore((state) => state.clearCanvas);
  const undo = usePlannerStore((state) => state.undo);
  const redo = usePlannerStore((state) => state.redo);
  const save = saveCopy[saveStatus];
  const SaveIcon = save.icon;
  const toggleSidebar = useCallback(() => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      setLibraryOpen((open) => !open);
      globalThis.document.getElementById('planner-canvas')?.focus();
      return;
    }
    setMobileLibraryOpen((open) => !open);
  }, []);

  const updateSidebarShortcut = useCallback((shortcut: string) => {
    setSidebarShortcut(shortcut);
    window.localStorage.setItem(SIDEBAR_SHORTCUT_STORAGE_KEY, shortcut);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        !sidebarShortcutMatches(event, sidebarShortcut)
      ) {
        return;
      }

      event.preventDefault();
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest('[role="dialog"], [role="alertdialog"]')
      ) {
        return;
      }
      if (event.repeat) return;
      toggleSidebar();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarShortcut, toggleSidebar]);

  return (
    <main
      className="planner-workspace flex h-dvh flex-col overflow-hidden bg-background text-foreground"
      aria-busy={!hydrated || roomOperationPending}
    >
      <h1 className="sr-only sm:hidden">Room Planner</h1>
      <header
        inert={!hydrated || roomOperationPending}
        className="flex h-16 shrink-0 items-center border-b border-slate-200 bg-white"
      >
        <div className="flex h-full shrink-0 items-center gap-2.5 px-2 max-sm:hidden sm:px-4">
          <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-[#e6efff] text-primary">
            <Ruler className="size-4" aria-hidden="true" />
          </span>
          <h1 className="hidden truncate text-sm font-semibold tracking-[-0.01em] text-slate-900 sm:block">
            Room Planner
          </h1>
        </div>

        <div className="flex min-w-0 flex-1 items-center px-1 sm:px-3 lg:px-4">
          <div className="flex shrink-0 items-center gap-0.5">
            <PlannerSettingsDialog
              triggerClassName="text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              sidebarShortcut={sidebarShortcut}
              onSidebarShortcutChange={updateSidebarShortcut}
            />
          </div>
          <span
            className="mx-1.5 h-6 w-px shrink-0 bg-slate-200 sm:mx-2"
            aria-hidden="true"
          />
          <RoomActions />
        </div>

        <div className="flex shrink-0 items-center gap-1.5 pr-2 sm:pr-3 lg:pr-5">
          <output
            className="mr-1 hidden items-center gap-1.5 text-xs text-slate-500 xl:flex"
            aria-live="polite"
          >
            <SaveIcon
              className={`size-3.5 ${saveStatus === 'saving' || saveStatus === 'loading' ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            {save.label}
          </output>
          <Sheet open={mobileLibraryOpen} onOpenChange={setMobileLibraryOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 text-slate-600 hover:bg-slate-100 hover:text-slate-900 portrait:hidden lg:hidden"
                  aria-label="Open navigation and object library"
                />
              }
            >
              <PanelLeftOpen aria-hidden="true" />
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[min(88vw,340px)] gap-0 overflow-hidden bg-[#f6f8fb] p-0 sm:max-w-[340px] lg:hidden"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation and objects</SheetTitle>
                <SheetDescription>
                  Add objects, select placed items, or open planner navigation.
                </SheetDescription>
              </SheetHeader>
              <div className="min-h-0 flex-1 overflow-y-auto pt-10">
                <ObjectLibrary
                  query={query}
                  setQuery={setQuery}
                  units={document.units}
                  objects={document.objects}
                  selectedIds={selectedIds}
                  selectObject={selectObject}
                  onChoose={closeMobileLibrary}
                />
              </div>
            </SheetContent>
          </Sheet>
          <div className="ml-0.5 flex items-center rounded-[10px] border border-slate-200 bg-slate-50 p-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Undo"
              title="Undo"
              disabled={past.length === 0}
              onClick={undo}
            >
              <Undo2 aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Redo"
              title="Redo"
              disabled={future.length === 0}
              onClick={redo}
            >
              <Redo2 aria-hidden="true" />
            </Button>
          </div>
          <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
            <AlertDialogTrigger
              render={
                <Button
                  variant="destructive"
                  size="icon"
                  className="shrink-0"
                  title="Clear canvas"
                  aria-label="Clear canvas"
                />
              }
            >
              <Trash2 aria-hidden="true" />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear the entire canvas?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes every object and resets the room outline. You can
                  undo this action afterward.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => {
                    clearCanvas();
                    setClearDialogOpen(false);
                  }}
                >
                  Clear canvas
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      <output className="flex min-h-6 shrink-0 items-center gap-2 border-b px-3 text-xs text-slate-600 xl:hidden">
        <SaveIcon className="size-3" aria-hidden="true" />
        {save.label}
      </output>
      <div
        inert={!hydrated || roomOperationPending}
        className={`grid min-h-0 flex-1 grid-cols-1 transition-[grid-template-columns] duration-200 motion-reduce:transition-none ${
          libraryOpen
            ? 'lg:grid-cols-[288px_minmax(0,1fr)]'
            : 'lg:grid-cols-[0_minmax(0,1fr)]'
        }`}
      >
        <aside
          inert={!libraryOpen}
          className={`hidden min-h-0 overflow-y-auto bg-[#f6f8fb] transition-[padding,border] duration-200 lg:block ${
            libraryOpen
              ? 'border-r border-slate-200'
              : 'overflow-hidden border-r-0 p-0'
          }`}
          aria-label="Objects"
        >
          <ObjectLibrary
            query={query}
            setQuery={setQuery}
            units={document.units}
            objects={document.objects}
            selectedIds={selectedIds}
            selectObject={selectObject}
            onCollapse={() => {
              setLibraryOpen(false);
              globalThis.document.getElementById('planner-canvas')?.focus();
            }}
          />
        </aside>

        <Suspense
          fallback={
            <output className="grid min-h-0 place-items-center bg-[#eaf1f6] text-sm text-slate-600">
              Opening plan…
            </output>
          }
        >
          <PlannerCanvas
            sidebarOpen={libraryOpen}
            onToggleSidebar={toggleSidebar}
          />
        </Suspense>
      </div>
    </main>
  );
}
