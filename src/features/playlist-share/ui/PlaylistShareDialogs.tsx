import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckLine, CloseLine, Download2Line, LinkLine } from "@mingcute/react";
import { useTranslation } from "@/languages";
import Dialog from "@/shared/ui/Dialog";
import { showToast } from "@/shared/ui";
import {
  DISCORD_SAFE_LINK_LENGTH,
  encodeSharedPlaylist,
  importSharedPlaylist,
  parsePlaylistFile,
  playlistFileContents,
  playlistShareUrl,
} from "@/shared/local/playlistShare";
import { usePlaylistShareStore } from "../store/shareStore";

const font = { fontFamily: "var(--font-inter), sans-serif" } as const;
const btn =
  "inline-flex h-[38px] items-center justify-center gap-[8px] rounded-[11px] border-0 px-[16px] text-[13.5px] font-[600] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
const primary = `${btn} bg-btn-primary-bg text-btn-primary-text hover:opacity-90`;
const secondary = `${btn} bg-black/[0.06] text-text-primary hover:bg-black/[0.1] dark:bg-white/[0.08] dark:hover:bg-white/[0.12]`;

function Header({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="m-0 text-[17px] font-[700] text-text-primary">{title}</h3>
        <p className="m-0 mt-[2px] truncate text-[12.5px] text-text-tertiary">{subtitle}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={t("common.close")}
        className="inline-flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-text-tertiary hover:bg-border-alpha-14 hover:text-text-primary cursor-pointer"
      >
        <CloseLine size={17} />
      </button>
    </div>
  );
}

function ShareDialog() {
  const { t } = useTranslation();
  const sharing = usePlaylistShareStore((s) => s.sharing);
  const skipped = usePlaylistShareStore((s) => s.skippedLocal);
  const close = usePlaylistShareStore((s) => s.closeShare);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLink(null);
    setCopied(false);
    if (!sharing) return;
    let cancelled = false;
    void encodeSharedPlaylist(sharing).then((encoded) => {
      if (!cancelled) setLink(playlistShareUrl(encoded));
    });
    return () => {
      cancelled = true;
    };
  }, [sharing]);

  if (!sharing) return null;
  const tooLong = Boolean(link && link.length > DISCORD_SAFE_LINK_LENGTH);

  return (
    <Dialog open onOpenChange={(o) => !o && close()} maxWidth={440} className="!p-0">
      <div className="flex flex-col gap-[16px] p-[20px]" style={font}>
        <Header
          title={t("playlist_share.share_title")}
          subtitle={t("playlist_share.share_subtitle", { title: sharing.title, count: sharing.ids.length })}
          onClose={close}
        />
        <p className="m-0 text-[13px] leading-relaxed text-text-secondary">{t("playlist_share.share_explain")}</p>
        {skipped > 0 && (
          <p className="m-0 rounded-[10px] bg-black/[0.04] px-[12px] py-[8px] text-[12.5px] text-text-tertiary dark:bg-white/[0.05]">
            {t("playlist_share.skipped_local", { count: skipped })}
          </p>
        )}
        {tooLong && (
          <p className="m-0 rounded-[10px] bg-amber-500/10 px-[12px] py-[8px] text-[12.5px] text-amber-600 dark:text-amber-300">
            {t("playlist_share.too_long")}
          </p>
        )}
        <div className="flex flex-wrap gap-[8px]">
          <button
            type="button"
            disabled={!link}
            data-testid="share-copy-link"
            className={tooLong ? secondary : primary}
            onClick={async () => {
              if (!link) return;
              await navigator.clipboard.writeText(link);
              setCopied(true);
              showToast(t("playlist_share.link_copied"), "success");
            }}
          >
            {copied ? <CheckLine size={16} /> : <LinkLine size={16} />}
            {copied ? t("playlist_share.copied") : t("playlist_share.copy_link")}
          </button>
          <button
            type="button"
            className={tooLong ? primary : secondary}
            onClick={() => {
              const blob = new Blob([playlistFileContents(sharing)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${sharing.title.replace(/[^\w\- ]+/g, "").trim() || "playlist"}.wavenplaylist`;
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 5_000);
              showToast(t("playlist_share.file_saved"), "success");
            }}
          >
            <Download2Line size={16} />
            {t("playlist_share.save_file")}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

function ImportDialog() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const incoming = usePlaylistShareStore((s) => s.incoming);
  const close = usePlaylistShareStore((s) => s.closeImport);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => setProgress(null), [incoming]);
  if (!incoming) return null;
  const busy = progress !== null;

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && close()} maxWidth={420} className="!p-0">
      <div className="flex flex-col gap-[16px] p-[20px]" style={font} data-testid="import-dialog">
        <Header
          title={t("playlist_share.import_title")}
          subtitle={t("playlist_share.import_subtitle", { count: incoming.ids.length })}
          onClose={() => !busy && close()}
        />
        <p className="m-0 truncate text-[20px] font-[700] tracking-[-0.02em] text-text-primary">{incoming.title}</p>
        {busy && (
          <div className="flex flex-col gap-[6px]">
            <div className="h-[6px] overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-text-primary transition-[width] duration-200"
                style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }}
              />
            </div>
            <span className="text-[12px] tabular-nums text-text-tertiary">
              {t("playlist_share.importing", { done: progress.done, total: progress.total })}
            </span>
          </div>
        )}
        <div className="flex justify-end gap-[8px]">
          <button type="button" className={secondary} disabled={busy} onClick={close}>
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className={primary}
            disabled={busy}
            data-testid="import-confirm"
            onClick={async () => {
              setProgress({ done: 0, total: incoming.ids.length });
              try {
                const result = await importSharedPlaylist(incoming, (done, total) => setProgress({ done, total }));
                close();
                showToast(
                  result.failed
                    ? t("playlist_share.imported_some", { added: result.added, failed: result.failed })
                    : t("playlist_share.imported", { count: result.added }),
                  "success",
                );
                navigate(`/library/playlist?id=${encodeURIComponent(result.playlistId)}`);
              } catch {
                setProgress(null);
                showToast(t("playlist_share.import_failed"), "error");
              }
            }}
          >
            {t("playlist_share.import_button")}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

/** asks for a .wavenplaylist file and opens the import window for it */
export function pickPlaylistFile() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".wavenplaylist,application/json";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file || file.size > 2_000_000) return;
    try {
      usePlaylistShareStore.getState().openImport(parsePlaylistFile(await file.text()));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "That file isn't a WAVEN playlist.", "error");
    }
  };
  input.click();
}

export function PlaylistShareDialogs() {
  return (
    <>
      <ShareDialog />
      <ImportDialog />
    </>
  );
}

export default PlaylistShareDialogs;
