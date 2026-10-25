import { useState, useEffect } from "react";
import PopularTracksSection from "./PopularTracksSection";
import DailyMixesSection from "./DailyMixesSection";
import HomePageSkeleton from "./HomePageSkeleton";
import { usePopularTracksAllTime } from "../hooks/usePopularTracks";
import { useListeningNow } from "../hooks/useListeningNow";
import ListeningNowSection from "./ListeningNowSection";
import { useRecentlyPlayed } from "../hooks/useRecentlyPlayed";
import { useDailyMixes } from "../hooks/useDailyMixes";
import { useMostSaved, usePopularAlbums } from "../hooks/useExploreCollections";
import { useTranslation } from "@/languages";
import { useAuthStore } from "@/features/auth/store/authStore";

export default function HomePage() {
  const { t } = useTranslation();

  const { tracks: listeningNow, isLoading: tracksLoading } = useListeningNow();
  const { data: popularTracksAllTime, isLoading: allTimeLoading } =
    usePopularTracksAllTime(20);
  const { data: recentlyPlayed, isLoading: recentLoading } =
    useRecentlyPlayed(20);
  const { items: popularAlbums, isLoading: albumsLoading } = usePopularAlbums();
  const { items: mostSaved, isLoading: savedLoading } = useMostSaved();
  const { data: dailyMixes } = useDailyMixes();
  const hasMixes = Boolean(dailyMixes && dailyMixes.length > 0);
  const displayName = useAuthStore((s) => s.user?.displayName?.trim());
  const [now] = useState(() => new Date());
  const hour = now.getHours();
  const greeting =
    hour >= 5 && hour < 12
      ? t("home.goodMorning")
      : hour >= 12 && hour < 17
        ? t("home.goodAfternoon")
        : hour >= 17 && hour < 22
          ? t("home.goodEvening")
          : t("home.goodNight");
  const dateLabel = (() => {
    try {
      return new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(now);
    } catch {
      return "";
    }
  })();

  const isDataLoading =
    tracksLoading ||
    allTimeLoading ||
    recentLoading ||
    albumsLoading ||
    savedLoading;

  const isReady = !isDataLoading;
  const [skeletonExited, setSkeletonExited] = useState(() => !isDataLoading);

  useEffect(() => {
    if (isReady && !skeletonExited) {
      const timer = setTimeout(() => {
        setSkeletonExited(true);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isReady, skeletonExited]);

  return (
    <div className="relative h-full w-full overflow-y-auto overflow-x-hidden bg-transparent pt-(--page-inset-top) pb-(--page-inset-bottom)">
      <div className="relative z-1 grid grid-cols-1 items-start w-full">
        {isReady && (
          <div className="col-start-1 row-start-1 w-full px-3 pb-[28px]">
            <header className="px-3 pt-[18px]" data-window-drag>
              <h1 className="m-0 text-[30px] font-[700] leading-tight tracking-[-0.03em] text-text-primary">
                {greeting}
                {displayName ? <span className="text-text-tertiary">, {displayName}</span> : null}
              </h1>
              {dateLabel && <p className="m-0 mt-[4px] text-[13px] text-text-tertiary">{dateLabel}</p>}
            </header>

            {dailyMixes && hasMixes && (
              <DailyMixesSection mixes={dailyMixes} headingMarginTop="mt-[28px]" />
            )}

            {popularAlbums.length >= 3 && (
              <PopularTracksSection
                title={t("home.popularAlbums")}
                items={popularAlbums}
              />
            )}

            {listeningNow.length > 0 && (
              <ListeningNowSection
                title={t("home.whatEveryonesOn")}
                tracks={listeningNow}
              />
            )}

            {recentlyPlayed && recentlyPlayed.length > 0 && (
              <PopularTracksSection
                title={t("home.jumpBackIn")}
                items={recentlyPlayed}
              />
            )}

            {popularTracksAllTime && popularTracksAllTime.length > 0 && (
              <PopularTracksSection
                title={t("home.mostListened")}
                items={popularTracksAllTime}
              />
            )}

            {mostSaved.length > 0 && (
              <PopularTracksSection
                title={t("home.mostSaved")}
                items={mostSaved}
              />
            )}

          </div>
        )}

        {!skeletonExited && (
          <div
            className={`col-start-1 row-start-1 w-full z-10 transition-opacity duration-300 ease-out ${
              isReady
                ? "opacity-0 pointer-events-none"
                : "opacity-100 pointer-events-auto"
            }`}
            onTransitionEnd={() => setSkeletonExited(true)}
          >
            <HomePageSkeleton />
          </div>
        )}
      </div>
    </div>
  );
}
