import { describe, it, expect, beforeEach } from "vitest";
import { THEME_PRESETS, exportThemeJson, themeCssVars, useThemeStore } from "./themeStore";

describe("themeStore", () => {
  beforeEach(() => useThemeStore.setState({ enabled: false, active: THEME_PRESETS[0], saved: [] }));

  it("round-trips a theme through export and import", () => {
    const json = exportThemeJson(THEME_PRESETS[2]);
    expect(useThemeStore.getState().importTheme(json)).toBe(true);
    const s = useThemeStore.getState();
    expect(s.enabled).toBe(true);
    expect(s.saved[0].name).toBe(THEME_PRESETS[2].name);
    expect(s.active.colors).toEqual(THEME_PRESETS[2].colors);
  });

  it("rejects files that are not themes", () => {
    expect(useThemeStore.getState().importTheme('{"name":"x","colors":{"canvas":"red"}}')).toBe(false);
    expect(useThemeStore.getState().importTheme("not json")).toBe(false);
  });

  it("ignores invalid colors", () => {
    useThemeStore.getState().setColor("accent", "javascript:1");
    expect(useThemeStore.getState().active.colors.accent).toBe(THEME_PRESETS[0].colors.accent);
  });

  it("derives the full variable set", () => {
    const vars = themeCssVars(THEME_PRESETS[0]);
    expect(vars["--bg-canvas"]).toBe(THEME_PRESETS[0].colors.canvas);
    expect(vars["--text-secondary"]).toMatch(/^rgba\(/);
  });
});
