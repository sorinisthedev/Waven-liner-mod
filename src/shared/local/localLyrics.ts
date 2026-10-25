import type { LyricsCandidate, LyricsStreamEvent } from "../contracts";

// lyrics without Liner's servers: LRCLIB is a free, open lyrics database with
// line-synced lyrics for most popular songs (https://lrclib.net)

const LRCLIB = "https://lrclib.net/api";
const PROVIDER = "lrclib";

interface LrclibRecord {
  trackName?: string;
  artistName?: string;
  duration?: number;
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T | null> {
  const res = await fetch(url, { signal, headers: { "Lrclib-Client": "WAVEN (personal desktop player)" } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`lrclib ${res.status}`);
  return (await res.json()) as T;
}

function toCandidate(rec: LrclibRecord): LyricsCandidate | null {
  const synced = rec.syncedLyrics?.trim();
  const plain = rec.plainLyrics?.trim();
  if (!synced && !plain) return null;
  return {
    provider: PROVIDER,
    matchedTrack: {
      title: rec.trackName,
      artists: rec.artistName ? [rec.artistName] : undefined,
      durationMs: rec.duration ? Math.round(rec.duration * 1000) : undefined,
    },
    lyrics: synced ? { format: "lrc", content: synced } : { format: "plain", content: plain! },
    syncHint: synced ? "line_synced" : "plain",
    contentKind: synced ? "line_synced" : "plain",
    syncLevel: synced ? "line_level" : "plain",
    quality: {
      total: synced ? 80 : 50,
      match: 80,
      content: 80,
      sync: synced ? 70 : 0,
      source: 60,
      reasons: ["lrclib"],
    },
  };
}

async function findRecord(
  title: string,
  artist: string,
  durationMs: number | undefined,
  signal?: AbortSignal,
): Promise<LrclibRecord | null> {
  const params = new URLSearchParams({ track_name: title, artist_name: artist });
  if (durationMs && durationMs > 0) params.set("duration", String(Math.round(durationMs / 1000)));
  const exact = await fetchJson<LrclibRecord>(`${LRCLIB}/get?${params}`, signal).catch((err) => {
    if (signal?.aborted) throw err;
    return null;
  });
  if (exact && (exact.syncedLyrics || exact.plainLyrics)) return exact;

  // fuzzy fallback: closest duration among search hits, synced preferred
  const search = new URLSearchParams({ track_name: title, artist_name: artist });
  const hits = (await fetchJson<LrclibRecord[]>(`${LRCLIB}/search?${search}`, signal)) ?? [];
  const usable = hits.filter((h) => h.syncedLyrics || h.plainLyrics);
  if (!usable.length) return null;
  const target = durationMs ? durationMs / 1000 : undefined;
  usable.sort((a, b) => {
    const sync = Number(Boolean(b.syncedLyrics)) - Number(Boolean(a.syncedLyrics));
    if (sync !== 0) return sync;
    if (!target) return 0;
    return Math.abs((a.duration ?? 0) - target) - Math.abs((b.duration ?? 0) - target);
  });
  const best = usable[0];
  // a song more than 15 s off is probably a different version
  if (target && best.duration && Math.abs(best.duration - target) > 15) return null;
  return best;
}

/** same event stream the app used to get from Liner's lyrics endpoint */
export async function* localLyricsStream(
  hint: { title: string; artist: string; durationMs?: number } | undefined,
  signal?: AbortSignal,
): AsyncGenerator<LyricsStreamEvent> {
  if (!hint?.title.trim() || !hint.artist.trim()) {
    yield { type: "done", cached: false, status: "not_found" };
    return;
  }
  const started = performance.now();
  // first credited artist matches LRCLIB far more often than the joined list
  const artist = hint.artist.split(/,|&| feat\.| ft\./i)[0].trim() || hint.artist;
  try {
    const record = await findRecord(hint.title.trim(), artist, hint.durationMs, signal);
    const candidate = record && !record.instrumental ? toCandidate(record) : null;
    const elapsed = Math.round(performance.now() - started);
    if (!candidate) {
      yield { type: "provider", provider: PROVIDER, status: "not_found", durationMs: elapsed };
      yield { type: "done", cached: false, status: "not_found" };
      return;
    }
    yield {
      type: "provider",
      provider: PROVIDER,
      status: "found",
      syncLevel: candidate.syncLevel,
      candidate,
      durationMs: elapsed,
    };
    yield {
      type: "done",
      cached: false,
      best: { provider: PROVIDER, quality: candidate.quality.total, syncLevel: candidate.syncLevel },
    };
  } catch (err) {
    if (signal?.aborted) throw err;
    yield { type: "provider", provider: PROVIDER, status: "error", message: String(err) };
    yield { type: "done", cached: false, status: "not_found" };
  }
}
