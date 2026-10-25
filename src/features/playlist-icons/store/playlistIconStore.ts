import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { debouncedStorage } from "@/shared/utils/storage";

export type PlaylistIcon =
  | { kind: "emoji"; emoji: string; color: string }
  | { kind: "image"; dataUrl: string };

export const ICON_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#3f3f46",
] as const;

export const ICON_EMOJIS = [
  "🎵", "🎶", "🎧", "🎤", "🎸", "🥁", "🎹", "🎺", "🎷", "🎻",
  "🔥", "💜", "❤️", "💔", "✨", "⭐", "🌙", "☀️", "🌈", "🌊",
  "🌴", "🌸", "🍂", "❄️", "🚗", "✈️", "🏋️", "🏃", "🧘", "📚",
  "💤", "☕", "🍕", "🎉", "🎮", "👑", "💎", "🚀", "👻", "😎",
] as const;

const HEX = /^#[0-9a-f]{6}$/i;
/** keeps local storage in check: icons are small but not free */
export const MAX_IMAGE_ICONS = 60;

function isValidIcon(v: unknown): v is PlaylistIcon {
  const i = v as PlaylistIcon;
  if (!i || typeof i !== "object") return false;
  if (i.kind === "emoji") return typeof i.emoji === "string" && i.emoji.length <= 16 && HEX.test(i.color);
  if (i.kind === "image") return typeof i.dataUrl === "string" && i.dataUrl.startsWith("data:image/");
  return false;
}

interface PlaylistIconState {
  icons: Record<string, PlaylistIcon>;
  setIcon: (playlistId: string, icon: PlaylistIcon) => void;
  removeIcon: (playlistId: string) => void;
}

export const usePlaylistIconStore = create<PlaylistIconState>()(
  persist(
    (set) => ({
      icons: {},
      setIcon: (playlistId, icon) =>
        set((s) => {
          if (!isValidIcon(icon)) return s;
          const icons = { ...s.icons, [playlistId]: icon };
          // drop the oldest image icons past the cap
          const images = Object.keys(icons).filter((k) => icons[k].kind === "image");
          for (const k of images.slice(0, Math.max(0, images.length - MAX_IMAGE_ICONS))) delete icons[k];
          return { icons };
        }),
      removeIcon: (playlistId) =>
        set((s) => {
          if (!(playlistId in s.icons)) return s;
          const icons = { ...s.icons };
          delete icons[playlistId];
          return { icons };
        }),
    }),
    {
      name: "liner_playlist_icons_v1",
      storage: createJSONStorage(() => debouncedStorage),
      partialize: (s) => ({ icons: s.icons }),
      merge: (persisted, current) => {
        const raw = (persisted as { icons?: unknown })?.icons;
        const icons: Record<string, PlaylistIcon> = {};
        if (raw && typeof raw === "object") {
          for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
            if (isValidIcon(v)) icons[k] = v;
          }
        }
        return { ...current, icons };
      },
    },
  ),
);
