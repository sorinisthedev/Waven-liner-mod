import { ApiError } from "@/shared/api/api";
import type {
  ApiTrack,
  PlaybackHistoryItem,
  RecordPlaybackEventRequest,
  UserPlaylist,
  UserPlaylistItem,
} from "../contracts";
import type { AuthUser } from "../contracts/auth";
import {
  MAX_HISTORY,
  loadLocalData,
  mutateLocalData,
  type CollectionType,
  type LocalData,
  type LocalPlaylist,
} from "./localStore";
import { localDailyMixes, localMostSaved, localPopularAlbums, localPopularTracks } from "./localHome";

/**
 * Stands in for Liner's servers. It answers the same /v1 requests with the same
 * response shapes, but reads and writes data stored on this PC, so the rest of
 * the app works unchanged with no account.
 */

export const LOCAL_USER_ID = "local";

export function localUser(data: LocalData): AuthUser {
  return {
    id: LOCAL_USER_ID,
    username: "you",
    displayName: data.profile.displayName,
    bio: data.profile.bio,
    avatarUrl: null,
    isPublic: false,
  };
}

const now = () => new Date().toISOString();
const newId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

function notFound(what = "Not found"): never {
  throw new ApiError(404, what);
}

function parseBody(init?: RequestInit): Record<string, unknown> {
  if (!init?.body || typeof init.body !== "string") return {};
  try {
    return JSON.parse(init.body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** tracks arrive in a few shapes (snapshot, catalog track); keep the api shape */
function cleanTrack(raw: unknown, fallbackId: string): ApiTrack {
  const t = (raw ?? {}) as Partial<ApiTrack> & { artists?: unknown };
  const artists = Array.isArray(t.artists)
    ? (t.artists as unknown[]).map((a) =>
        typeof a === "string"
          ? { id: "", name: a }
          : { id: String((a as { id?: string })?.id ?? ""), name: String((a as { name?: string })?.name ?? "") },
      )
    : typeof t.artists === "string"
      ? (t.artists as string).split(/,\s*/).map((name) => ({ id: "", name }))
      : [];
  return {
    id: typeof t.id === "string" && t.id ? t.id : fallbackId,
    title: typeof t.title === "string" && t.title ? t.title : "Unknown song",
    artists,
    durationMs: typeof t.durationMs === "number" ? t.durationMs : 0,
    ...(t.album?.id ? { album: { id: String(t.album.id), title: String(t.album.title ?? "") } } : {}),
    ...(t.cover?.url ? { cover: t.cover } : {}),
    ...(typeof t.explicit === "boolean" ? { explicit: t.explicit } : {}),
  };
}

function playlistResponse(p: LocalPlaylist) {
  return {
    playlist: p.playlist,
    items: p.items.map((item, position) => ({ ...item, position })),
  };
}

function findPlaylist(data: LocalData, id: string): LocalPlaylist {
  return data.playlists.find((p) => p.playlist.id === id) ?? notFound("Playlist not found");
}

function touch(p: LocalPlaylist) {
  p.playlist.updatedAt = now();
  p.playlist.revision += 1;
}

function makeItem(track: ApiTrack): UserPlaylistItem {
  return { id: newId("pi"), track, position: 0, addedAt: now() };
}

function page<T>(items: T[], params: URLSearchParams, defaultLimit: number) {
  const limit = Math.max(1, Math.min(1000, Number(params.get("limit")) || defaultLimit));
  const offset = Math.max(0, Number(params.get("cursor")) || 0);
  const slice = items.slice(offset, offset + limit);
  const next = offset + limit < items.length ? String(offset + limit) : null;
  return { slice, next };
}

const SINGULAR: Record<CollectionType, string> = {
  albums: "album",
  artists: "artist",
  playlists: "playlist",
};

function emitLibraryChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("library:changed"));
}

export async function handleLocalRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const url = new URL(path, "http://local");
  const params = url.searchParams;
  const seg = url.pathname.replace(/^\/v1\//, "").split("/").map(decodeURIComponent);
  const body = parseBody(init);
  const result = await route(method, seg, params, body);
  return result as T;
}

async function route(
  method: string,
  seg: string[],
  params: URLSearchParams,
  body: Record<string, unknown>,
): Promise<unknown> {
  const [a, b, c, d, e, f] = seg;

  // ── profile ──────────────────────────────────────────────────────────────
  if (a === "me" && !b && method === "GET") return localUser(await loadLocalData());
  if (a === "users" && b === "me" && method === "PATCH") {
    return mutateLocalData((data) => {
      if ("displayName" in body) {
        const name = typeof body.displayName === "string" ? body.displayName.trim().slice(0, 48) : "";
        data.profile.displayName = name || null;
      }
      if ("bio" in body) data.profile.bio = typeof body.bio === "string" ? body.bio : null;
      return localUser(data);
    });
  }

  // ── liked songs ──────────────────────────────────────────────────────────
  if (a === "me" && b === "library" && c === "tracks") {
    if (!d && method === "GET") {
      const data = await loadLocalData();
      const { slice, next } = page(data.likes, params, 100);
      return { items: slice, nextCursor: next };
    }
    if (d && method === "PUT") {
      await mutateLocalData((data) => {
        if (data.likes.some((l) => l.track.id === d)) return;
        data.likes.unshift({ track: cleanTrack(body.track ?? body.trackSnapshot, d), likedAt: now() });
      });
      return undefined;
    }
    if (d && method === "DELETE") {
      await mutateLocalData((data) => {
        data.likes = data.likes.filter((l) => l.track.id !== d);
      });
      return undefined;
    }
  }

  // ── saved albums / artists / playlists ──────────────────────────────────
  if (a === "me" && b === "library" && (c === "albums" || c === "artists" || c === "playlists")) {
    const type = c as CollectionType;
    if (!d && method === "GET") {
      const data = await loadLocalData();
      return {
        items: data.collections[type].map((col) => ({
          [SINGULAR[type]]: { ...col.snapshot, id: col.id },
          savedAt: col.savedAt,
        })),
      };
    }
    if (d && method === "PUT") {
      await mutateLocalData((data) => {
        const list = data.collections[type];
        const snapshot = (body.snapshot as Record<string, unknown>) ?? {};
        const existing = list.find((x) => x.id === d);
        if (existing) existing.snapshot = { ...existing.snapshot, ...snapshot };
        else list.unshift({ id: d, snapshot, savedAt: now() });
      });
      return undefined;
    }
    if (d && method === "DELETE") {
      await mutateLocalData((data) => {
        data.collections[type] = data.collections[type].filter((x) => x.id !== d);
      });
      return undefined;
    }
  }

  // ── your playlists ───────────────────────────────────────────────────────
  if (a === "me" && b === "playlists") {
    if (!c && method === "GET") {
      const data = await loadLocalData();
      return { items: data.playlists.map((p) => p.playlist) };
    }
    if (!c && method === "POST") {
      return mutateLocalData((data) => {
        const user = localUser(data);
        const playlist: UserPlaylist = {
          id: newId("pl"),
          title: typeof body.title === "string" && body.title.trim() ? body.title.trim().slice(0, 120) : "New playlist",
          description: typeof body.description === "string" ? body.description : undefined,
          isPublic: false,
          createdAt: now(),
          updatedAt: now(),
          revision: 1,
          ownerId: user.id,
          owner: { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: null },
        };
        data.playlists.unshift({ playlist, items: [] });
        return playlist;
      });
    }
    if (c && !d) {
      if (method === "GET") return playlistResponse(findPlaylist(await loadLocalData(), c));
      if (method === "PATCH") {
        return mutateLocalData((data) => {
          const p = findPlaylist(data, c);
          if (typeof body.title === "string" && body.title.trim()) p.playlist.title = body.title.trim().slice(0, 120);
          if ("description" in body)
            p.playlist.description = typeof body.description === "string" ? body.description : undefined;
          touch(p);
          return p.playlist;
        });
      }
      if (method === "DELETE") {
        await mutateLocalData((data) => {
          data.playlists = data.playlists.filter((p) => p.playlist.id !== c);
        });
        return undefined;
      }
    }
    // add one song: POST /me/playlists/:id/tracks/:trackId
    if (c && d === "tracks" && e && method === "POST") {
      return mutateLocalData((data) => {
        const p = findPlaylist(data, c);
        const item = makeItem(cleanTrack(body.track ?? body.trackSnapshot, e));
        p.items.push(item);
        touch(p);
        return { ...item, position: p.items.length - 1 };
      });
    }
    // add many: POST /me/playlists/:id/tracks
    if (c && d === "tracks" && !e && method === "POST") {
      return mutateLocalData((data) => {
        const p = findPlaylist(data, c);
        const incoming = Array.isArray(body.tracks) ? body.tracks : [];
        const added: UserPlaylistItem[] = [];
        let rejected = 0;
        for (const raw of incoming) {
          const id = (raw as { id?: unknown })?.id;
          if (typeof id !== "string" || !id) {
            rejected += 1;
            continue;
          }
          const item = makeItem(cleanTrack(raw, id));
          p.items.push(item);
          added.push(item);
        }
        if (added.length) touch(p);
        return { items: added, added: added.length, rejected };
      });
    }
    if (c && d === "items" && e && !f && method === "DELETE") {
      await mutateLocalData((data) => {
        const p = findPlaylist(data, c);
        p.items = p.items.filter((i) => i.id !== e);
        touch(p);
      });
      return undefined;
    }
    if (c && d === "items" && e && f === "move" && method === "POST") {
      return mutateLocalData((data) => {
        const p = findPlaylist(data, c);
        const from = p.items.findIndex((i) => i.id === e);
        if (from === -1) notFound("Item not found");
        const [item] = p.items.splice(from, 1);
        const before = typeof body.beforeItemId === "string" ? body.beforeItemId : null;
        const to = before ? p.items.findIndex((i) => i.id === before) : -1;
        if (to === -1) p.items.push(item);
        else p.items.splice(to, 0, item);
        touch(p);
        return playlistResponse(p);
      });
    }
  }

  // ── play history ─────────────────────────────────────────────────────────
  if (a === "me" && b === "playback" && c === "events" && method === "POST") {
    const ev = body as unknown as RecordPlaybackEventRequest;
    if (!ev?.trackId) return undefined;
    await mutateLocalData((data) => {
      const item: PlaybackHistoryItem = {
        id: newId("h"),
        playbackSessionId: String(ev.playbackSessionId ?? ""),
        listeningSessionId: String(ev.listeningSessionId ?? ""),
        track: cleanTrack(ev.trackSnapshot, ev.trackId),
        playedDurationMs: Number(ev.playedDurationMs) || 0,
        completionRate: Number(ev.completionRate) || 0,
        completed: Boolean(ev.completed),
        skipped: Boolean(ev.skipped),
        loopCount: Number(ev.loopCount) || 0,
        hasSeekBackward: Boolean(ev.hasSeekBackward),
        context: ev.context,
        listenedAt: now(),
      };
      data.history.unshift(item);
      if (data.history.length > MAX_HISTORY) data.history.length = MAX_HISTORY;
    });
    return undefined;
  }
  if (a === "me" && b === "history" && method === "GET") {
    const data = await loadLocalData();
    const { slice, next } = page(data.history, params, 30);
    return { items: slice, nextCursor: next };
  }

  // ── home page ────────────────────────────────────────────────────────────
  if (a === "explore" && b === "popular" && !c) {
    return localPopularTracks((params.get("window") as never) ?? "7d", Number(params.get("limit")) || 50);
  }
  if (a === "explore" && b === "popular" && c === "albums") {
    return localPopularAlbums((params.get("window") as never) ?? "7d", Number(params.get("limit")) || 20);
  }
  if (a === "explore" && b === "most-saved") {
    return localMostSaved((params.get("type") as never) ?? "all", Number(params.get("limit")) || 20);
  }
  if (a === "me" && b === "recommendations" && c === "daily-mixes") return localDailyMixes();

  // ── social features need accounts; with none they're simply empty ───────
  if (a === "users" && b === "search") return [];
  if (a === "users" && (c === "followers" || c === "following")) return [];
  if (a === "users" && c === "playlists") return { items: [] };
  if (a === "users" && c === "history") return { items: [], nextCursor: null };
  if (a === "leaderboards") {
    return { type: b === "artist" ? "artist" : "global", targetId: c ?? "", period: params.get("period") ?? "weekly", entries: [], updatedAt: now() };
  }
  if (a === "presence") return undefined;

  // anything else (catalog fallbacks, auth, users by id) has no local source
  notFound();
}
