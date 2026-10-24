import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Share2Line } from "@mingcute/react";
import { useTranslation } from "@/languages";
import { CoverImage } from "@/features/covers";
import { playerEngine } from "@/features/player";
import { useAuthStore } from "@/features/auth";
import { userDisplayName } from "@/entities/user";
import { showToast } from "@/shared/ui";
import { useListeningLogStore } from "../store/listeningLogStore";
import {
  computeStats,
  filterRange,
  formatMinutes,
  type StatsRange,
} from "../lib/computeStats";
import { downloadShareCard } from "../lib/shareCard";

const RANGES: StatsRange[] = ["week", "month", "year", "all"];

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-[2px] rounded-[14px] bg-bg-elevated/60 px-[18px] py-[14px]">
      <span className="text-[26px] font-[700] leading-tight tracking-[-0.02em] text-text-primary tabular-nums">
        {value}
      </span>
      <span className="text-[12.5px] text-text-tertiary">{label}</span>
    </div>
  );
}

export default function StatsPage() {
  const { t } = useTranslation();
  const entries = useListeningLogStore((s) => s.entries);
  const user = useAuthStore((s) => s.user);
  const [range, setRange] = useState<StatsRange>("month");

  const stats = useMemo(() => computeStats(filterRange(entries, range)), [entries, range]);
  const peakHour = Math.max(...stats.byHour, 1);
  const rangeLabel = t(`stats.range.${range}`);

  return (
    <div className="relative h-full w-full overflow-y-auto pt-(--page-inset-top) pb-(--page-inset-bottom)">
      <div className="flex flex-col gap-[22px] px-8 pt-[20px] pb-[40px]">
        <header className="flex flex-wrap items-end justify-between gap-4" data-window-drag>
          <div>
            <h1 className="m-0 text-[26px] font-[700] tracking-[-0.03em] text-text-primary">
              {t("stats.title")}
            </h1>
            <p className="m-0 mt-[2px] text-[13px] text-text-tertiary">{t("stats.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2" data-no-window-drag>
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`rounded-full border-0 px-3.5 py-1.5 text-[13px] font-medium transition-colors cursor-pointer ${
                  range === r
                    ? "bg-text-primary text-bg-canvas font-semibold"
                    : "bg-bg-elevated text-text-secondary hover:text-text-primary"
                }`}
              >
                {t(`stats.range.${r}`)}
              </button>
            ))}
            <button
              type="button"
              disabled={stats.plays === 0}
              onClick={async () => {
                await downloadShareCard({
                  stats,
                  rangeLabel,
                  userName: userDisplayName(user) ?? "Liner",
                  labels: {
                    minutes: t("stats.minutes_listened"),
                    topSongs: t("stats.top_songs"),
                    topArtists: t("stats.top_artists"),
                    footer: "Liner 2.0",
                  },
                });
                showToast(t("stats.card_saved"), "success");
              }}
              className="ml-1 inline-flex items-center gap-1.5 rounded-full border-0 bg-btn-primary-bg px-3.5 py-1.5 text-[13px] font-semibold text-btn-primary-text cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Share2Line size={14} />
              {t("stats.share_card")}
            </button>
          </div>
        </header>

        {stats.plays === 0 ? (
          <div className="rounded-[16px] bg-bg-elevated/50 px-6 py-10 text-center text-[14px] text-text-tertiary">
            {t("stats.empty")}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatTile value={formatMinutes(stats.totalMs)} label={t("stats.minutes_listened")} />
              <StatTile value={stats.plays.toLocaleString()} label={t("stats.plays")} />
              <StatTile value={stats.uniqueTracks.toLocaleString()} label={t("stats.songs")} />
              <StatTile value={stats.uniqueArtists.toLocaleString()} label={t("stats.artists")} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="flex flex-col gap-2">
                <h2 className="m-0 text-[16px] font-[650] text-text-primary">{t("stats.top_songs")}</h2>
                {stats.topTracks.map((row, i) => (
                  <button
                    key={row.track.id}
                    type="button"
                    onClick={() => void playerEngine.playTrack(row.track)}
                    className="group flex items-center gap-3 rounded-[12px] border-0 bg-transparent px-2 py-1.5 text-left transition-colors hover:bg-bg-elevated/60 cursor-pointer"
                  >
                    <span className="w-5 text-right text-[13px] font-[600] text-text-tertiary tabular-nums">{i + 1}</span>
                    <span className="relative h-[42px] w-[42px] shrink-0 overflow-hidden rounded-[8px] bg-bg-elevated">
                      {row.track.coverUrl ? (
                        <CoverImage src={row.track.coverUrl} alt="" fill sizes="42px" className="object-cover" unoptimized />
                      ) : null}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[14px] font-[550] text-text-primary">{row.track.title}</span>
                      <span className="truncate text-[12.5px] text-text-tertiary">{row.track.artists}</span>
                    </span>
                    <span className="shrink-0 text-[12px] text-text-tertiary tabular-nums">
                      {t("stats.play_count", { count: row.plays })}
                    </span>
                  </button>
                ))}
              </section>

              <section className="flex flex-col gap-2">
                <h2 className="m-0 text-[16px] font-[650] text-text-primary">{t("stats.top_artists")}</h2>
                {stats.topArtists.map((a, i) => (
                  <div key={a.name} className="flex items-center gap-3 rounded-[12px] px-2 py-1.5">
                    <span className="w-5 text-right text-[13px] font-[600] text-text-tertiary tabular-nums">{i + 1}</span>
                    <span className="relative h-[42px] w-[42px] shrink-0 overflow-hidden rounded-full bg-bg-elevated">
                      {a.coverUrl ? (
                        <CoverImage src={a.coverUrl} alt="" fill sizes="42px" className="object-cover" unoptimized />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[14px] font-[550] text-text-primary">{a.name}</span>
                    <span className="shrink-0 text-[12px] text-text-tertiary tabular-nums">
                      {t("stats.minutes_short", { count: Math.round(a.ms / 60_000) })}
                    </span>
                  </div>
                ))}
              </section>
            </div>

            <section className="flex flex-col gap-3">
              <h2 className="m-0 text-[16px] font-[650] text-text-primary">{t("stats.by_hour")}</h2>
              <div className="flex h-[120px] items-end gap-[4px] rounded-[14px] bg-bg-elevated/50 px-4 pt-4 pb-2">
                {stats.byHour.map((ms, h) => (
                  <div key={h} className="flex flex-1 flex-col items-center gap-1" title={`${h}:00 · ${formatMinutes(ms)} min`}>
                    <div
                      className="w-full rounded-[3px] bg-accent-primary/80"
                      style={{ height: `${Math.max(2, (ms / peakHour) * 84)}px` }}
                    />
                    <span className="text-[9.5px] text-text-tertiary tabular-nums">{h % 3 === 0 ? h : ""}</span>
                  </div>
                ))}
              </div>
            </section>

            <Link to="/history" className="self-start text-[13px] text-text-secondary underline-offset-4 hover:text-text-primary hover:underline">
              {t("stats.see_history")}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
