import type { Track } from "@/shared/types";
import type { ListenEntry } from "../store/listeningLogStore";

export type StatsRange = "week" | "month" | "year" | "all";

export const RANGE_DAYS: Record<StatsRange, number | null> = {
  week: 7,
  month: 30,
  year: 365,
  all: null,
};

export interface TopTrack {
  track: Track;
  plays: number;
  ms: number;
}

export interface TopArtist {
  name: string;
  plays: number;
  ms: number;
  coverUrl: string;
}

export interface ListeningStats {
  totalMs: number;
  plays: number;
  uniqueTracks: number;
  uniqueArtists: number;
  topTracks: TopTrack[];
  topArtists: TopArtist[];
  /** listened ms per local hour 0..23 */
  byHour: number[];
}

/** first credited artist, the log stores the joined display string */
export function primaryArtist(artists: string): string {
  return artists.split(/,|&| feat\.| ft\.| x /i)[0]?.trim() || artists.trim();
}

export function filterRange(entries: ListenEntry[], range: StatsRange, now = Date.now()) {
  const days = RANGE_DAYS[range];
  if (days === null) return entries;
  const since = now - days * 86_400_000;
  return entries.filter((e) => e.at >= since);
}

export function computeStats(entries: ListenEntry[], limit = 10): ListeningStats {
  const tracks = new Map<string, TopTrack>();
  const artists = new Map<string, TopArtist>();
  const byHour = Array.from({ length: 24 }, () => 0);
  let totalMs = 0;

  for (const e of entries) {
    totalMs += e.ms;
    byHour[new Date(e.at).getHours()] += e.ms;

    const t = tracks.get(e.track.id);
    if (t) {
      t.plays += 1;
      t.ms += e.ms;
    } else {
      tracks.set(e.track.id, { track: e.track, plays: 1, ms: e.ms });
    }

    const name = primaryArtist(e.track.artists);
    if (!name) continue;
    const key = name.toLowerCase();
    const a = artists.get(key);
    if (a) {
      a.plays += 1;
      a.ms += e.ms;
    } else {
      artists.set(key, { name, plays: 1, ms: e.ms, coverUrl: e.track.coverUrl });
    }
  }

  const byPlays = <T extends { plays: number; ms: number }>(a: T, b: T) =>
    b.plays - a.plays || b.ms - a.ms;

  return {
    totalMs,
    plays: entries.length,
    uniqueTracks: tracks.size,
    uniqueArtists: artists.size,
    topTracks: [...tracks.values()].sort(byPlays).slice(0, limit),
    topArtists: [...artists.values()].sort(byPlays).slice(0, limit),
    byHour,
  };
}

export function formatMinutes(ms: number): string {
  return Math.round(ms / 60_000).toLocaleString();
}
