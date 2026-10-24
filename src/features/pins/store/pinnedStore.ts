import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { debouncedStorage } from "@/shared/utils/storage";

export interface PinnedPlaylist {
  /** playlist id, "likes" for liked songs */
  id: string;
  title: string;
  coverUrl: string;
}

export const MAX_PINS = 8;

interface PinnedState {
  pins: PinnedPlaylist[];
  togglePin: (pin: PinnedPlaylist) => void;
  unpin: (id: string) => void;
  /** keep title/cover fresh when the playlist is opened */
  refresh: (pin: PinnedPlaylist) => void;
}

export const usePinnedStore = create<PinnedState>()(
  persist(
    (set) => ({
      pins: [],
      togglePin: (pin) =>
        set((s) =>
          s.pins.some((p) => p.id === pin.id)
            ? { pins: s.pins.filter((p) => p.id !== pin.id) }
            : { pins: [...s.pins, pin].slice(-MAX_PINS) },
        ),
      unpin: (id) => set((s) => ({ pins: s.pins.filter((p) => p.id !== id) })),
      refresh: (pin) =>
        set((s) => {
          const i = s.pins.findIndex((p) => p.id === pin.id);
          if (i === -1) return s;
          const cur = s.pins[i];
          if (cur.title === pin.title && cur.coverUrl === pin.coverUrl) return s;
          const pins = [...s.pins];
          pins[i] = pin;
          return { pins };
        }),
    }),
    {
      name: "liner_pinned_playlists_v1",
      storage: createJSONStorage(() => debouncedStorage),
      partialize: (s) => ({ pins: s.pins }),
      merge: (persisted, current) => {
        const raw = (persisted as { pins?: unknown })?.pins;
        const pins = Array.isArray(raw)
          ? (raw as PinnedPlaylist[])
              .filter((p) => p && typeof p.id === "string" && typeof p.title === "string")
              .map((p) => ({ id: p.id, title: p.title, coverUrl: typeof p.coverUrl === "string" ? p.coverUrl : "" }))
              .slice(0, MAX_PINS)
          : [];
        return { ...current, pins };
      },
    },
  ),
);
