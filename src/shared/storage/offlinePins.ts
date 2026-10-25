// songs downloaded for offline use; the audio cache never evicts these
const pinned = new Set<string>();

export function setOfflinePins(ids: Iterable<string>) {
  pinned.clear();
  for (const id of ids) pinned.add(id);
}

export function isOfflinePinned(trackId: string): boolean {
  return pinned.has(trackId);
}
