import type {
  ApiTrack,
  PlaybackHistoryItem,
  UserPlaylist,
  UserPlaylistItem,
} from "../contracts";

/**
 * Everything WAVEN used to keep on Liner's servers, kept on this PC instead:
 * the profile, likes, saved albums/artists/playlists, your playlists and play
 * history. One document in IndexedDB (inside the app's data folder), cached in
 * memory and written back shortly after each change.
 */

export interface LocalProfile {
  displayName: string | null;
  bio: string | null;
}

export interface LocalLike {
  track: ApiTrack;
  likedAt: string;
}

export type CollectionType = "albums" | "artists" | "playlists";

export interface LocalCollection {
  id: string;
  snapshot: Record<string, unknown>;
  savedAt: string;
}

export interface LocalPlaylist {
  playlist: UserPlaylist;
  items: UserPlaylistItem[];
}

export interface LocalData {
  version: 1;
  profile: LocalProfile;
  likes: LocalLike[];
  collections: Record<CollectionType, LocalCollection[]>;
  playlists: LocalPlaylist[];
  history: PlaybackHistoryItem[];
}

export const MAX_HISTORY = 3000;

export function emptyLocalData(): LocalData {
  return {
    version: 1,
    profile: { displayName: null, bio: null },
    likes: [],
    collections: { albums: [], artists: [], playlists: [] },
    playlists: [],
    history: [],
  };
}

const DB_NAME = "waven_local_v1";
const STORE = "docs";
const KEY = "library";

let dbPromise: Promise<IDBDatabase> | null = null;
let cache: LocalData | null = null;
let loading: Promise<LocalData> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB unavailable"));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

function normalize(raw: unknown): LocalData {
  const base = emptyLocalData();
  if (!raw || typeof raw !== "object") return base;
  const d = raw as Partial<LocalData>;
  return {
    version: 1,
    profile: {
      displayName: typeof d.profile?.displayName === "string" ? d.profile.displayName : null,
      bio: typeof d.profile?.bio === "string" ? d.profile.bio : null,
    },
    likes: Array.isArray(d.likes) ? d.likes.filter((l) => l?.track?.id) : [],
    collections: {
      albums: Array.isArray(d.collections?.albums) ? d.collections.albums : [],
      artists: Array.isArray(d.collections?.artists) ? d.collections.artists : [],
      playlists: Array.isArray(d.collections?.playlists) ? d.collections.playlists : [],
    },
    playlists: Array.isArray(d.playlists) ? d.playlists.filter((p) => p?.playlist?.id) : [],
    history: Array.isArray(d.history) ? d.history.slice(0, MAX_HISTORY) : [],
  };
}

async function readFromDisk(): Promise<LocalData> {
  try {
    const db = await openDb();
    const value = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return normalize(value);
  } catch {
    return emptyLocalData();
  }
}

async function writeToDisk(data: LocalData): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(data, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadLocalData(): Promise<LocalData> {
  if (cache) return cache;
  if (!loading) {
    loading = readFromDisk().then((d) => {
      cache = d;
      loading = null;
      return d;
    });
  }
  return loading;
}

/** applies a change and schedules a save; returns whatever the mutator returns */
export async function mutateLocalData<T>(mutator: (data: LocalData) => T): Promise<T> {
  const data = await loadLocalData();
  const result = mutator(data);
  scheduleSave();
  return result;
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    if (cache) void writeToDisk(cache).catch(() => {});
  }, 250);
}

/** writes any pending change right away (used before backups and on quit) */
export async function flushLocalData(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (cache) await writeToDisk(cache);
}

/** replaces everything, used by settings restore */
export async function replaceLocalData(raw: unknown): Promise<void> {
  cache = normalize(raw);
  await writeToDisk(cache);
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (saveTimer && cache) void writeToDisk(cache);
  });
}
