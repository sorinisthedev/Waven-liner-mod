import { innertubeCatalog } from "@/shared/youtube";
import type {
  ApiTrack,
  DailyMixItem,
  DailyMixesResponse,
  MostSavedResponse,
  MostSavedType,
  PopularAlbumsResponse,
  PopularTimeWindow,
  PopularTracksResponse,
  Track,
} from "../contracts";
import { loadLocalData } from "./localStore";

// home page data without Liner's servers: charts come from YouTube Music,
// mixes are built from what you play on this PC

const CHART_CACHE_KEY = "waven_home_chart_v1";
const MIX_CACHE_KEY = "waven_home_mixes_v1";
const CHART_TTL = 6 * 60 * 60 * 1000;
const MIX_TTL = 12 * 60 * 60 * 1000;

interface Cached<T> {
  at: number;
  data: T;
}

function readCache<T>(key: string, ttl: number): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached<T>;
    return Date.now() - parsed.at < ttl ? parsed.data : null;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
  } catch {
    // storage full, home still works, just refetches
  }
}

const CHART_QUERIES = ["Top 100 Songs Global", "Top songs this week", "Today's top hits"];

let chartRequest: Promise<ApiTrack[]> | null = null;

/** the current global chart from YouTube Music, cached for a few hours */
export async function getChartTracks(): Promise<ApiTrack[]> {
  const cached = readCache<ApiTrack[]>(CHART_CACHE_KEY, CHART_TTL);
  if (cached?.length) return cached;
  if (chartRequest) return chartRequest;
  chartRequest = (async (): Promise<ApiTrack[]> => {
    for (const query of CHART_QUERIES) {
      try {
        const results = await innertubeCatalog.search(query, "playlist");
        const playlist = results.find((r) => r.type === "playlist");
        if (!playlist) continue;
        const details = await innertubeCatalog.getPlaylist(playlist.id);
        if (details.tracks.length >= 10) {
          writeCache(CHART_CACHE_KEY, details.tracks);
          return details.tracks;
        }
      } catch {
        // try the next query
      }
    }
    // last resort: plain song search
    const songs = await innertubeCatalog.search("top hits", "track").catch(() => []);
    const tracks: ApiTrack[] = songs.flatMap((s) => (s.type === "track" ? [s as ApiTrack] : []));
    if (tracks.length) writeCache(CHART_CACHE_KEY, tracks);
    return tracks;
  })().finally(() => {
    chartRequest = null;
  });
  return chartRequest;
}

export async function localPopularTracks(
  window: PopularTimeWindow,
  limit: number,
): Promise<PopularTracksResponse> {
  const tracks = (await getChartTracks()).slice(0, limit);
  return {
    window,
    generatedAt: new Date().toISOString(),
    items: tracks.map((track, i) => ({
      rank: i + 1,
      track,
      playCount: 0,
      uniqueListeners: 0,
      score: tracks.length - i,
    })),
  };
}

export async function localPopularAlbums(
  window: PopularTimeWindow,
  limit: number,
): Promise<PopularAlbumsResponse> {
  const seen = new Set<string>();
  const items: PopularAlbumsResponse["items"] = [];
  for (const track of await getChartTracks()) {
    if (!track.album?.id || seen.has(track.album.id)) continue;
    seen.add(track.album.id);
    items.push({
      id: track.album.id,
      title: track.album.title,
      artist: track.artists.map((a) => a.name).join(", "),
      coverUrl: track.cover?.url ?? null,
      playCount: 0,
      uniqueListeners: 0,
      trackCount: 0,
      score: 0,
    });
    if (items.length >= limit) break;
  }
  return { window, items };
}

/** "most saved" becomes the albums and playlists you saved most recently */
export async function localMostSaved(type: MostSavedType, limit: number): Promise<MostSavedResponse> {
  const data = await loadLocalData();
  const entries: MostSavedResponse["items"] = [];
  if (type !== "playlist") {
    for (const c of data.collections.albums) {
      const s = c.snapshot as { title?: string; artist?: string; cover?: { url?: string } };
      entries.push({ type: "album", id: c.id, title: s.title ?? "Album", subtitle: s.artist ?? "", coverUrl: s.cover?.url ?? null, saves: 1 });
    }
  }
  if (type !== "album") {
    for (const c of data.collections.playlists) {
      const s = c.snapshot as { title?: string; author?: string; cover?: { url?: string } };
      entries.push({ type: "playlist", id: c.id, title: s.title ?? "Playlist", subtitle: s.author ?? "", coverUrl: s.cover?.url ?? null, saves: 1 });
    }
  }
  return { type, items: entries.slice(0, limit) };
}

function primaryArtist(track: Track): string {
  return track.artists[0]?.name?.trim() ?? "";
}

/** up to four mixes seeded by your most played artists, or the chart if you're new */
export async function localDailyMixes(): Promise<DailyMixesResponse> {
  const cached = readCache<DailyMixesResponse>(MIX_CACHE_KEY, MIX_TTL);
  if (cached?.items.length) return cached;

  const data = await loadLocalData();
  const byArtist = new Map<string, { count: number; track: Track }>();
  for (const h of data.history) {
    const name = primaryArtist(h.track);
    if (!name) continue;
    const entry = byArtist.get(name.toLowerCase());
    if (entry) entry.count += 1;
    else byArtist.set(name.toLowerCase(), { count: 1, track: h.track });
  }
  for (const like of data.likes) {
    const name = primaryArtist(like.track);
    if (!name) continue;
    const entry = byArtist.get(name.toLowerCase());
    if (entry) entry.count += 2;
    else byArtist.set(name.toLowerCase(), { count: 2, track: like.track });
  }
  let seeds = [...byArtist.values()].sort((a, b) => b.count - a.count).slice(0, 4).map((e) => e.track);
  if (seeds.length === 0) seeds = (await getChartTracks().catch(() => [])).slice(0, 3);

  const items: DailyMixItem[] = [];
  for (const [i, seed] of seeds.entries()) {
    try {
      const radio = await innertubeCatalog.getRadio(seed.id, { k: 30 });
      const tracks = radio.items.slice(0, 30) as Track[];
      if (tracks.length < 5) continue;
      const artists = [...new Set(tracks.map(primaryArtist).filter(Boolean))].slice(0, 4);
      items.push({
        id: `waven-mix-${i + 1}`,
        title: `Daily Mix ${i + 1}`,
        description: artists.join(", "),
        clusterArtists: artists,
        cover: tracks[0]?.cover,
        trackCount: tracks.length,
        tracks,
      });
    } catch {
      // skip a seed that has no radio
    }
  }
  const response = { items, generatedAt: new Date().toISOString() };
  if (items.length) writeCache(MIX_CACHE_KEY, response);
  return response;
}
