import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { debouncedStorage } from "@/shared/utils/storage";

export interface ThemeColors {
  /** window background behind every panel */
  canvas: string;
  /** cards, menus, dialogs */
  surface: string;
  /** page and inset areas */
  primary: string;
  /** raised chips, inputs, hover states */
  elevated: string;
  text: string;
  accent: string;
}

export interface CustomTheme {
  id: string;
  name: string;
  /** which built-in mode the theme sits on, drives dark:/light: styling */
  base: "dark" | "light";
  colors: ThemeColors;
}

const HEX = /^#[0-9a-f]{6}$/i;
export const THEME_COLOR_KEYS: readonly (keyof ThemeColors)[] = [
  "canvas",
  "surface",
  "primary",
  "elevated",
  "text",
  "accent",
];

export const THEME_PRESETS: readonly CustomTheme[] = [
  { id: "midnight", name: "Midnight", base: "dark", colors: { canvas: "#05060a", surface: "#0d1017", primary: "#0b0d13", elevated: "#171b26", text: "#e8ecf7", accent: "#6d8bff" } },
  { id: "nord", name: "Nord", base: "dark", colors: { canvas: "#242933", surface: "#2e3440", primary: "#2b303b", elevated: "#3b4252", text: "#eceff4", accent: "#88c0d0" } },
  { id: "dracula", name: "Dracula", base: "dark", colors: { canvas: "#1e1f29", surface: "#282a36", primary: "#252631", elevated: "#343746", text: "#f8f8f2", accent: "#ff79c6" } },
  { id: "rose_pine", name: "Rosé Pine", base: "dark", colors: { canvas: "#14121c", surface: "#1f1d2e", primary: "#191724", elevated: "#26233a", text: "#e0def4", accent: "#ebbcba" } },
  { id: "forest_night", name: "Forest night", base: "dark", colors: { canvas: "#0b120e", surface: "#121c16", primary: "#0f1712", elevated: "#1b2a21", text: "#e3efe6", accent: "#5fd38d" } },
  { id: "paper", name: "Paper", base: "light", colors: { canvas: "#e9e4da", surface: "#fbf8f2", primary: "#f3efe6", elevated: "#e4ddd0", text: "#2b2620", accent: "#c2572b" } },
  { id: "sky", name: "Sky", base: "light", colors: { canvas: "#dde7f3", surface: "#ffffff", primary: "#f2f6fb", elevated: "#e1e9f4", text: "#14213d", accent: "#2f6fe4" } },
] as const;

export function isValidTheme(value: unknown): value is CustomTheme {
  const t = value as CustomTheme;
  return Boolean(
    t &&
      typeof t.name === "string" &&
      t.name.trim().length > 0 &&
      (t.base === "dark" || t.base === "light") &&
      t.colors &&
      THEME_COLOR_KEYS.every((k) => typeof t.colors[k] === "string" && HEX.test(t.colors[k])),
  );
}

interface ThemeState {
  enabled: boolean;
  active: CustomTheme;
  saved: CustomTheme[];
  setEnabled: (enabled: boolean) => void;
  applyTheme: (theme: CustomTheme) => void;
  setColor: (key: keyof ThemeColors, hex: string) => void;
  setBase: (base: "dark" | "light") => void;
  saveActive: (name: string) => void;
  deleteSaved: (id: string) => void;
  /** returns false when the json is not a theme */
  importTheme: (json: string) => boolean;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      enabled: false,
      active: THEME_PRESETS[0],
      saved: [],
      setEnabled: (enabled) => set({ enabled }),
      applyTheme: (theme) => set({ active: { ...theme, colors: { ...theme.colors } }, enabled: true }),
      setColor: (key, hex) => {
        if (!HEX.test(hex)) return;
        set((s) => ({ active: { ...s.active, colors: { ...s.active.colors, [key]: hex } }, enabled: true }));
      },
      setBase: (base) => set((s) => ({ active: { ...s.active, base } })),
      saveActive: (name) => {
        const clean = name.trim().slice(0, 40);
        if (!clean) return;
        const theme: CustomTheme = { ...get().active, id: `custom-${Date.now()}`, name: clean };
        set((s) => ({ saved: [theme, ...s.saved].slice(0, 30), active: theme }));
      },
      deleteSaved: (id) => set((s) => ({ saved: s.saved.filter((t) => t.id !== id) })),
      importTheme: (json) => {
        try {
          const parsed = JSON.parse(json) as unknown;
          if (!isValidTheme(parsed)) return false;
          const theme: CustomTheme = {
            id: `custom-${Date.now()}`,
            name: parsed.name.trim().slice(0, 40),
            base: parsed.base,
            colors: Object.fromEntries(
              THEME_COLOR_KEYS.map((k) => [k, parsed.colors[k].toLowerCase()]),
            ) as unknown as ThemeColors,
          };
          set((s) => ({ saved: [theme, ...s.saved].slice(0, 30), active: theme, enabled: true }));
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: "liner_custom_theme_v1",
      storage: createJSONStorage(() => debouncedStorage),
      partialize: (s) => ({ enabled: s.enabled, active: s.active, saved: s.saved }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ThemeState>;
        return {
          ...current,
          enabled: typeof p.enabled === "boolean" ? p.enabled : false,
          active: isValidTheme(p.active) ? p.active : current.active,
          saved: Array.isArray(p.saved) ? p.saved.filter(isValidTheme).slice(0, 30) : [],
        };
      },
    },
  ),
);

export function exportThemeJson(theme: CustomTheme): string {
  const { name, base, colors } = theme;
  return JSON.stringify({ name, base, colors }, null, 2);
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: string, b: string, amount: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const ch = (x: number, y: number) =>
    Math.round(x + (y - x) * amount)
      .toString(16)
      .padStart(2, "0");
  return `#${ch(r1, r2)}${ch(g1, g2)}${ch(b1, b2)}`;
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** full set of css variables a custom theme overrides */
export function themeCssVars(theme: CustomTheme): Record<string, string> {
  const c = theme.colors;
  return {
    "--bg-canvas": c.canvas,
    "--bg-surface": c.surface,
    "--bg-primary": c.primary,
    "--bg-elevated": c.elevated,
    "--bg-panel": mix(c.elevated, c.text, 0.04),
    "--bg-overlay": rgba(c.primary, 0.96),
    "--bg-glass": rgba(c.surface, 0.55),
    "--border-primary": mix(c.surface, c.text, 0.08),
    "--border-secondary": mix(c.surface, c.text, 0.12),
    "--border-tertiary": mix(c.surface, c.text, 0.2),
    "--text-primary": c.text,
    "--text-secondary": rgba(c.text, 0.7),
    "--text-tertiary": rgba(c.text, 0.45),
    "--accent-primary": c.accent,
    "--accent-secondary": mix(c.accent, "#ffffff", 0.25),
    "--accent-tertiary": mix(c.accent, "#ffffff", 0.45),
    "--btn-primary-bg": c.text,
    "--btn-primary-text": c.canvas,
  };
}
