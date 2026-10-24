import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { debouncedStorage } from "@/shared/utils/storage";

export interface AlarmSettings {
  enabled: boolean;
  /** "HH:MM", 24h local time */
  time: string;
  repeatDaily: boolean;
  /** seconds to ramp from silence to the normal volume */
  rampSec: number;
  /** local yyyy-mm-dd of the last time it went off, so it fires once a day */
  lastFiredOn: string | null;
}

export const DEFAULT_ALARM: AlarmSettings = {
  enabled: false,
  time: "07:30",
  repeatDaily: true,
  rampSec: 60,
  lastFiredOn: null,
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

interface AlarmState extends AlarmSettings {
  setEnabled: (enabled: boolean) => void;
  setTime: (time: string) => void;
  setRepeatDaily: (repeat: boolean) => void;
  markFired: (day: string) => void;
}

export function localDay(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** true when the alarm should go off at `now` */
export function isAlarmDue(a: AlarmSettings, now = new Date()): boolean {
  if (!a.enabled || !TIME_RE.test(a.time)) return false;
  if (a.lastFiredOn === localDay(now)) return false;
  const [h, m] = a.time.split(":").map(Number);
  const minutes = now.getHours() * 60 + now.getMinutes();
  const target = h * 60 + m;
  // a few minutes of grace covers a busy or briefly suspended app
  return minutes >= target && minutes - target <= 5;
}

export const useAlarmStore = create<AlarmState>()(
  persist(
    (set) => ({
      ...DEFAULT_ALARM,
      setEnabled: (enabled) => set({ enabled, lastFiredOn: null }),
      setTime: (time) => {
        if (TIME_RE.test(time)) set({ time, lastFiredOn: null });
      },
      setRepeatDaily: (repeatDaily) => set({ repeatDaily }),
      markFired: (day) =>
        set((s) => ({ lastFiredOn: day, enabled: s.repeatDaily ? s.enabled : false })),
    }),
    {
      name: "liner_alarm_v1",
      storage: createJSONStorage(() => debouncedStorage),
      partialize: (s): AlarmSettings => ({
        enabled: s.enabled,
        time: s.time,
        repeatDaily: s.repeatDaily,
        rampSec: s.rampSec,
        lastFiredOn: s.lastFiredOn,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AlarmSettings>;
        return {
          ...current,
          enabled: typeof p.enabled === "boolean" ? p.enabled : DEFAULT_ALARM.enabled,
          time: typeof p.time === "string" && TIME_RE.test(p.time) ? p.time : DEFAULT_ALARM.time,
          repeatDaily:
            typeof p.repeatDaily === "boolean" ? p.repeatDaily : DEFAULT_ALARM.repeatDaily,
          rampSec: DEFAULT_ALARM.rampSec,
          lastFiredOn: typeof p.lastFiredOn === "string" ? p.lastFiredOn : null,
        };
      },
    },
  ),
);
