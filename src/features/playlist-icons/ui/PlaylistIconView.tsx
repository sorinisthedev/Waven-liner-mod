import { memo } from "react";
import { usePlaylistIconStore, type PlaylistIcon } from "../store/playlistIconStore";

export function IconFill({ icon, emojiScale = 0.5 }: { icon: PlaylistIcon; emojiScale?: number }) {
  if (icon.kind === "image") {
    return (
      <img
        src={icon.dataUrl}
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover select-none"
      />
    );
  }
  return (
    <span
      className="absolute inset-0 flex items-center justify-center select-none [container-type:size]"
      style={{ background: `radial-gradient(120% 120% at 30% 20%, ${icon.color}, ${icon.color}99 60%, #00000066)` }}
    >
      <span style={{ fontSize: `${emojiScale * 100}cqmin`, lineHeight: 1 }}>{icon.emoji}</span>
    </span>
  );
}

/**
 * Covers whatever artwork is underneath with the user's custom icon. Renders
 * nothing when the playlist has no icon, so it can sit in any cover slot.
 */
function PlaylistIconOverlayComponent({
  playlistId,
  emojiScale,
}: {
  playlistId: string | null | undefined;
  emojiScale?: number;
}) {
  const icon = usePlaylistIconStore((s) => (playlistId ? s.icons[playlistId] : undefined));
  if (!icon) return null;
  return (
    <span className="absolute inset-0 z-[1] overflow-hidden" data-testid="playlist-icon">
      <IconFill icon={icon} emojiScale={emojiScale} />
    </span>
  );
}

export const PlaylistIconOverlay = memo(PlaylistIconOverlayComponent);
