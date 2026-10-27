import { describe, expect, it } from "vitest";
import {
  decodeSharedPlaylist,
  encodeSharedPlaylist,
  isShareableTrackId,
  parsePlaylistFile,
  playlistFileContents,
  playlistShareUrl,
} from "./playlistShare";

describe("playlist sharing", () => {
  it("round-trips a playlist through a link", async () => {
    const ids = ["RGdkabupfPI", "yt:dQw4w9WgXcQ", "sc:123456789"];
    const encoded = await encodeSharedPlaylist({ title: "Road trip", ids });
    expect(encoded.startsWith("1.")).toBe(true);
    expect(encoded).toMatch(/^1\.[A-Za-z0-9_-]+$/);
    expect(await decodeSharedPlaylist(encoded)).toEqual({
      title: "Road trip",
      ids: ["RGdkabupfPI", "dQw4w9WgXcQ", "sc:123456789"],
    });
    expect(playlistShareUrl(encoded)).toContain("type=import&d=1.");
  });

  it("keeps 100 songs short enough for a Discord message", async () => {
    const ids = Array.from({ length: 100 }, (_, i) => `abcdefg${String(i).padStart(4, "0")}`);
    const url = playlistShareUrl(await encodeSharedPlaylist({ title: "Big", ids }));
    expect(url.length).toBeLessThan(1900);
  });

  it("rejects broken links and drops ids nobody else can play", async () => {
    await expect(decodeSharedPlaylist("1.notreallydata")).rejects.toThrow();
    await expect(decodeSharedPlaylist("2.abc")).rejects.toThrow();
    expect(isShareableTrackId("local:L2Zvby5tcDM")).toBe(false);
    expect(isShareableTrackId("../../etc/passwd")).toBe(false);
    expect(isShareableTrackId("sc_42")).toBe(true);
  });

  it("round-trips a playlist file", () => {
    const text = playlistFileContents({ title: "Gym", ids: ["RGdkabupfPI", "local:abc"] });
    expect(parsePlaylistFile(text)).toEqual({ title: "Gym", ids: ["RGdkabupfPI"] });
    expect(() => parsePlaylistFile('{"app":"other"}')).toThrow();
  });
});
