import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { debouncedStorage } from "@/shared/utils/storage";
import {
  findAccentPreset,
  findAppFont,
  findLyricsFont,
  findWallpaperPreset,
} from "../data/presets";
import { fileToAvatarDataUrl, fileToWallpaperBlob } from "../lib/imageProcessing";
import {
  deleteWallpaperAsset,
  getWallpaperAsset,
  putWallpaperAsset,
} from "../lib/wallpaperAssets";

export type AvatarShape = "rounded" | "circle";
export type WallpaperKind = "none" | "preset" | "image";

export interface PersonalizationSettings {
  avatarDataUrl: string | null;
  avatarShape: AvatarShape;
  wallpaperKind: WallpaperKind;
  wallpaperPresetId: string;
  wallpaperAssetKey: string | null;
  /** px */
  wallpaperBlur: number;
  /** 0..0.9, theme-colored scrim over the wallpaper so text stays readable */
  wallpaperDim: number;
  wallpaperMotion: boolean;
  /** album / artist / playlist pages paint their cover over the wallpaper */
  coverBackdrops: boolean;
  accentId: string;
  appFontId: string;
  lyricsFontId: string;
  /** multiplier on the fullscreen lyrics size */
  lyricsScale: number;
  /** trades eye candy (blur, motion, full-rate backgrounds) for lower cpu/gpu/ram */
  performanceMode: boolean;
}

export const DEFAULT_PERSONALIZATION: PersonalizationSettings = {
  avatarDataUrl: null,
  avatarShape: "rounded",
  wallpaperKind: "none",
  wallpaperPresetId: "aurora",
  wallpaperAssetKey: null,
  wallpaperBlur: 0,
  wallpaperDim: 0.45,
  wallpaperMotion: false,
  coverBackdrops: true,
  accentId: "default",
  appFontId: "inter",
  lyricsFontId: "montserrat",
  lyricsScale: 1,
  performanceMode: false,
};

export const LYRICS_SCALE_MIN = 0.7;
export const LYRICS_SCALE_MAX = 1.5;

export const WALLPAPER_BLUR_MAX = 40;
export const WALLPAPER_DIM_MAX = 0.9;

interface PersonalizationState extends PersonalizationSettings {
  /** object url for the stored wallpaper image, rebuilt on every launch */
  wallpaperImageUrl: string | null;
  setAvatarFromFile: (file: File) => Promise<void>;
  clearAvatar: () => void;
  setAvatarShape: (shape: AvatarShape) => void;
  setPresetWallpaper: (presetId: string) => void;
  setImageWallpaper: (file: File) => Promise<void>;
  applyStoredImageWallpaper: () => void;
  clearWallpaper: () => void;
  removeWallpaperImage: () => Promise<void>;
  setWallpaperBlur: (blur: number) => void;
  setWallpaperDim: (dim: number) => void;
  setWallpaperMotion: (motion: boolean) => void;
  setCoverBackdrops: (enabled: boolean) => void;
  setAccent: (accentId: string) => void;
  setAppFont: (fontId: string) => void;
  setLyricsFont: (fontId: string) => void;
  setLyricsScale: (scale: number) => void;
  setPerformanceMode: (enabled: boolean) => void;
  loadWallpaperImage: () => Promise<void>;
  resetPersonalization: () => Promise<void>;
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(v) ? v : min));

function swapImageUrl(prev: string | null, next: string | null) {
  if (prev && prev !== next) URL.revokeObjectURL(prev);
  return next;
}

