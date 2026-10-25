import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Track } from "@/shared/types";
import { playerRuntime } from "@/features/player/engine/playerRuntime";
import { audioCache } from "@/shared/storage/audioCache";
import { setOfflinePins } from "@/shared/storage/offlinePins";
import { debouncedStorage } from "@/shared/utils/storage";

export interface OfflineCollection {
  title: string;
  trackIds: string[];
  downloadedAt: string;
}

export interface DownloadProgress {
  done: number;
  total: number;
  failed: number;
}

interface OfflineState {
  /** playlist / album id -> what was downloaded for it */
  collections: Record<string, OfflineCollection>;
  /** every song saved for offline, across collections */
  downloaded: Record<string, true>;
  active: Record<string, DownloadProgress>;
  download: (collectionId: string, title: string, tracks: Track[]) => Promise<void>;
  cancel: (collectionId: string) => void;
  remove: (collectionId: string) => Promise<void>;
}

const controllers = new Map<string, AbortController>();
const CONCURRENCY = 2;

function syncPins(downloaded: Record<string, true>) {
  setOfflinePins(Object.keys(downloaded));
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      collections: {},
      downloaded: {},
      active: {},

      download: async (collectionId, title, tracks) => {
        if (controllers.has(collectionId)) return;
        const controller = new AbortController();
        controllers.set(collectionId, controller);
        const queue = tracks.filter((t) => t.id && !t.id.startsWith("local:"));
        const progress: DownloadProgress = { done: 0, total: queue.length, failed: 0 };
        set((s) => ({ active: { ...s.active, [collectionId]: { ...progress } } }));

        const saved: string[] = [];
        let next = 0;
        const worker = async () => {
          while (next < queue.length && !controller.signal.aborted) {
            const track = queue[next++];
            try {
              const ok = get().downloaded[track.id]
                ? true
                : Boolean(await playerRuntime?.downloadForOffline(track, controller.signal));
              if (ok) {
                saved.push(track.id);
                set((s) => {
                  const downloaded = { ...s.downloaded, [track.id]: true as const };
                  syncPins(downloaded);
                  return { downloaded };
                });
              } else progress.failed += 1;
            } catch {
              if (controller.signal.aborted) return;
              progress.failed += 1;
            }
            progress.done += 1;
            set((s) => ({ active: { ...s.active, [collectionId]: { ...progress } } }));
          }
        };
        await Promise.all(Array.from({ length: CONCURRENCY }, worker));
        controllers.delete(collectionId);

        set((s) => {
          const active = { ...s.active };
          delete active[collectionId];
          if (controller.signal.aborted && saved.length === 0) return { active };
          const prev = s.collections[collectionId]?.trackIds ?? [];
          return {
            active,
            collections: {
              ...s.collections,
              [collectionId]: {
                title,
                trackIds: [...new Set([...prev, ...saved])],
                downloadedAt: new Date().toISOString(),
              },
            },
          };
        });
      },

      cancel: (collectionId) => controllers.get(collectionId)?.abort(),

      remove: async (collectionId) => {
        get().cancel(collectionId);
        const { collections, downloaded } = get();
        const target = collections[collectionId];
        if (!target) return;
        const stillUsed = new Set(
          Object.entries(collections)
            .filter(([id]) => id !== collectionId)
            .flatMap(([, c]) => c.trackIds),
        );
        const nextDownloaded = { ...downloaded };
        for (const id of target.trackIds) {
          if (stillUsed.has(id)) continue;
          delete nextDownloaded[id];
          await audioCache.deleteAudio(id).catch(() => {});
        }
        const nextCollections = { ...collections };
        delete nextCollections[collectionId];
        syncPins(nextDownloaded);
        set({ collections: nextCollections, downloaded: nextDownloaded });
      },
    }),
    {
      name: "liner_offline_v1",
      storage: createJSONStorage(() => debouncedStorage),
      partialize: (s) => ({ collections: s.collections, downloaded: s.downloaded }),
      onRehydrateStorage: () => (state) => {
        if (state) syncPins(state.downloaded ?? {});
      },
    },
  ),
);
