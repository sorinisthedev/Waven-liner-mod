import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Track } from "@/shared/types";

export interface ListenEntry {
  track: Track;
  /** epoch ms when the listen started */
  at: number;
  /** ms actually spent playing */
  ms: number;
}

/** a listen counts once it reaches 30 s or half the song, like a scrobble */
export const MIN_LISTEN_MS = 30_000;
export const MAX_ENTRIES = 5000;

interface ListeningLogState {
  entries: ListenEntry[];
  record: (entry: ListenEntry) => void;
  clear: () => void;
}

export function countsAsListen(ms: number, durationMs: number): boolean {
  return ms >= MIN_LISTEN_MS || (durationMs > 0 && ms >= durationMs / 2 && ms >= 5_000);
}

function slimTrack(t: Track): Track {
  return {
    id: t.id,
    title: t.title,
    artists: t.artists,
    artistId: t.artistId,
    coverUrl: t.coverUrl,
    durationMs: t.durationMs,
    playCount: 0,
    explicit: t.explicit,
    album: t.album,
  };
}

// written only when a listen is committed (not every tick), newest first
export const useListeningLogStore = create<ListeningLogState>()(
  persist(
    (set) => ({
      entries: [],
      record: (entry) =>
        set((s) => ({
          entries: [{ ...entry, track: slimTrack(entry.track) }, ...s.entries].slice(
            0,
            MAX_ENTRIES,
          ),
        })),
      clear: () => set({ entries: [] }),
    }),
    {
      name: "liner_listening_log_v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ entries: s.entries }),
      merge: (persisted, current) => {
        const raw = (persisted as { entries?: unknown })?.entries;
        const entries = Array.isArray(raw)
          ? (raw as ListenEntry[]).filter(
              (e) =>
                e &&
                typeof e.at === "number" &&
                typeof e.ms === "number" &&
                e.track &&
                typeof e.track.id === "string" &&
                typeof e.track.title === "string",
            )
          : [];
        return { ...current, entries: entries.slice(0, MAX_ENTRIES) };
      },
    },
  ),
);
