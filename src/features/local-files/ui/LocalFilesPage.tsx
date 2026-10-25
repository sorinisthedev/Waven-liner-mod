import { useEffect, useMemo, useState } from "react";
import { AddLine, CloseLine, FolderOpenLine, PlayFill, Refresh2Line, Search2Line, ShuffleLine } from "@mingcute/react";
import { useTranslation } from "@/languages";
import { CoverImage } from "@/features/covers";
import { playerEngine, usePlayerStore } from "@/features/player";
import { useLocalFilesStore } from "../store/localFilesStore";

const formatDuration = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export default function LocalFilesPage() {
  const { t } = useTranslation();
  const { folders, tracks, scanning, available, load, addFolder, removeFolder, rescan } = useLocalFilesStore();
  const currentId = usePlayerStore((s) => s.currentTrack?.id);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tracks;
    return tracks.filter(
      (tr) =>
        tr.title.toLowerCase().includes(q) ||
        tr.artists.toLowerCase().includes(q) ||
        (tr.album?.title ?? "").toLowerCase().includes(q),
    );
  }, [tracks, query]);

  const play = (index: number, list = filtered) => {
    if (!list[index]) return;
    void playerEngine.playTrack(list[index], list, "local-files");
  };

  return (
    <div className="relative h-full w-full overflow-y-auto pt-(--page-inset-top) pb-(--page-inset-bottom)">
      <div className="flex flex-col gap-5 px-8 pt-[20px] pb-[40px]">
        <header className="flex flex-wrap items-end justify-between gap-4" data-window-drag>
          <div>
            <h1 className="m-0 text-[26px] font-[700] tracking-[-0.03em] text-text-primary">{t("local_files.title")}</h1>
            <p className="m-0 mt-[2px] text-[13px] text-text-tertiary">
              {tracks.length
                ? t("local_files.subtitle", { count: tracks.length })
                : t("local_files.subtitle_empty")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2" data-no-window-drag>
            {tracks.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => play(0)}
                  className="inline-flex h-[34px] items-center gap-1.5 rounded-full border-0 bg-btn-primary-bg px-4 text-[13px] font-semibold text-btn-primary-text cursor-pointer"
                >
                  <PlayFill size={14} />
                  {t("local_files.play_all")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
                    play(0, shuffled);
                  }}
                  aria-label={t("command.shuffle")}
                  className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-full border-0 bg-bg-elevated text-text-secondary hover:text-text-primary cursor-pointer"
                >
                  <ShuffleLine size={16} />
                </button>
              </>
            )}
            <button
              type="button"
              disabled={!available}
              onClick={() => void addFolder()}
              data-testid="local-add-folder"
              className="inline-flex h-[34px] items-center gap-1.5 rounded-full border-0 bg-bg-elevated px-4 text-[13px] text-text-primary hover:bg-bg-panel cursor-pointer disabled:opacity-50"
            >
              <AddLine size={15} />
              {t("local_files.add_folder")}
            </button>
            {folders.length > 0 && (
              <button
                type="button"
                onClick={() => void rescan()}
                disabled={scanning}
                aria-label={t("local_files.rescan")}
                title={t("local_files.rescan")}
                className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-full border-0 bg-bg-elevated text-text-secondary hover:text-text-primary cursor-pointer disabled:opacity-60"
              >
                <Refresh2Line size={16} className={scanning ? "animate-spin" : ""} />
              </button>
            )}
          </div>
        </header>

        {folders.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {folders.map((folder) => (
              <span
                key={folder}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-bg-elevated/70 py-1 pl-3 pr-1 text-[12px] text-text-secondary"
              >
                <FolderOpenLine size={14} className="shrink-0" />
                <span className="truncate">{folder}</span>
                <button
                  type="button"
                  onClick={() => void removeFolder(folder)}
                  aria-label={t("local_files.remove_folder")}
                  title={t("local_files.remove_folder")}
                  className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-0 bg-transparent text-text-tertiary hover:bg-bg-panel hover:text-text-primary cursor-pointer"
                >
                  <CloseLine size={13} />
                </button>
              </span>
            ))}
          </div>
        )}

        {!available ? (
          <div className="rounded-[16px] bg-bg-elevated/50 px-6 py-10 text-center text-[14px] text-text-tertiary">
            {t("local_files.desktop_only")}
          </div>
        ) : folders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-[16px] bg-bg-elevated/50 px-6 py-12 text-center">
            <FolderOpenLine size={34} className="text-text-tertiary" />
            <p className="m-0 max-w-[420px] text-[14px] text-text-secondary">{t("local_files.empty")}</p>
            <button
              type="button"
              onClick={() => void addFolder()}
              className="inline-flex h-[34px] items-center gap-1.5 rounded-full border-0 bg-btn-primary-bg px-4 text-[13px] font-semibold text-btn-primary-text cursor-pointer"
            >
              <AddLine size={15} />
              {t("local_files.add_folder")}
            </button>
          </div>
        ) : (
          <>
            <label className="relative flex max-w-[320px] items-center">
              <Search2Line size={15} className="pointer-events-none absolute left-[10px] text-text-tertiary" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("local_files.search")}
                className="h-[34px] w-full rounded-[10px] border-0 bg-bg-elevated pl-[30px] pr-3 text-[13px] text-text-primary outline-none placeholder:text-text-tertiary"
              />
            </label>
            {scanning && tracks.length === 0 ? (
              <p className="m-0 text-[13px] text-text-tertiary">{t("local_files.scanning")}</p>
            ) : filtered.length === 0 ? (
              <p className="m-0 text-[13px] text-text-tertiary">{t("history.no_matches")}</p>
            ) : (
              <div className="flex flex-col">
                {filtered.map((tr, i) => {
                  const active = tr.id === currentId;
                  return (
                    <button
                      key={tr.id}
                      type="button"
                      onClick={() => play(i)}
                      className={`grid grid-cols-[40px_minmax(0,1fr)_minmax(0,0.7fr)_52px] items-center gap-3 rounded-[10px] border-0 px-2 py-1.5 text-left transition-colors cursor-pointer ${
                        active ? "bg-text-primary/10" : "bg-transparent hover:bg-bg-elevated/60"
                      }`}
                    >
                      <span className="relative h-[40px] w-[40px] overflow-hidden rounded-[7px] bg-bg-elevated">
                        {tr.coverUrl ? (
                          <CoverImage src={tr.coverUrl} alt="" fill sizes="40px" className="object-cover" unoptimized />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-text-tertiary">♪</span>
                        )}
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className={`truncate text-[14px] font-[550] ${active ? "text-accent-primary" : "text-text-primary"}`}>
                          {tr.title}
                        </span>
                        <span className="truncate text-[12.5px] text-text-tertiary">{tr.artists}</span>
                      </span>
                      <span className="truncate text-[12.5px] text-text-tertiary">{tr.album?.title ?? ""}</span>
                      <span className="text-right text-[12px] tabular-nums text-text-tertiary">{formatDuration(tr.durationMs)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
