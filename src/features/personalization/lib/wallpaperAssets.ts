// wallpapers can be a few MB, too big for localStorage, so the blob lives in
// its own tiny IndexedDB store and the settings store only keeps its key

const DB_NAME = "liner_personalization_v1";
const STORE = "assets";

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available"));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });
  return dbPromise;
}

function run<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = fn(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );
}

export function putWallpaperAsset(key: string, blob: Blob) {
  return run("readwrite", (store) => store.put(blob, key)).then(() => undefined);
}

export async function getWallpaperAsset(key: string): Promise<Blob | null> {
  const value = await run<unknown>("readonly", (store) => store.get(key));
  return value instanceof Blob ? value : null;
}

export function deleteWallpaperAsset(key: string) {
  return run("readwrite", (store) => store.delete(key)).then(() => undefined);
}
