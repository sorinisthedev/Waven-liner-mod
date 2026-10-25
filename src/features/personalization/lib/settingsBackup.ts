import { debouncedStorage } from "@/shared/utils/storage";
import { getWallpaperAsset, putWallpaperAsset } from "./wallpaperAssets";
import { flushLocalData, loadLocalData, replaceLocalData } from "@/shared/local/localStore";

/** settings stores a backup carries; auth and caches are deliberately left out */
export const BACKUP_KEYS = [
  "liner_personalization_v1",
  "liner_sound_v1",
  "liner_alarm_v1",
  "liner_custom_theme_v1",
  "liner_pinned_playlists_v1",
  "liner_playlist_icons_v1",
  "liner_listening_log_v1",
  "liner_discord_settings_v1",
  "liner_overlay_settings_v1",
  "liner_shortcuts_settings_v1",
  "theme",
] as const;

interface BackupFile {
  app: "waven" | "liner2";
  version: 1;
  exportedAt: string;
  storage: Record<string, string>;
  /** custom wallpaper image as a data url, when one is set */
  wallpaper?: { key: string; dataUrl: string };
  /** likes, playlists, saved items and history kept on this PC */
  library?: unknown;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function createBackup(): Promise<Blob> {
  debouncedStorage.flush();
  const storage: Record<string, string> = {};
  for (const key of BACKUP_KEYS) {
    const value = localStorage.getItem(key);
    if (value !== null) storage[key] = value;
  }
  await flushLocalData().catch(() => {});
  const file: BackupFile = {
    app: "waven",
    version: 1,
    exportedAt: new Date().toISOString(),
    storage,
    library: await loadLocalData(),
  };
  try {
    const personalization = JSON.parse(storage.liner_personalization_v1 ?? "null");
    const key = personalization?.state?.wallpaperAssetKey;
    if (typeof key === "string") {
      const blob = await getWallpaperAsset(key);
      if (blob) file.wallpaper = { key, dataUrl: await blobToDataUrl(blob) };
    }
  } catch {
    // backup still works without the image
  }
  return new Blob([JSON.stringify(file)], { type: "application/json" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

/** writes a backup back into storage; the caller reloads the app afterwards */
export async function restoreBackup(text: string): Promise<void> {
  const parsed = JSON.parse(text) as Partial<BackupFile>;
  // backups made before the rename say "liner2", both are fine
  if ((parsed.app !== "waven" && parsed.app !== "liner2") || parsed.version !== 1 || !parsed.storage) {
    throw new Error("not a WAVEN backup");
  }
  const allowed = new Set<string>(BACKUP_KEYS);
  for (const [key, value] of Object.entries(parsed.storage)) {
    if (!allowed.has(key) || typeof value !== "string") continue;
    if (key !== "theme") JSON.parse(value); // reject corrupt store blobs up front
    localStorage.setItem(key, value);
  }
  if (parsed.library && typeof parsed.library === "object") await replaceLocalData(parsed.library);
  const wp = parsed.wallpaper;
  if (wp && typeof wp.key === "string" && typeof wp.dataUrl === "string" && wp.dataUrl.startsWith("data:image/")) {
    const blob = await (await fetch(wp.dataUrl)).blob();
    await putWallpaperAsset(wp.key, blob);
  }
}
