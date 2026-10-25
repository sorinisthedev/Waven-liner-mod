import { Link, useLocation } from "react-router-dom";
import { PlaylistFill } from "@mingcute/react";
import { Tooltip } from "@/shared/ui";
import { CoverImage } from "@/features/covers";
import likesCover from "@/assets/likes-cover.svg";
import { usePinnedStore } from "../store/pinnedStore";
import { PlaylistIconOverlay } from "@/features/playlist-icons";

/** pinned playlists as small covers under the sidebar navigation */
export function SidebarPins() {
  const pins = usePinnedStore((s) => s.pins);
  const { pathname, search } = useLocation();
  if (pins.length === 0) return null;

  const activeId =
    pathname === "/library/playlist" ? new URLSearchParams(search).get("id") : null;

  return (
    <div className="flex flex-col items-center gap-[10px]">
      <span className="h-px w-[24px] bg-border-alpha-14" aria-hidden />
      {pins.map((pin) => {
        const active = activeId !== null && decodeURIComponent(activeId) === pin.id;
        return (
          <Tooltip key={pin.id} content={pin.title} side="right" sideOffset={12}>
            <Link
              to={`/library/playlist?id=${encodeURIComponent(pin.id)}`}
              aria-label={pin.title}
              className={`relative block h-[34px] w-[34px] overflow-hidden rounded-[8px] bg-bg-elevated transition-[transform,box-shadow] active:scale-95 ${
                active ? "ring-2 ring-text-primary" : "opacity-80 hover:opacity-100"
              }`}
            >
              {pin.id === "likes" ? (
                <img src={likesCover} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
              ) : pin.coverUrl ? (
                <CoverImage src={pin.coverUrl} alt="" fill sizes="34px" className="object-cover" unoptimized />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-text-tertiary">
                  <PlaylistFill size={16} />
                </span>
              )}
              <PlaylistIconOverlay playlistId={pin.id} emojiScale={0.6} />
            </Link>
          </Tooltip>
        );
      })}
    </div>
  );
}

export default SidebarPins;
