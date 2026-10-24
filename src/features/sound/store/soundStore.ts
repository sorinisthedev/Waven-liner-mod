import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { debouncedStorage } from "@/shared/utils/storage";
import { EQ_PRESETS, findEqPreset } from "../data/eqPresets";

export const EQ_BAND_COUNT = 10;
export const EQ_MIN_DB = -12;
export const EQ_MAX_DB = 12;

export interface SoundSettings {
  eqEnabled: boolean;
  /** "custom" once a band is moved by hand */
  eqPresetId: string;
  eqGains: number[];
  notifyOnTrackChange: boolean;
  leveling: boolean;
  karaoke: boolean;
  /** seconds songs fade out at the end and in at the start, 0 = off */
  crossfadeSec: number;
  visualizer: boolean;
}

export const CROSSFADE_MAX_SEC = 12;

export const DEFAULT_SOUND: SoundSettings = {
  eqEnabled: false,
  eqPresetId: "flat",
  eqGains: [...EQ_PRESETS[0].gains],
  notifyOnTrackChange: false,
  leveling: false,
  karaoke: false,
  crossfadeSec: 0,
  visualizer: true,
};

interface SoundState extends SoundSettings {
  setEqEnabled: (enabled: boolean) => void;
  applyEqPreset: (presetId: string) => void;
  setEqBand: (index: number, gainDb: number) => void;
  setNotifyOnTrackChange: (enabled: boolean) => void;
  setLeveling: (enabled: boolean) => void;
  setKaraoke: (enabled: boolean) => void;
  setCrossfadeSec: (sec: number) => void;
  setVisualizer: (enabled: boolean) => void;
}

const clampDb = (v: number) =>
  Math.round(Math.min(EQ_MAX_DB, Math.max(EQ_MIN_DB, Number.isFinite(v) ? v : 0)) * 2) / 2;

/** true when anything needs playback routed through the web-audio post chain */
export function needsPostChain(s: SoundSettings): boolean {
  return (
    (s.eqEnabled && s.eqGains.some((g) => g !== 0)) ||
    s.leveling ||
    s.karaoke ||
    s.crossfadeSec > 0
  );
}

/** gains actually sent to the audio graph: flat while the EQ is off */
export function effectiveEqGains(s: Pick<SoundSettings, "eqEnabled" | "eqGains">): number[] {
  return s.eqEnabled ? s.eqGains : Array.from({ length: EQ_BAND_COUNT }, () => 0);
}

export const useSoundStore = create<SoundState>()(
  persist(
    (set) => ({
      ...DEFAULT_SOUND,
      setEqEnabled: (eqEnabled) => set({ eqEnabled }),
      applyEqPreset: (presetId) => {
        const preset = findEqPreset(presetId);
        if (!preset) return;
        set({ eqPresetId: preset.id, eqGains: [...preset.gains], eqEnabled: true });
      },
      setEqBand: (index, gainDb) =>
        set((s) => {
          if (index < 0 || index >= EQ_BAND_COUNT) return s;
          const eqGains = [...s.eqGains];
          eqGains[index] = clampDb(gainDb);
          return { eqGains, eqPresetId: "custom", eqEnabled: true };
        }),
      setNotifyOnTrackChange: (notifyOnTrackChange) => set({ notifyOnTrackChange }),
      setLeveling: (leveling) => set({ leveling }),
      setKaraoke: (karaoke) => set({ karaoke }),
      setCrossfadeSec: (sec) =>
        set({
          crossfadeSec: Math.round(
            Math.min(CROSSFADE_MAX_SEC, Math.max(0, Number.isFinite(sec) ? sec : 0)),
          ),
        }),
      setVisualizer: (visualizer) => set({ visualizer }),
    }),
    {
      name: "liner_sound_v1",
      storage: createJSONStorage(() => debouncedStorage),
      partialize: (s): SoundSettings => ({
        eqEnabled: s.eqEnabled,
        eqPresetId: s.eqPresetId,
        eqGains: s.eqGains,
        notifyOnTrackChange: s.notifyOnTrackChange,
        leveling: s.leveling,
        karaoke: s.karaoke,
        crossfadeSec: s.crossfadeSec,
        visualizer: s.visualizer,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SoundSettings>;
        const gainsOk =
          Array.isArray(p.eqGains) &&
          p.eqGains.length === EQ_BAND_COUNT &&
          p.eqGains.every((g) => typeof g === "number" && Number.isFinite(g));
        return {
          ...current,
          eqEnabled: typeof p.eqEnabled === "boolean" ? p.eqEnabled : DEFAULT_SOUND.eqEnabled,
          eqPresetId:
            p.eqPresetId === "custom" || findEqPreset(p.eqPresetId)
              ? (p.eqPresetId as string)
              : DEFAULT_SOUND.eqPresetId,
          eqGains: gainsOk ? p.eqGains!.map(clampDb) : [...DEFAULT_SOUND.eqGains],
          notifyOnTrackChange:
            typeof p.notifyOnTrackChange === "boolean"
              ? p.notifyOnTrackChange
              : DEFAULT_SOUND.notifyOnTrackChange,
          leveling: typeof p.leveling === "boolean" ? p.leveling : DEFAULT_SOUND.leveling,
          karaoke: typeof p.karaoke === "boolean" ? p.karaoke : DEFAULT_SOUND.karaoke,
          crossfadeSec:
            typeof p.crossfadeSec === "number" && Number.isFinite(p.crossfadeSec)
              ? Math.round(Math.min(CROSSFADE_MAX_SEC, Math.max(0, p.crossfadeSec)))
              : DEFAULT_SOUND.crossfadeSec,
          visualizer:
            typeof p.visualizer === "boolean" ? p.visualizer : DEFAULT_SOUND.visualizer,
        };
      },
    },
  ),
);
