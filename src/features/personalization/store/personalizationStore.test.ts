import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../lib/wallpaperAssets", () => ({
  putWallpaperAsset: vi.fn(async () => {}),
  getWallpaperAsset: vi.fn(async () => null),
  deleteWallpaperAsset: vi.fn(async () => {}),
}));

import {
  DEFAULT_PERSONALIZATION,
  WALLPAPER_BLUR_MAX,
  WALLPAPER_DIM_MAX,
  usePersonalizationStore,
} from "./personalizationStore";
import { getWallpaperAsset } from "../lib/wallpaperAssets";

describe("personalizationStore", () => {
  beforeEach(async () => {
    await usePersonalizationStore.getState().resetPersonalization();
  });

  it("starts with no wallpaper and the stock accent", () => {
    const state = usePersonalizationStore.getState();
    expect(state.wallpaperKind).toBe("none");
    expect(state.accentId).toBe("default");
    expect(state.avatarDataUrl).toBeNull();
  });

  it("only accepts known presets and accents", () => {
    const store = usePersonalizationStore.getState();
    store.setPresetWallpaper("sunset");
    expect(usePersonalizationStore.getState().wallpaperKind).toBe("preset");
    expect(usePersonalizationStore.getState().wallpaperPresetId).toBe("sunset");

    store.setPresetWallpaper("does-not-exist");
    expect(usePersonalizationStore.getState().wallpaperPresetId).toBe("sunset");

    store.setAccent("blue");
    store.setAccent("neon-plaid");
    expect(usePersonalizationStore.getState().accentId).toBe("blue");
  });

  it("clamps blur and dim", () => {
    const store = usePersonalizationStore.getState();
    store.setWallpaperBlur(500);
    store.setWallpaperDim(-1);
    expect(usePersonalizationStore.getState().wallpaperBlur).toBe(WALLPAPER_BLUR_MAX);
    expect(usePersonalizationStore.getState().wallpaperDim).toBe(0);

    store.setWallpaperDim(5);
    expect(usePersonalizationStore.getState().wallpaperDim).toBe(WALLPAPER_DIM_MAX);
  });

  it("drops corrupt persisted values back to defaults on rehydrate", () => {
    const merge = usePersonalizationStore.persist.getOptions().merge!;
    const merged = merge(
      {
        avatarDataUrl: "javascript:alert(1)",
        avatarShape: "hexagon",
        wallpaperKind: "image",
        wallpaperPresetId: "nope",
        wallpaperBlur: "lots",
        wallpaperDim: 3,
        accentId: "teal",
      },
      usePersonalizationStore.getState(),
    );
    expect(merged.avatarDataUrl).toBeNull();
    expect(merged.avatarShape).toBe(DEFAULT_PERSONALIZATION.avatarShape);
    expect(merged.wallpaperKind).toBe("image");
    expect(merged.wallpaperPresetId).toBe(DEFAULT_PERSONALIZATION.wallpaperPresetId);
    expect(merged.wallpaperBlur).toBe(DEFAULT_PERSONALIZATION.wallpaperBlur);
    expect(merged.wallpaperDim).toBe(WALLPAPER_DIM_MAX);
    expect(merged.accentId).toBe("teal");
  });

  it("falls back to no wallpaper when the stored image is gone", async () => {
    usePersonalizationStore.setState({ wallpaperKind: "image", wallpaperAssetKey: "wallpaper-1" });
    vi.mocked(getWallpaperAsset).mockResolvedValueOnce(null);
    await usePersonalizationStore.getState().loadWallpaperImage();
    const state = usePersonalizationStore.getState();
    expect(state.wallpaperKind).toBe("none");
    expect(state.wallpaperAssetKey).toBeNull();
  });

  it("keeps performance mode through a personalization reset", async () => {
    usePersonalizationStore.getState().setPerformanceMode(true);
    usePersonalizationStore.getState().setAccent("pink");
    await usePersonalizationStore.getState().resetPersonalization();
    const state = usePersonalizationStore.getState();
    expect(state.accentId).toBe("default");
    expect(state.performanceMode).toBe(true);
    usePersonalizationStore.getState().setPerformanceMode(false);
  });
});
