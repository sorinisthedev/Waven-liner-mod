import { describe, it, expect } from "vitest";
import { handleLocalRequest } from "./localBackend";

const req = <T>(path: string, method = "GET", body?: unknown) =>
  handleLocalRequest<T>(path, { method, ...(body ? { body: JSON.stringify(body) } : {}) });

const track = { id: "yt:abc", title: "Song", artists: [{ id: "a1", name: "Artist" }], durationMs: 200000 };

describe("local backend", () => {
  it("likes and unlikes songs", async () => {
    await req("/v1/me/library/tracks/yt%3Aabc", "PUT", { track });
    let page = await req<{ items: { track: { id: string } }[] }>("/v1/me/library/tracks?limit=50");
    expect(page.items.map((i) => i.track.id)).toContain("yt:abc");
    await req("/v1/me/library/tracks/yt%3Aabc", "DELETE");
    page = await req("/v1/me/library/tracks?limit=50");
    expect(page.items.map((i) => i.track.id)).not.toContain("yt:abc");
  });

  it("creates, fills, reorders and deletes a playlist", async () => {
    const pl = await req<{ id: string; title: string }>("/v1/me/playlists", "POST", { title: "Road trip" });
    expect(pl.title).toBe("Road trip");
    await req(`/v1/me/playlists/${pl.id}/tracks/one`, "POST", { track: { ...track, id: "one" } });
    await req(`/v1/me/playlists/${pl.id}/tracks`, "POST", { tracks: [{ ...track, id: "two" }, {}] });
    let detail = await req<{ items: { id: string; track: { id: string } }[] }>(`/v1/me/playlists/${pl.id}`);
    expect(detail.items.map((i) => i.track.id)).toEqual(["one", "two"]);
    detail = await req(`/v1/me/playlists/${pl.id}/items/${detail.items[1].id}/move`, "POST", { beforeItemId: detail.items[0].id });
    expect(detail.items.map((i) => i.track.id)).toEqual(["two", "one"]);
    await req(`/v1/me/playlists/${pl.id}`, "DELETE");
    await expect(req(`/v1/me/playlists/${pl.id}`)).rejects.toMatchObject({ status: 404 });
  });

  it("records history and keeps the profile name", async () => {
    await req("/v1/me/playback/events", "POST", { trackId: "one", trackSnapshot: track, playedDurationMs: 60000, completionRate: 0.3 });
    const history = await req<{ items: { track: { title: string } }[] }>("/v1/me/history?limit=5");
    expect(history.items[0].track.title).toBe("Song");
    const me = await req<{ displayName: string }>("/v1/users/me", "PATCH", { displayName: "Alex" });
    expect(me.displayName).toBe("Alex");
  });
});
