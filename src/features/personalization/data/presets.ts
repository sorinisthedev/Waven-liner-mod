export interface WallpaperPreset {
  id: string;
  label: string;
  /** css `background` value, layered gradients so no image download is needed */
  background: string;
}

export const WALLPAPER_PRESETS: readonly WallpaperPreset[] = [
  {
    id: "aurora",
    label: "Aurora",
    background:
      "radial-gradient(60% 80% at 15% 20%, #2dd4bf 0%, transparent 60%), radial-gradient(50% 70% at 85% 30%, #6366f1 0%, transparent 65%), radial-gradient(70% 60% at 50% 100%, #0ea5e9 0%, transparent 70%), #050816",
  },
  {
    id: "sunset",
    label: "Sunset",
    background:
      "radial-gradient(70% 60% at 20% 10%, #f97316 0%, transparent 60%), radial-gradient(60% 70% at 90% 40%, #db2777 0%, transparent 65%), radial-gradient(80% 60% at 40% 100%, #7c3aed 0%, transparent 70%), #12060f",
  },
  {
    id: "ocean",
    label: "Ocean",
    background:
      "radial-gradient(70% 70% at 10% 90%, #0369a1 0%, transparent 65%), radial-gradient(60% 60% at 80% 10%, #22d3ee 0%, transparent 60%), radial-gradient(50% 50% at 60% 60%, #1e3a8a 0%, transparent 70%), #020617",
  },
  {
    id: "forest",
    label: "Forest",
    background:
      "radial-gradient(60% 70% at 25% 25%, #15803d 0%, transparent 60%), radial-gradient(60% 60% at 85% 75%, #65a30d 0%, transparent 65%), radial-gradient(50% 50% at 60% 10%, #0f766e 0%, transparent 70%), #030a05",
  },
  {
    id: "candy",
    label: "Candy",
    background:
      "radial-gradient(60% 60% at 20% 30%, #f472b6 0%, transparent 60%), radial-gradient(60% 70% at 80% 20%, #a78bfa 0%, transparent 65%), radial-gradient(70% 60% at 60% 100%, #60a5fa 0%, transparent 70%), #160b1d",
  },
  {
    id: "ember",
    label: "Ember",
    background:
      "radial-gradient(60% 60% at 50% 110%, #dc2626 0%, transparent 65%), radial-gradient(50% 50% at 15% 20%, #f59e0b 0%, transparent 60%), radial-gradient(40% 50% at 90% 30%, #9f1239 0%, transparent 70%), #0d0303",
  },
  {
    id: "graphite",
    label: "Graphite",
    background:
      "radial-gradient(70% 70% at 30% 20%, #3f3f46 0%, transparent 60%), radial-gradient(60% 60% at 80% 90%, #27272a 0%, transparent 65%), linear-gradient(160deg, #18181b 0%, #09090b 100%)",
  },
  {
    id: "dawn",
    label: "Dawn",
    background:
      "radial-gradient(60% 60% at 20% 20%, #fde68a 0%, transparent 60%), radial-gradient(60% 70% at 85% 30%, #fbcfe8 0%, transparent 65%), radial-gradient(70% 60% at 50% 100%, #bfdbfe 0%, transparent 70%), #f8fafc",
  },
] as const;

export interface AccentPreset {
  id: string;
  label: string;
  /** null keeps the stock theme accent */
  color: string | null;
}

export const ACCENT_PRESETS: readonly AccentPreset[] = [
  { id: "default", label: "Liner red", color: null },
  { id: "orange", label: "Orange", color: "#f97316" },
  { id: "amber", label: "Amber", color: "#f59e0b" },
  { id: "green", label: "Green", color: "#22c55e" },
  { id: "teal", label: "Teal", color: "#14b8a6" },
  { id: "blue", label: "Blue", color: "#3b82f6" },
  { id: "indigo", label: "Indigo", color: "#6366f1" },
  { id: "violet", label: "Violet", color: "#8b5cf6" },
  { id: "pink", label: "Pink", color: "#ec4899" },
] as const;

export function findWallpaperPreset(id: string | undefined) {
  return WALLPAPER_PRESETS.find((p) => p.id === id);
}

export function findAccentPreset(id: string | undefined) {
  return ACCENT_PRESETS.find((p) => p.id === id);
}

export interface FontPreset {
  id: string;
  label: string;
  family: string;
}

/** all of these are already loaded by index.html, except the system stack */
export const APP_FONTS: readonly FontPreset[] = [
  { id: "inter", label: "Inter", family: '"Inter", sans-serif' },
  { id: "system", label: "System", family: '"Segoe UI Variable", "Segoe UI", system-ui, sans-serif' },
  { id: "montserrat", label: "Montserrat", family: '"Montserrat", sans-serif' },
  { id: "roboto_flex", label: "Roboto Flex", family: '"Roboto Flex", sans-serif' },
  { id: "geist_mono", label: "Geist Mono", family: '"Geist Mono", monospace' },
] as const;

export const LYRICS_FONTS: readonly FontPreset[] = [
  { id: "montserrat", label: "Montserrat", family: '"Montserrat", system-ui, sans-serif' },
  { id: "inter", label: "Inter", family: '"Inter", system-ui, sans-serif' },
  { id: "roboto_flex", label: "Roboto Flex", family: '"Roboto Flex", system-ui, sans-serif' },
  { id: "system", label: "System", family: '"Segoe UI Variable", "Segoe UI", system-ui, sans-serif' },
] as const;

export function findAppFont(id: string | undefined) {
  return APP_FONTS.find((f) => f.id === id);
}

export function findLyricsFont(id: string | undefined) {
  return LYRICS_FONTS.find((f) => f.id === id);
}
