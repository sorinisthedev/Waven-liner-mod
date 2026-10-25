import type { Track } from "@/shared/types";
import type { ApiTrack } from "../contracts";

// ids and urls for songs that live in your own music folders

const PREFIX = "local:";

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): string {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export const isLocalTrackId = (id: string | null | undefined): boolean => Boolean(id?.startsWith(PREFIX));
export const toLocalTrackId = (filePath: string) => `${PREFIX}${toBase64Url(filePath)}`;
export const localTrackPath = (id: string) => fromBase64Url(id.slice(PREFIX.length));
export const localFileUrl = (filePath: string) => `waven-media://file/${toBase64Url(filePath)}`;
export const localCoverUrl = (filePath: string) => `waven-media://cover/${toBase64Url(filePath)}`;

export interface LocalTrackInfo {
  path: string;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  hasCover: boolean;
}

export function toClientLocalTrack(info: LocalTrackInfo): Track {
  return {
    id: toLocalTrackId(info.path),
    title: info.title,
    artists: info.artist,
    coverUrl: info.hasCover ? localCoverUrl(info.path) : "",
    durationMs: info.durationMs,
    playCount: 0,
    ...(info.album ? { album: { id: "", title: info.album } } : {}),
  };
}

// latest scan, so likes and playlists can snapshot a local song by id
const registry = new Map<string, LocalTrackInfo>();

export function registerLocalTracks(infos: LocalTrackInfo[]) {
  registry.clear();
  for (const info of infos) registry.set(toLocalTrackId(info.path), info);
}

export function localApiTrack(id: string): ApiTrack | undefined {
  const info = registry.get(id);
  if (!info) return undefined;
  return {
    id,
    title: info.title,
    artists: info.artist.split(/,\s*|\s+&\s+/).map((name) => ({ id: "", name })),
    durationMs: info.durationMs,
    ...(info.album ? { album: { id: "", title: info.album } } : {}),
    ...(info.hasCover ? { cover: { url: localCoverUrl(info.path), width: 0, height: 0 } } : {}),
  };
}

export function localMimeType(filePath: string): string {
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  return (
    { ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".aac": "audio/aac", ".flac": "audio/flac", ".wav": "audio/wav", ".webm": "audio/webm" }[ext] ??
    "audio/ogg"
  );
}
