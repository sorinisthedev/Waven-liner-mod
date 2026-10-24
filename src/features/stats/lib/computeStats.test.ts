import { describe, it, expect } from "vitest";
import { computeStats, filterRange, primaryArtist } from "./computeStats";
import { countsAsListen, type ListenEntry } from "../store/listeningLogStore";

const track = (id: string, artists: string) => ({
  id,
  title: `Song ${id}`,
  artists,
  coverUrl: "",
  durationMs: 200_000,
  playCount: 0,
});

const entry = (id: string, artists: string, at: number, ms = 60_000): ListenEntry => ({
  track: track(id, artists),
  at,
  ms,
});

describe("computeStats", () => {
  it("ranks tracks and primary artists by plays", () => {
    const now = Date.now();
    const stats = computeStats([
      entry("a", "Alpha, Beta", now),
      entry("a", "Alpha, Beta", now),
      entry("b", "Gamma", now),
      entry("c", "Alpha feat. Delta", now),
    ]);
    expect(stats.plays).toBe(4);
    expect(stats.totalMs).toBe(240_000);
    expect(stats.topTracks[0].track.id).toBe("a");
    expect(stats.topArtists[0]).toMatchObject({ name: "Alpha", plays: 3 });
    expect(stats.uniqueArtists).toBe(2);
  });

  it("filters by range", () => {
    const now = Date.now();
    const old = now - 40 * 86_400_000;
    const list = [entry("a", "A", now), entry("b", "B", old)];
    expect(filterRange(list, "month", now)).toHaveLength(1);
    expect(filterRange(list, "all", now)).toHaveLength(2);
  });

  it("splits featured artists", () => {
    expect(primaryArtist("Drake feat. Rihanna")).toBe("Drake");
    expect(primaryArtist("Simon & Garfunkel")).toBe("Simon");
  });

  it("needs 30s or half the song to count", () => {
    expect(countsAsListen(10_000, 200_000)).toBe(false);
    expect(countsAsListen(31_000, 200_000)).toBe(true);
    expect(countsAsListen(12_000, 20_000)).toBe(true);
  });
});
