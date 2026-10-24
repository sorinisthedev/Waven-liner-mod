import { memo } from "react";
import { usePersonalizationStore } from "../store/personalizationStore";
import { findWallpaperPreset } from "../data/presets";

/**
 * Full-frame wallpaper under the page backdrop and the app chrome. Pages are
 * transparent, so whatever is painted here shows through every route.
 */
function WallpaperLayerComponent({ rounded = true }: { rounded?: boolean }) {
  const kind = usePersonalizationStore((s) => s.wallpaperKind);
  const presetId = usePersonalizationStore((s) => s.wallpaperPresetId);
  const imageUrl = usePersonalizationStore((s) => s.wallpaperImageUrl);
  const blurSetting = usePersonalizationStore((s) => s.wallpaperBlur);
  const dim = usePersonalizationStore((s) => s.wallpaperDim);
  const performanceMode = usePersonalizationStore((s) => s.performanceMode);
  const motion = usePersonalizationStore((s) => s.wallpaperMotion) && !performanceMode;
  // a full-window blur filter is one of the costliest things the gpu does here
  const blur = performanceMode ? 0 : blurSetting;

  const preset = kind === "preset" ? findWallpaperPreset(presetId) : undefined;
  const image = kind === "image" ? imageUrl : null;
  if (!preset && !image) return null;

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-0 overflow-hidden select-none ${
        rounded ? "rounded-[12px]" : ""
      }`}
      aria-hidden="true"
      data-testid="app-wallpaper"
    >
      <div
        className={`absolute inset-0 transform-gpu ${motion ? "liner-wallpaper-drift" : ""}`}
      >
        <div
          className="absolute inset-0"
          style={{
            ...(image
              ? {
                  backgroundImage: `url("${image}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : { background: preset?.background }),
            filter: blur > 0 ? `blur(${blur}px)` : undefined,
            // blur pulls transparent edges in, overscan hides them
            transform: blur > 0 ? `scale(${1 + blur / 200})` : undefined,
          }}
        />
      </div>
      {dim > 0 && (
        <div
          className="absolute inset-0 bg-bg-canvas"
          style={{ opacity: dim }}
        />
      )}
    </div>
  );
}

export const WallpaperLayer = memo(WallpaperLayerComponent);
export default WallpaperLayer;