export const usePersonalizationStore = create<PersonalizationState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_PERSONALIZATION,
      wallpaperImageUrl: null,

      setAvatarFromFile: async (file) => {
        const avatarDataUrl = await fileToAvatarDataUrl(file);
        set({ avatarDataUrl });
      },
      clearAvatar: () => set({ avatarDataUrl: null }),
      setAvatarShape: (avatarShape) => set({ avatarShape }),

      setPresetWallpaper: (presetId) => {
        if (!findWallpaperPreset(presetId)) return;
        set({ wallpaperKind: "preset", wallpaperPresetId: presetId });
      },
      setImageWallpaper: async (file) => {
        const blob = await fileToWallpaperBlob(file);
        const key = `wallpaper-${Date.now()}`;
        await putWallpaperAsset(key, blob);
        const previousKey = get().wallpaperAssetKey;
        set((s) => ({
          wallpaperKind: "image",
          wallpaperAssetKey: key,
          wallpaperImageUrl: swapImageUrl(s.wallpaperImageUrl, URL.createObjectURL(blob)),
        }));
        if (previousKey && previousKey !== key) {
          deleteWallpaperAsset(previousKey).catch(() => {});
        }
      },
      applyStoredImageWallpaper: () => {
        if (get().wallpaperAssetKey) set({ wallpaperKind: "image" });
      },
      clearWallpaper: () => set({ wallpaperKind: "none" }),
      removeWallpaperImage: async () => {
        const key = get().wallpaperAssetKey;
        set((s) => ({
          wallpaperAssetKey: null,
          wallpaperKind: s.wallpaperKind === "image" ? "none" : s.wallpaperKind,
          wallpaperImageUrl: swapImageUrl(s.wallpaperImageUrl, null),
        }));
        if (key) await deleteWallpaperAsset(key).catch(() => {});
      },

      setWallpaperBlur: (blur) =>
        set({ wallpaperBlur: clamp(blur, 0, WALLPAPER_BLUR_MAX) }),
      setWallpaperDim: (dim) =>
        set({ wallpaperDim: clamp(dim, 0, WALLPAPER_DIM_MAX) }),
      setWallpaperMotion: (wallpaperMotion) => set({ wallpaperMotion }),
      setCoverBackdrops: (coverBackdrops) => set({ coverBackdrops }),
      setAccent: (accentId) => {
        if (!findAccentPreset(accentId)) return;
        set({ accentId });
      },
      setAppFont: (appFontId) => {
        if (findAppFont(appFontId)) set({ appFontId });
      },
      setLyricsFont: (lyricsFontId) => {
        if (findLyricsFont(lyricsFontId)) set({ lyricsFontId });
      },
      setPerformanceMode: (performanceMode) => set({ performanceMode }),
      setLyricsScale: (scale) =>
        set({ lyricsScale: clamp(scale, LYRICS_SCALE_MIN, LYRICS_SCALE_MAX) }),

      loadWallpaperImage: async () => {
        const key = get().wallpaperAssetKey;
        if (!key) return;
        const blob = await getWallpaperAsset(key).catch(() => null);
        if (get().wallpaperAssetKey !== key) return;
        if (!blob) {
          // asset went missing (cleared site data), fall back to no wallpaper
          set((s) => ({
            wallpaperAssetKey: null,
            wallpaperKind: s.wallpaperKind === "image" ? "none" : s.wallpaperKind,
          }));
          return;
        }
        set((s) => ({
          wallpaperImageUrl: swapImageUrl(s.wallpaperImageUrl, URL.createObjectURL(blob)),
        }));
      },

      resetPersonalization: async () => {
        const key = get().wallpaperAssetKey;
        set((s) => ({
          ...DEFAULT_PERSONALIZATION,
          // reset is about looks; keep the user's performance choice
          performanceMode: s.performanceMode,
          wallpaperImageUrl: swapImageUrl(s.wallpaperImageUrl, null),
        }));
        if (key) await deleteWallpaperAsset(key).catch(() => {});
      },
    }),
    {
      name: "liner_personalization_v1",
      storage: createJSONStorage(() => debouncedStorage),
      partialize: (state): PersonalizationSettings => ({
        avatarDataUrl: state.avatarDataUrl,
        avatarShape: state.avatarShape,
        wallpaperKind: state.wallpaperKind,
        wallpaperPresetId: state.wallpaperPresetId,
        wallpaperAssetKey: state.wallpaperAssetKey,
        wallpaperBlur: state.wallpaperBlur,
        wallpaperDim: state.wallpaperDim,
        wallpaperMotion: state.wallpaperMotion,
        coverBackdrops: state.coverBackdrops,
        accentId: state.accentId,
        appFontId: state.appFontId,
        lyricsFontId: state.lyricsFontId,
        lyricsScale: state.lyricsScale,
        performanceMode: state.performanceMode,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PersonalizationSettings>;
        const pick = <K extends keyof PersonalizationSettings>(
          key: K,
          valid: (v: unknown) => boolean,
        ): PersonalizationSettings[K] =>
          valid(p[key]) ? (p[key] as PersonalizationSettings[K]) : DEFAULT_PERSONALIZATION[key];
        const isNum = (v: unknown) => typeof v === "number" && Number.isFinite(v);
        return {
          ...current,
          avatarDataUrl: pick(
            "avatarDataUrl",
            (v) => typeof v === "string" && v.startsWith("data:image/"),
          ),
          avatarShape: pick("avatarShape", (v) => v === "rounded" || v === "circle"),
          wallpaperKind: pick(
            "wallpaperKind",
            (v) => v === "none" || v === "preset" || v === "image",
          ),
          wallpaperPresetId: pick(
            "wallpaperPresetId",
            (v) => typeof v === "string" && Boolean(findWallpaperPreset(v)),
          ),
          wallpaperAssetKey: pick("wallpaperAssetKey", (v) => typeof v === "string"),
          wallpaperBlur: clamp(pick("wallpaperBlur", isNum), 0, WALLPAPER_BLUR_MAX),
          wallpaperDim: clamp(pick("wallpaperDim", isNum), 0, WALLPAPER_DIM_MAX),
          wallpaperMotion: pick("wallpaperMotion", (v) => typeof v === "boolean"),
          coverBackdrops: pick("coverBackdrops", (v) => typeof v === "boolean"),
          accentId: pick(
            "accentId",
            (v) => typeof v === "string" && Boolean(findAccentPreset(v)),
          ),
          appFontId: pick(
            "appFontId",
            (v) => typeof v === "string" && Boolean(findAppFont(v)),
          ),
          lyricsFontId: pick(
            "lyricsFontId",
            (v) => typeof v === "string" && Boolean(findLyricsFont(v)),
          ),
          lyricsScale: clamp(pick("lyricsScale", isNum), LYRICS_SCALE_MIN, LYRICS_SCALE_MAX),
          performanceMode: pick("performanceMode", (v) => typeof v === "boolean"),
        };
      },
    },
  ),
);
