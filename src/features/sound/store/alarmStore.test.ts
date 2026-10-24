import { describe, it, expect } from "vitest";
import { DEFAULT_ALARM, isAlarmDue, localDay } from "./alarmStore";

describe("isAlarmDue", () => {
  const at = (h: number, m: number) => new Date(2026, 9, 24, h, m);
  const on = { ...DEFAULT_ALARM, enabled: true, time: "07:30" };

  it("fires in the minutes right after the set time", () => {
    expect(isAlarmDue(on, at(7, 29))).toBe(false);
    expect(isAlarmDue(on, at(7, 30))).toBe(true);
    expect(isAlarmDue(on, at(7, 34))).toBe(true);
    expect(isAlarmDue(on, at(7, 40))).toBe(false);
  });

  it("fires once per day and never when off", () => {
    expect(isAlarmDue({ ...on, lastFiredOn: localDay(at(7, 30)) }, at(7, 31))).toBe(false);
    expect(isAlarmDue({ ...on, enabled: false }, at(7, 30))).toBe(false);
  });
});
