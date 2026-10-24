import { create } from "zustand";

export type SleepTimerMode = "time" | "end_of_track";

interface SleepTimerState {
  mode: SleepTimerMode | null;
  /** epoch ms, only for "time" */
  endsAt: number | null;
  /** track the "end_of_track" timer is waiting on */
  trackId: string | null;
  startMinutes: (minutes: number) => void;
  startEndOfTrack: (trackId: string | null) => void;
  cancel: () => void;
}

// not persisted on purpose: a timer surviving an app restart would be a surprise
export const useSleepTimerStore = create<SleepTimerState>((set) => ({
  mode: null,
  endsAt: null,
  trackId: null,
  startMinutes: (minutes) =>
    set({
      mode: "time",
      endsAt: Date.now() + Math.max(1, minutes) * 60_000,
      trackId: null,
    }),
  startEndOfTrack: (trackId) => set({ mode: "end_of_track", endsAt: null, trackId }),
  cancel: () => set({ mode: null, endsAt: null, trackId: null }),
}));

export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}
