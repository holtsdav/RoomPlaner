'use client';

import {
  Check,
  ChevronDown,
  Download,
  FileImage,
  FileJson,
  FilePenLine,
  LoaderCircle,
  Plus,
  Ruler,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type PlanDocument } from '../domain/plan-document';
import {
  parseRoomFile,
  MAX_IMPORT_BYTES,
  MAX_IMPORT_ROOMS,
  roomFileName,
  roomImageFileName,
  serializeRoom,
} from '../domain/room-files';
import {
  deleteAndActivateLocalPlan,
  activateLocalPlan,
  listLocalPlans,
  saveImportedPlans,
  saveLocalPlan,
} from '../persistence/local-plan-repository';
import { usePlannerStore } from '../state/planner-store';
import { flushLocalPlan, runRoomOperation } from './use-local-plan';
import { createRoomPng } from './room-image-export';
import { RoomSettingsDialog } from './room-settings-dialog';

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = globalThis.document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadRoomJson(document: PlanDocument) {
  downloadBlob(
    new Blob([serializeRoom(document)], { type: 'application/json' }),
    roomFileName(document.room.name),
  );
}

export function RoomActions() {
  const document = usePlannerStore((state) => state.document);
  const saveError = usePlannerStore((state) => state.saveError);
  const saveStatus = usePlannerStore((state) => state.saveStatus);
  const setSaveStatus = usePlannerStore((state) => state.setSaveStatus);
  const createNewRoom = usePlannerStore((state) => state.createNewRoom);
  const renameRoom = usePlannerStore((state) => state.renameRoom);
  const openRoom = usePlannerStore((state) => state.openRoom);
  const [rooms, setRooms] = useState<PlanDocument[]>([]);
  const [newRoomOpen, setNewRoomOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [dimensionsOpen, setDimensionsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [exportDimensions, setExportDimensions] = useState(true);
  const [exportGrid, setExportGrid] = useState(true);
  const [exportingPng, setExportingPng] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newRoomName, setNewRoomName] = useState('Untitled room');
  const [renameDraft, setRenameDraft] = useState(document.room.name);
  const [notice, setNotice] = useState<{ text: string } | null>(null);
  const message = notice?.text ?? null;
  const setMessage = useCallback((text: string | null) => {
    setNotice(text === null ? null : { text });
  }, []);
  const saveRecoveryOpen = usePlannerStore((state) => state.saveRecoveryOpen);
  const errorNoticeVisible = saveStatus === 'error' && saveRecoveryOpen;
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!notice) return;

    const timeout = window.setTimeout(
      () => setNotice(null),
      saveStatus === 'error' ? 8000 : 5000,
    );
    return () => window.clearTimeout(timeout);
  }, [notice, saveStatus]);

  const refreshRooms = useCallback(async () => {
    try {
      setRooms(await listLocalPlans());
    } catch {
      setMessage('Saved rooms could not be loaded.');
    }
  }, [setMessage]);

  const saveNow = async () => {
    setSaveStatus('saving');
    try {
      await flushLocalPlan();
      setMessage('Room saved on this device.');
      await refreshRooms();
    } catch {
      setSaveStatus('error');
      setMessage('The room could not be saved. Try exporting a copy.');
    }
  };

  const switchRoom = async (room: PlanDocument) => {
    if (room.id === document.id) return;
    setSaveStatus('saving');
    try {
      await runRoomOperation(async () => {
        openRoom(await activateLocalPlan(room.id));
      });
    } catch {
      setSaveStatus('error');
      setMessage('The current room could not be saved, so it stayed open.');
    }
  };

  const createRoom = async () => {
    setSaveStatus('saving');
    try {
      await runRoomOperation(async () => {
        createNewRoom(newRoomName);
        await saveLocalPlan(usePlannerStore.getState().document);
        setSaveStatus('saved');
        setNewRoomOpen(false);
      });
    } catch {
      setSaveStatus('error');
      setMessage('The current room could not be saved. Try exporting a copy.');
    }
  };

  const exportPng = async () => {
    setExportingPng(true);
    try {
      downloadBlob(
        await createRoomPng(document, {
          dimensions: exportDimensions,
          grid: exportGrid,
        }),
        roomImageFileName(document.room.name),
      );
      setExportOpen(false);
      setMessage('PNG image exported.');
    } catch {
      setMessage('The PNG image could not be created. Try exporting JSON.');
    } finally {
      setExportingPng(false);
    }
  };

  const deleteRoom = async () => {
    setDeleting(true);
    const deletedRoomName = document.room.name;
    try {
      await runRoomOperation(async () => {
        // Prepare the replacement before deleting. A failed read/write leaves the current room intact.
        const remainingRooms = (await listLocalPlans()).filter(
          (room) => room.id !== document.id,
        );
        const nextRoom = remainingRooms[0]
          ? remainingRooms[0]
          : (
              await saveImportedPlans(
                [
                  {
                    ...document,
                    objects: [],
                    groups: [],
                    name: 'New room',
                    room: { ...document.room, name: 'New room' },
                  },
                ],
                '',
              )
            )[0];
        openRoom(await deleteAndActivateLocalPlan(document.id, nextRoom.id));
        setSaveStatus('saved');
        setDeleteOpen(false);
      });
      setMessage(`${deletedRoomName} was permanently deleted.`);
      await refreshRooms();
    } catch {
      setSaveStatus('error');
      setMessage('The room could not be deleted from this device.');
    } finally {
      setDeleting(false);
    }
  };

  const importRooms = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const selectedFiles = Array.from(files);
      if (
        selectedFiles.length > MAX_IMPORT_ROOMS ||
        selectedFiles.reduce((size, file) => size + file.size, 0) >
          MAX_IMPORT_BYTES
      )
        throw new Error('Import up to 20 rooms and 5 MB at a time.');
      const imported: PlanDocument[] = [];
      for (const file of selectedFiles) {
        imported.push(...parseRoomFile(await file.text()));
        if (imported.length > MAX_IMPORT_ROOMS)
          throw new Error('Import up to 20 rooms at a time.');
      }
      const uniqueRooms = Array.from(
        new Map(
          imported.map((room) => {
            return [room.id, room] as const;
          }),
        ).values(),
      );
      await runRoomOperation(async () => {
        const copies = await saveImportedPlans(uniqueRooms);
        openRoom(await activateLocalPlan(copies[0].id));
      });
      setMessage(
        `${uniqueRooms.length} ${uniqueRooms.length === 1 ? 'room' : 'rooms'} imported.`,
      );
      await refreshRooms();
    } catch {
      setMessage(
        'Import failed. Limits: 5 MB total, 20 rooms, 500 objects and 256 corners per room. Names are limited to 120 characters. Choose a Room Planner JSON file with a valid room outline and unique objects, and check that local storage is available.',
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <DropdownMenu
          onOpenChange={(open) => {
            if (open) {
              setMessage(null);
              void refreshRooms();
            }
          }}
        >
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="h-11 min-w-0 shrink gap-1 px-2 text-left hover:bg-muted lg:h-9 sm:px-3"
                aria-label={`Room menu for ${document.room.name}`}
              />
            }
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold tracking-[-0.01em] text-slate-900">
                {document.room.name}
              </span>
              <span className="hidden text-[11px] font-normal text-slate-500 sm:block">
                Room actions
              </span>
            </span>
            <ChevronDown
              className="size-3.5 text-slate-400"
              aria-hidden="true"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 p-1.5">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Rooms on this device</DropdownMenuLabel>
              {rooms.map((room) => (
                <DropdownMenuItem
                  key={room.id}
                  className="min-h-11 px-2 lg:min-h-9"
                  onClick={() => void switchRoom(room)}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {room.room.name}
                  </span>
                  {room.id === document.id && (
                    <Check className="size-4 text-primary" aria-hidden="true" />
                  )}
                </DropdownMenuItem>
              ))}
              {rooms.length === 0 && (
                <DropdownMenuItem disabled>No saved rooms yet</DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="min-h-11 px-2 lg:min-h-9"
              onClick={() => {
                setRenameDraft(document.room.name);
                setRenameOpen(true);
              }}
            >
              <FilePenLine aria-hidden="true" />
              Rename room
            </DropdownMenuItem>
            <DropdownMenuItem
              className="min-h-11 px-2 lg:min-h-9"
              onClick={() => setDimensionsOpen(true)}
            >
              <Ruler aria-hidden="true" />
              Edit dimensions
            </DropdownMenuItem>
            <DropdownMenuItem
              className="min-h-11 px-2 lg:min-h-9"
              onClick={saveNow}
            >
              <Save aria-hidden="true" />
              Save room
            </DropdownMenuItem>
            <DropdownMenuItem
              className="min-h-11 px-2 lg:min-h-9"
              onClick={() => setExportOpen(true)}
            >
              <Download aria-hidden="true" />
              Export room
            </DropdownMenuItem>
            <DropdownMenuItem
              className="min-h-11 px-2 lg:min-h-9"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload aria-hidden="true" />
              Import rooms as copies
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="min-h-11 px-2 lg:min-h-9"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 aria-hidden="true" />
              Delete room
            </DropdownMenuItem>
            {message && (
              <output className="px-2 py-1.5 text-xs leading-4 text-slate-500">
                {message}
              </output>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog
          open={newRoomOpen}
          onOpenChange={(open) => {
            if (open) setNewRoomName('Untitled room');
            setNewRoomOpen(open);
          }}
        >
          <DialogTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                className="size-11 lg:size-8"
                aria-label="Create new room"
                title="Create new room"
              />
            }
          >
            <Plus aria-hidden="true" />
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a new room</DialogTitle>
              <DialogDescription>
                Your current room stays saved locally. The new room starts with
                an empty room measuring 4.68 × 3.48 metres inside the walls.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5 py-1">
              <Label htmlFor="new-room-name">Room name</Label>
              <Input
                id="new-room-name"
                maxLength={120}
                value={newRoomName}
                onChange={(event) => setNewRoomName(event.target.value)}
              />
            </div>
            <DialogFooter showCloseButton>
              <Button
                disabled={!newRoomName.trim()}
                onClick={() => void createRoom()}
              >
                <Plus aria-hidden="true" />
                Create room
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename room</DialogTitle>
            <DialogDescription>
              Use a name that makes this room easy to recognize when switching.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-1">
            <Label htmlFor="rename-room">Room name</Label>
            <Input
              id="rename-room"
              maxLength={120}
              value={renameDraft}
              onChange={(event) => setRenameDraft(event.target.value)}
            />
          </div>
          <DialogFooter showCloseButton>
            <Button
              disabled={!renameDraft.trim()}
              onClick={() => {
                renameRoom(renameDraft);
                setRenameOpen(false);
              }}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RoomSettingsDialog
        open={dimensionsOpen}
        onOpenChange={setDimensionsOpen}
        showTrigger={false}
      />

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export room</DialogTitle>
            <DialogDescription>
              Choose an image to share or JSON to keep an editable backup.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={exportDimensions}
                onChange={(event) => setExportDimensions(event.target.checked)}
              />
              Wall dimensions
            </label>
            <label className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={exportGrid}
                onChange={(event) => setExportGrid(event.target.checked)}
              />
              Grid
            </label>
          </div>
          <div className="grid gap-2">
            <Button
              variant="outline"
              className="h-auto min-h-16 justify-start gap-3 px-3 py-2.5 text-left"
              disabled={exportingPng}
              onClick={() => void exportPng()}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-[9px] bg-[#e6efff] text-primary">
                {exportingPng ? (
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                ) : (
                  <FileImage aria-hidden="true" />
                )}
              </span>
              <span>
                <span className="block text-sm font-medium">
                  {exportingPng ? 'Preparing PNG…' : 'PNG image'}
                </span>
                <span className="block text-xs font-normal text-muted-foreground">
                  Plan image with scale legend
                </span>
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto min-h-16 justify-start gap-3 px-3 py-2.5 text-left"
              disabled={exportingPng}
              onClick={() => {
                downloadRoomJson(document);
                setExportOpen(false);
                setMessage('JSON backup exported.');
              }}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-[9px] bg-slate-100 text-slate-600">
                <FileJson aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-medium">JSON data</span>
                <span className="block text-xs font-normal text-muted-foreground">
                  Editable backup for Room Planner
                </span>
              </span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{document.room.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the room and everything in it from this
              device. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={() => void deleteRoom()}
            >
              {deleting ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 aria-hidden="true" />
              )}
              {deleting ? 'Deleting…' : 'Delete room'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        multiple
        className="hidden"
        aria-label="Import room files"
        onChange={(event) => void importRooms(event.currentTarget.files)}
      />

      {(message || errorNoticeVisible) && (
        <output className="fixed max-h-[calc(100dvh-6rem)] overflow-y-auto inset-x-3 bottom-3 z-50 mx-auto flex max-w-xl flex-wrap items-center gap-2 rounded-lg border bg-background p-3 text-sm shadow-lg">
          <p className="min-w-0 flex-1">
            {saveStatus === 'error'
              ? (saveError ??
                'Changes are not saved on this device. Retry or export a backup before leaving.')
              : message}
          </p>
          {saveStatus === 'error' && (
            <>
              <Button
                variant="outline"
                className="h-11"
                onClick={() => void saveNow()}
              >
                Retry
              </Button>
              <Button
                variant="outline"
                className="h-11"
                onClick={() => {
                  usePlannerStore.getState().finishEdit();
                  usePlannerStore.setState({ roomOperationPending: true });
                  void saveImportedPlans(
                    [usePlannerStore.getState().document],
                    ' (copy)',
                  )
                    .then(async (copies) => {
                      openRoom(await activateLocalPlan(copies[0].id));
                      usePlannerStore.setState({ saveError: null });
                      setMessage('Saved your edits as a separate room.');
                      await refreshRooms();
                    })
                    .catch(() =>
                      setMessage(
                        'The copy could not be saved. Export a backup.',
                      ),
                    )
                    .finally(() =>
                      usePlannerStore.setState({ roomOperationPending: false }),
                    );
                }}
              >
                Save a copy
              </Button>
              <Button
                className="h-11"
                onClick={() =>
                  downloadRoomJson(usePlannerStore.getState().document)
                }
              >
                Export backup
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            className="h-11"
            onClick={() => {
              setMessage(null);
              usePlannerStore.setState({ saveRecoveryOpen: false });
            }}
          >
            Dismiss
          </Button>
        </output>
      )}
    </>
  );
}
