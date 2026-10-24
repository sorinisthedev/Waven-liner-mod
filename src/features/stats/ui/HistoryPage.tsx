import { useMemo, useState } from "react";
import { Search2Line } from "@mingcute/react";
import { useTranslation } from "@/languages";
import { CoverImage } from "@/features/covers";
import { playerEngine } from "@/features/player";
import { useListeningLogStore, type ListenEntry } from "../store/listeningLogStore";

const PAGE = 200;

export default function HistoryPage() {
  const { t, locale } = useTranslation();
  const entries = useListeningLogStore((s) => s.entries);
  const clear = useListeningLogStore((s) => s.clear);
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [confirmClear, setConfirmClear] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.track.title.toLowerCase().includes(q) || e.track.artists.toLowerCase().includes(q),
    );
  }, [entries, query]);

  const groups = useMemo(() => {
    const dayFmt = new Intl.DateTimeFormat(locale || "en", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    const out: { day: string; items: ListenEntry[] }[] = [];
    for (const e of filtered.slice(0, shown)) {
      const day = dayFmt.format(e.at);
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(e);
      else out.push({ day, items: [e] });
    }
    return out;
  }, [filtered, shown, locale]);

  const timeFmt = useMemo(
    () => new Intl.DateTimeFormat(locale || "en", { hour: "numeric", minute: "2-digit" }),
    [locale],
  );

  return (
    <div className="relative h-full w-full overflow-y-auto pt-(--page-inset-top) pb-(--page-inset-bottom)">
      <div className="flex flex-col gap-5 px-8 pt-[20px] pb-[40px]">
        <header className="flex flex-wrap items-end justify-between gap-4" data-window-drag>
          <div>
            <h1 className="m-0 text-[26px] font-[700] tracking-[-0.03em] text-text-primary">
              {t("history.title")}
            </h1>
            <p className="m-0 mt-[2px] text-[13px] text-text-tertiary">
              {t("history.subtitle", { count: entries.length })}
            </p>
          </div>
          <div className="flex items-center gap-2" data-no-window-drag>
            <label className="relative flex items-center">
              <Search2Line size={15} className="pointer-events-none absolute left-[10px] text-text-tertiary" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShown(PAGE);
                }}
                placeholder={t("history.search")}
                className="h-[34px] w-[240px] rounded-[10px] border-0 bg-bg-elevated pl-[30px] pr-3 text-[13px] text-text-primary outline-none placeholder:text-text-tertiary"
              />
            </label>
            {entries.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirmClear) {
                    clear();
                    setConfirmClear(false);
                  } else {
                    setConfirmClear(true);
                    setTimeout(() => setConfirmClear(false), 4000);
                  }
                }}
                className={`h-[34px] rounded-[10px] border-0 px-3 text-[13px] transition-colors cursor-pointer ${
                  confirmClear
                    ? "bg-red-500/20 text-red-400"
                    : "bg-bg-elevated text-text-secondary hover:text-text-primary"
                }`}
              >
                {confirmClear ? t("history.clear_confirm") : t("history.clear")}
              </button>
            )}
          </div>
        </header>

        {groups.length === 0 ? (
          <div className="rounded-[16px] bg-bg-elevated/50 px-6 py-10 text-center text-[14px] text-text-tertiary">
            {query ? t("history.no_matches") : t("history.empty")}
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.day} className="flex flex-col gap-1">
              <h2 className="m-0 px-2 pb-1 text-[13px] font-[600] text-text-tertiary">{g.day}</h2>
              {g.items.map((e) => (
                <button
                  key={`${e.track.id}-${e.at}`}
                  type="button"
                  onClick={() => void playerEngine.playTrack(e.track)}
                  className="flex items-center gap-3 rounded-[12px] border-0 bg-transparent px-2 py-1.5 text-left transition-colors hover:bg-bg-elevated/60 cursor-pointer"
                >
                  <span className="relative h-[40px] w-[40px] shrink-0 overflow-hidden rounded-[8px] bg-bg-elevated">
                    {e.track.coverUrl ? (
                      <CoverImage src={e.track.coverUrl} alt="" fill sizes="40px" className="object-cover" unoptimized />
                    ) : null}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[14px] font-[550] text-text-primary">{e.track.title}</span>
                    <span className="truncate text-[12.5px] text-text-tertiary">{e.track.artists}</span>
                  </span>
                  <span className="shrink-0 text-[12px] text-text-tertiary tabular-nums">{timeFmt.format(e.at)}</span>
                </button>
              ))}
            </section>
          ))
        )}

        {filtered.length > shown && (
          <button
            type="button"
            onClick={() => setShown((n) => n + PAGE)}
            className="self-center rounded-full border-0 bg-bg-elevated px-4 py-2 text-[13px] text-text-secondary hover:text-text-primary cursor-pointer"
          >
            {t("history.load_more")}
          </button>
        )}
      </div>
    </div>
  );
}
