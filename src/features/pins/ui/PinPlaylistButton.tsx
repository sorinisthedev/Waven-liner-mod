import { useEffect } from "react";
import { Pin2Fill, Pin2Line } from "@mingcute/react";
import { useTranslation } from "@/languages";
import { Button } from "@/shared/ui";
import { usePinnedStore, type PinnedPlaylist } from "../store/pinnedStore";

export function PinPlaylistButton({ pin, className = "" }: { pin: PinnedPlaylist; className?: string }) {
  const { t } = useTranslation();
  const pinned = usePinnedStore((s) => s.pins.some((p) => p.id === pin.id));
  const togglePin = usePinnedStore((s) => s.togglePin);
  const refresh = usePinnedStore((s) => s.refresh);

  useEffect(() => {
    refresh(pin);
  }, [pin, refresh]);

  const label = pinned ? t("pins.unpin") : t("pins.pin");
  return (
    <Button
      variant="secondary"
      size="icon"
      onClick={() => togglePin(pin)}
      aria-pressed={pinned}
      aria-label={label}
      title={label}
      data-testid="pin-playlist"
      className={`!h-[38px] !w-[38px] !rounded-full ${className}`}
    >
      {pinned ? <Pin2Fill size={17} /> : <Pin2Line size={17} />}
    </Button>
  );
}

export default PinPlaylistButton;
