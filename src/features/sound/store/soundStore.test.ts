import { describe, it, expect, beforeEach } from "vitest";
import { DEFAULT_SOUND, EQ_MAX_DB, effectiveEqGains, useSoundStore } from "./soundStore";
import { useSleepTimerStore, formatRemaining } from "./sleepTimerStore";

describe("soundStore", () => {
  beforeEach(() => {
    useSoundStore.setState({ ...DEFAULT_SOUND, eqGains: [...DEFAULT_SOUND.eqGains] });
  });

  it("applying a preset turns the EQ on with its gains", () => {
    useSoundStore.getState().applyEqPreset("bass_boost");
    const s = useSoundStore.getState();
    expect(s.eqEnabled).toBe(true);
    expect(s.eqPresetId).toBe("bass_boost");
    expect(s.eqGains[0]).toBe(6);
  });

  it("moving a band switches to custom and clamps to the range", () => {
    useSoundStore.getState().setEqBand(3, 40);
    const s = useSoundStore.getState();
    expect(s.eqPresetId).toBe("custom");
    expect(s.eqGains[3]).toBe(EQ_MAX_DB);
  });

  it("sends flat gains while disabled", () => {
    useSoundStore.getState().applyEqPreset("rock");
    useSoundStore.getState().setEqEnabled(false);
    expect(effectiveEqGains(useSoundStore.getState()).every((g) => g === 0)).toBe(true);
  });

  it("rejects malformed persisted gains", () => {
    const merge = useSoundStore.persist.getOptions().merge!;
    const merged = merge({ eqGains: [1, 2, "x"], eqPresetId: "nope" }, useSoundStore.getState());
    expect(merged.eqGains).toEqual(DEFAULT_SOUND.eqGains);
    expect(merged.eqPresetId).toBe("flat");
  });
});

describe("sleepTimerStore", () => {
  it("arms and cancels", () => {
    useSleepTimerStore.getState().startMinutes(30);
    const { mode, endsAt } = useSleepTimerStore.getState();
    expect(mode).toBe("time");
    expect(endsAt! - Date.now()).toBeGreaterThan(29 * 60_000);
    useSleepTimerStore.getState().cancel();
    expect(useSleepTimerStore.getState().mode).toBeNull();
  });

  it("formats remaining time", () => {
    expect(formatRemaining(65_000)).toBe("1:05");
    expect(formatRemaining(3_725_000)).toBe("1:02:05");
  });
});
