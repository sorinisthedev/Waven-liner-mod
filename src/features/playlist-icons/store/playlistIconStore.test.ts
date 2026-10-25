import { describe, it, expect, beforeEach } from "vitest";
import { MAX_IMAGE_ICONS, usePlaylistIconStore } from "./playlistIconStore";

describe("playlistIconStore", () => {
  beforeEach(() => usePlaylistIconStore.setState({ icons: {} }));

  it("sets and removes icons per playlist", () => {
    usePlaylistIconStore.getState().setIcon("p1", { kind: "emoji", emoji: "🔥", color: "#ef4444" });
    expect(usePlaylistIconStore.getState().icons.p1).toMatchObject({ emoji: "🔥" });
    usePlaylistIconStore.getState().removeIcon("p1");
    expect(usePlaylistIconStore.getState().icons.p1).toBeUndefined();
  });

  it("rejects invalid icons", () => {
    usePlaylistIconStore.getState().setIcon("p1", { kind: "image", dataUrl: "https://evil" });
    usePlaylistIconStore.getState().setIcon("p2", { kind: "emoji", emoji: "x", color: "red" });
    expect(usePlaylistIconStore.getState().icons).toEqual({});
  });

  it("caps the number of image icons", () => {
    for (let i = 0; i < MAX_IMAGE_ICONS + 5; i++) {
      usePlaylistIconStore.getState().setIcon(`p${i}`, { kind: "image", dataUrl: "data:image/webp;base64,AA" });
    }
    expect(Object.keys(usePlaylistIconStore.getState().icons)).toHaveLength(MAX_IMAGE_ICONS);
    expect(usePlaylistIconStore.getState().icons[`p${MAX_IMAGE_ICONS + 4}`]).toBeDefined();
  });
});
