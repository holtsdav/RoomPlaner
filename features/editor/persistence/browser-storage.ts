/** Keep the existing consumer database; previews never read or migrate it. */
export function storageNamespace(
  pathname = globalThis.location?.pathname ?? '/',
) {
  if (pathname === '/dev/RoomPlaner' || pathname.startsWith('/dev/RoomPlaner/'))
    return 'room-planner-develop';
  if (pathname === '/RoomPlaner' || pathname.startsWith('/RoomPlaner/'))
    return 'room-planner';
  return 'room-planner-local';
}

function preferenceKey(key: string) {
  return `${storageNamespace()}${key.slice('room-planner'.length)}`;
}

// Preferences are best effort. Their failure must never undo an IndexedDB commit.
export function readPreference(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(preferenceKey(key)) ?? null;
  } catch {
    return null;
  }
}

export function writePreference(key: string, value: string | null): void {
  try {
    if (value === null) globalThis.localStorage?.removeItem(preferenceKey(key));
    else globalThis.localStorage?.setItem(preferenceKey(key), value);
  } catch {
    // The editor and IndexedDB remain usable when preferences are denied/full.
  }
}
