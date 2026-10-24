import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { usePersonalizationStore } from "../store/personalizationStore";
import { themeCssVars, useThemeStore } from "../store/themeStore";
import { onWindowVisibilityChange } from "@/shared/utils/windowVisibility";
import { findAccentPreset, findAppFont, findLyricsFont } from "../data/presets";

function mixWithWhite(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) => {
    const v = (n >> shift) & 0xff;
    return Math.round(v + (255 - v) * amount)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}

/** applies the accent override and restores the stored wallpaper image on launch */
export function PersonalizationSync() {
  const accentId = usePersonalizationStore((s) => s.accentId);
  const assetKey = usePersonalizationStore((s) => s.wallpaperAssetKey);
  const loadWallpaperImage = usePersonalizationStore((s) => s.loadWallpaperImage);
  const appFontId = usePersonalizationStore((s) => s.appFontId);
  const lyricsFontId = usePersonalizationStore((s) => s.lyricsFontId);
  const lyricsScale = usePersonalizationStore((s) => s.lyricsScale);
  const performanceMode = usePersonalizationStore((s) => s.performanceMode);
  const customThemeOn = useThemeStore((s) => s.enabled);
  const customTheme = useThemeStore((s) => s.active);
  const { setTheme, theme } = useTheme();
  const appliedVars = useRef<string[]>([]);

  // custom theme sits on its base mode so dark:/light: utilities match it
  useEffect(() => {
    if (customThemeOn && theme !== customTheme.base) setTheme(customTheme.base);
  }, [customThemeOn, customTheme.base, theme, setTheme]);

  useEffect(() => {
    document.documentElement.classList.toggle("liner-performance", performanceMode);
    window.linerElectron?.setPerformanceMode?.(performanceMode);
    if (!performanceMode) return;
    // while hidden nothing is on screen, so decoded images can go and reload later
    return onWindowVisibilityChange((visible) => {
      if (!visible) window.linerElectron?.trimMemory?.();
    });
  }, [performanceMode]);

  useEffect(() => {
    const root = document.documentElement;
    // components read --font-inter directly, so overriding it swaps the whole ui
    if (appFontId === "inter") root.style.removeProperty("--font-inter");
    else {
      const font = findAppFont(appFontId);
      if (font) root.style.setProperty("--font-inter", font.family);
    }
  }, [appFontId]);

  useEffect(() => {
    const root = document.documentElement;
    const font = findLyricsFont(lyricsFontId);
    if (font && lyricsFontId !== "montserrat") root.style.setProperty("--liner-lyrics-font", font.family);
    else root.style.removeProperty("--liner-lyrics-font");
    if (lyricsScale !== 1) root.style.setProperty("--liner-lyrics-scale", String(lyricsScale));
    else root.style.removeProperty("--liner-lyrics-scale");
  }, [lyricsFontId, lyricsScale]);

  // colors: a custom theme overrides everything, otherwise just the accent preset
  useEffect(() => {
    const root = document.documentElement;
    appliedVars.current.forEach((v) => root.style.removeProperty(v));
    const vars: Record<string, string> = {};
    if (customThemeOn) {
      Object.assign(vars, themeCssVars(customTheme));
    } else {
      const color = findAccentPreset(accentId)?.color;
      if (color) {
        vars["--accent-primary"] = color;
        vars["--accent-secondary"] = mixWithWhite(color, 0.25);
        vars["--accent-tertiary"] = mixWithWhite(color, 0.45);
      }
    }
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
    appliedVars.current = Object.keys(vars);
  }, [accentId, customThemeOn, customTheme]);

  useEffect(() => {
    if (!assetKey) return;
    if (usePersonalizationStore.getState().wallpaperImageUrl) return;
    void loadWallpaperImage();
  }, [assetKey, loadWallpaperImage]);

  return null;
}

export default PersonalizationSync;
