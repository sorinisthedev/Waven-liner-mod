import { useEffect, useRef, useState } from "react";
import { CloseLine, Delete2Line, Upload2Line } from "@mingcute/react";
import { useTranslation } from "@/languages";
import Dialog from "@/shared/ui/Dialog";
import { useToast } from "@/shared/ui";
import { fileToAvatarDataUrl, ImageInputError } from "@/features/personalization/lib/imageProcessing";
import {
  ICON_COLORS,
  ICON_EMOJIS,
  usePlaylistIconStore,
  type PlaylistIcon,
} from "../store/playlistIconStore";
import { IconFill } from "./PlaylistIconView";

const font = { fontFamily: "var(--font-inter), sans-serif" } as const;
const chip =
  "inline-flex h-[32px] items-center gap-[6px] whitespace-nowrap rounded-[10px] border-0 px-[12px] text-[13px] leading-none transition-colors cursor-pointer disabled:opacity-50";

export function PlaylistIconEditor({
  open,
  onOpenChange,
  playlistId,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playlistId: string;
  title: string;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const current = usePlaylistIconStore((s) => s.icons[playlistId]);
  const setIcon = usePlaylistIconStore((s) => s.setIcon);
  const removeIcon = usePlaylistIconStore((s) => s.removeIcon);
  const [draft, setDraft] = useState<PlaylistIcon>(
    current ?? { kind: "emoji", emoji: ICON_EMOJIS[0], color: ICON_COLORS[6] },
  );
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setDraft(current ?? { kind: "emoji", emoji: ICON_EMOJIS[0], color: ICON_COLORS[6] });
  }, [open, current]);

  const emojiColor = draft.kind === "emoji" ? draft.color : ICON_COLORS[6];

  return (
    <Dialog open={open} onOpenChange={onOpenChange} maxWidth={460} className="!p-0">
      <div className="flex flex-col gap-[16px] p-[20px]" style={font}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="m-0 text-[17px] font-[700] text-text-primary">{t("playlist_icons.title")}</h3>
            <p className="m-0 mt-[2px] truncate text-[12.5px] text-text-tertiary">{title}</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label={t("common.close")}
            className="inline-flex h-[28px] w-[28px] items-center justify-center rounded-md border-0 bg-transparent text-text-tertiary hover:bg-border-alpha-14 hover:text-text-primary cursor-pointer"
          >
            <CloseLine size={17} />
          </button>
        </div>

        <div className="flex items-center gap-[16px]">
          <span className="relative block h-[96px] w-[96px] shrink-0 overflow-hidden rounded-[12px] bg-bg-elevated shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
            <IconFill icon={draft} />
          </span>
          <div className="flex flex-col gap-[8px]">
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className={`${chip} bg-black/[0.06] text-text-primary hover:bg-black/[0.1] dark:bg-black/30 dark:hover:bg-black/40`}
            >
              <Upload2Line size={15} />
              {busy ? t("settings.personalize.processing") : t("playlist_icons.upload")}
            </button>
            <p className="m-0 max-w-[220px] text-[11.5px] leading-snug text-text-tertiary">{t("playlist_icons.local_note")}</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
              hidden
              data-testid="playlist-icon-file"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setBusy(true);
                try {
                  setDraft({ kind: "image", dataUrl: await fileToAvatarDataUrl(file, 320) });
                } catch (err) {
                  toast.error(err instanceof ImageInputError ? err.message : t("playlist_icons.failed"));
                } finally {
                  setBusy(false);
                }
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-[8px]">
          <span className="text-[12px] font-[600] text-text-secondary">{t("playlist_icons.emoji")}</span>
          <div className="grid grid-cols-10 gap-[4px]">
            {ICON_EMOJIS.map((emoji) => {
              const active = draft.kind === "emoji" && draft.emoji === emoji;
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setDraft({ kind: "emoji", emoji, color: emojiColor })}
                  aria-pressed={active}
                  className={`flex aspect-square items-center justify-center rounded-[8px] border-0 text-[20px] leading-none transition-colors cursor-pointer ${
                    active ? "bg-text-primary/15 ring-1 ring-text-primary" : "bg-transparent hover:bg-border-alpha-14"
                  }`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-[8px] pt-[4px]">
            {ICON_COLORS.map((color) => {
              const active = draft.kind === "emoji" && draft.color === color;
              return (
                <button
                  key={color}
                  type="button"
                  aria-label={color}
                  aria-pressed={active}
                  onClick={() =>
                    setDraft({
                      kind: "emoji",
                      emoji: draft.kind === "emoji" ? draft.emoji : ICON_EMOJIS[0],
                      color,
                    })
                  }
                  className={`h-[24px] w-[24px] rounded-full border-0 p-0 cursor-pointer transition-transform hover:scale-110 ${
                    active ? "ring-2 ring-text-primary ring-offset-2 ring-offset-bg-surface" : ""
                  }`}
                  style={{ background: color }}
                />
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-[4px]">
          {current ? (
            <button
              type="button"
              onClick={() => {
                removeIcon(playlistId);
                onOpenChange(false);
              }}
              className={`${chip} bg-transparent text-text-secondary hover:bg-red-500/15 hover:text-red-400`}
            >
              <Delete2Line size={15} />
              {t("playlist_icons.remove")}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-[6px]">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className={`${chip} bg-black/[0.06] text-text-primary hover:bg-black/[0.1] dark:bg-black/30 dark:hover:bg-black/40`}
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              data-testid="playlist-icon-save"
              onClick={() => {
                setIcon(playlistId, draft);
                onOpenChange(false);
                toast.success(t("playlist_icons.saved"));
              }}
              className={`${chip} bg-btn-primary-bg font-[600] text-btn-primary-text hover:opacity-90`}
            >
              {t("playlist_icons.save")}
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

export default PlaylistIconEditor;
