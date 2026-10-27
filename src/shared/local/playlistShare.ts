import { api } from "@/shared/api/api";
import { SHARE_BASE_URL } from "@/shared/utils/share";
import type { Track as ApiTrack } from "../contracts";

/**
 * Playlists shared without a server: the song ids travel inside the link
 * (compressed), or inside a small .wavenplaylist file for very big playlists.
 * Importing looks every song up again on YouTube Music / SoundCloud.
 */

export interface SharedPlaylist {
  title: string;
  ids: string[];
}

export const MAX_SHARED_TRACKS = 3000;
/** Discord drops messages over 2000 characters, links longer than this get a file instead */
export const DISCORD_SAFE_LINK_LENGTH = 1900;
const VERSION_PREFIX = "1.";

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const SC_ID = /^sc[:_]\d{1,20}$/i;

/** only ids someone else can play: youtube and soundcloud, never local files */
export function isShareableTrackId(id: string): boolean {
  const bare = id.replace(/^yt:/, "");
  return YT_ID.test(bare) || SC_ID.test(id);
}

function normalizeId(id: string): string {
  return id.replace(/^yt:/, "");
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const input = new ReadableStream<BufferSource>({
    start(controller) {
      controller.enqueue(bytes as Uint8Array<ArrayBuffer>);
      controller.close();
    },
  });
  return new Uint8Array(await new Response(input.pipeThrough(stream)).arrayBuffer());
}

function validate(raw: unknown): SharedPlaylist {
  const r = raw as { t?: unknown; i?: unknown };
  const title = typeof r?.t === "string" && r.t.trim() ? r.t.trim().slice(0, 120) : "Shared playlist";
  const ids = Array.isArray(r?.i)
    ? (r.i as unknown[]).filter((x): x is string => typeof x === "string" && isShareableTrackId(x)).slice(0, MAX_SHARED_TRACKS)
    : [];
  if (!ids.length) throw new Error("This playlist link is empty or broken.");
  return { title, ids };
}

export async function encodeSharedPlaylist(p: SharedPlaylist): Promise<string> {
  const payload = JSON.stringify({ t: p.title.slice(0, 120), i: p.ids.map(normalizeId).slice(0, MAX_SHARED_TRACKS) });
  const packed = await pipe(new TextEncoder().encode(payload), new CompressionStream("deflate-raw"));
  return VERSION_PREFIX + toBase64Url(packed);
}

export async function decodeSharedPlaylist(data: string): Promise<SharedPlaylist> {
  if (!data.startsWith(VERSION_PREFIX)) throw new Error("This playlist link is from a newer WAVEN.");
  const bytes = await pipe(fromBase64Url(data.slice(VERSION_PREFIX.length)), new DecompressionStream("deflate-raw"));
  return validate(JSON.parse(new TextDecoder().decode(bytes)));
}

export function playlistShareUrl(encoded: string): string {
  return `${SHARE_BASE_URL}/?${new URLSearchParams({ type: "import", d: encoded })}`;
}

export function playlistFileContents(p: SharedPlaylist): string {
  return JSON.stringify({ app: "waven", kind: "playlist", version: 1, t: p.title, i: p.ids.map(normalizeId) }, null, 1);
}

export function parsePlaylistFile(text: string): SharedPlaylist {
  const raw = JSON.parse(text) as { app?: unknown; kind?: unknown };
  if (raw?.app !== "waven" || raw?.kind !== "playlist") throw new Error("That file isn't a WAVEN playlist.");
  return validate(raw);
}

/** creates the playlist locally and fills it, looking each song up again */
export async function importSharedPlaylist(
  p: SharedPlaylist,
  onProgress?: (done: number, total: number) => void,
): Promise<{ playlistId: string; added: number; failed: number }> {
  const playlist = await api.createPlaylist({ title: p.title });
  const tracks: (ApiTrack | null)[] = new Array(p.ids.length).fill(null);
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < p.ids.length) {
      const index = next++;
      try {
        tracks[index] = await api.getTrack(p.ids[index]);
      } catch {
        tracks[index] = null;
      }
      done += 1;
      onProgress?.(done, p.ids.length);
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  const found = tracks.filter((t): t is ApiTrack => Boolean(t));
  for (let i = 0; i < found.length; i += 200) {
    await api.addPlaylistTrackSnapshots(playlist.id, found.slice(i, i + 200));
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event("library:changed"));
  return { playlistId: playlist.id, added: found.length, failed: p.ids.length - found.length };
}
