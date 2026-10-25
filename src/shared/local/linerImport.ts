import { getAuthSession } from "@/shared/api/auth-session";
import { remoteRequest } from "@/shared/api/api";
import type { ApiTrack, UserPlaylist, UserPlaylistItem } from "../contracts";
import { loadLocalData, mutateLocalData, type CollectionType } from "./localStore";

const DONE_KEY = "waven_liner_import_done";

/**
 * One-time copy of a Liner account library (likes, playlists, saved albums,
 * artists and playlists) onto this PC, for people who used Liner 2.0 signed
 * in. Runs only while the old session still works; returns what was copied.
 */
export async function importLinerLibraryOnce(): Promise<{ likes: number; playlists: number } | null> {
  try {
    if (localStorage.getItem(DONE_KEY)) return null;
  } catch {
    return null;
  }
  if (!getAuthSession()?.accessToken) return null;
  const local = await loadLocalData();
  if (local.likes.length || local.playlists.length) {
    localStorage.setItem(DONE_KEY, "skipped");
    return null;
  }

  const likes: { track: ApiTrack; likedAt: string }[] = [];
  let cursor: string | null = null;
  do {
    const page: { items: { track: ApiTrack; likedAt: string }[]; nextCursor: string | null } =
      await remoteRequest(`/v1/me/library/tracks?limit=200${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
    likes.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor && likes.length < 20000);

  const { items: playlistList } = await remoteRequest<{ items: UserPlaylist[] }>("/v1/me/playlists");
  const playlists: { playlist: UserPlaylist; items: UserPlaylistItem[] }[] = [];
  for (const p of playlistList) {
    try {
      playlists.push(await remoteRequest(`/v1/me/playlists/${encodeURIComponent(p.id)}`));
    } catch {
      playlists.push({ playlist: p, items: [] });
    }
  }

  const collections: Partial<Record<CollectionType, { id: string; snapshot: Record<string, unknown>; savedAt: string }[]>> = {};
  for (const type of ["albums", "artists", "playlists"] as const) {
    try {
      const { items } = await remoteRequest<{ items: Record<string, unknown>[] }>(`/v1/me/library/${type}`);
      const key = type.slice(0, -1);
      collections[type] = items.flatMap((entry) => {
        const value = entry[key] as Record<string, unknown> | undefined;
        if (!value || typeof value.id !== "string") return [];
        return [{ id: value.id, snapshot: value, savedAt: String(entry.savedAt ?? new Date().toISOString()) }];
      });
    } catch {
      // keep going with what we have
    }
  }

  await mutateLocalData((data) => {
    data.likes = likes;
    data.playlists = playlists.map(({ playlist, items }) => ({
      playlist: { ...playlist, revision: playlist.revision ?? 1 },
      items,
    }));
    for (const type of ["albums", "artists", "playlists"] as const) {
      if (collections[type]) data.collections[type] = collections[type]!;
    }
  });
  localStorage.setItem(DONE_KEY, new Date().toISOString());
  return { likes: likes.length, playlists: playlists.length };
}
