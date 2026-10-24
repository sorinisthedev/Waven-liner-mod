import { memo, useMemo, useState } from "react";
import { useTranslation } from "@/languages";
import { useAuthStore } from "@/features/auth/store/authStore";
import { CurrentUserAvatar } from "@/features/personalization";
import { cn } from "@/shared/lib";
import {
  SunriseFill,
  Sun2Fill,
  SunsetFill,
  MoonStarsFill,
  PlayFill,
  Pencil2Line,
} from "@mingcute/react";
import { useModalStore } from "@/features/library/store/modalStore";

export type HomeFilterCategory =
  "all" | "mixes" | "charts" | "albums" | "speedDial";

export interface HomePageHeaderProps {
  activeFilter: HomeFilterCategory;
  onFilterChange: (filter: HomeFilterCategory) => void;
  onQuickPlay?: () => void;
  hasQuickData?: boolean;
  canQuickPlay?: boolean;
}

function HomePageHeader({
  activeFilter,
  onFilterChange,
  onQuickPlay,
  hasQuickData = false,
  canQuickPlay = false,
}: HomePageHeaderProps) {
  const { t, locale } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const openSettingsTab = useModalStore((s) => s.openSettingsTab);

  const [currentDate] = useState(() => new Date());

  const { greeting, VibeIcon, vibeColor } = useMemo(() => {
    const hour = currentDate.getHours();
    if (hour >= 5 && hour < 12) {
      return {
        greeting: t("home.goodMorning") || "Good morning",
        VibeIcon: SunriseFill,
        vibeColor: "text-amber-400",
      };
    }
    if (hour >= 12 && hour < 17) {
      return {
        greeting: t("home.goodAfternoon") || "Good afternoon",
        VibeIcon: Sun2Fill,
        vibeColor: "text-amber-300",
      };
    }
    if (hour >= 17 && hour < 22) {
      return {
        greeting: t("home.goodEvening") || "Good evening",
        VibeIcon: SunsetFill,
        vibeColor: "text-rose-400",
      };
    }
    return {
      greeting: t("home.goodNight") || "Good night",
      VibeIcon: MoonStarsFill,
      vibeColor: "text-indigo-400",
    };
  }, [t, currentDate]);

  const dateFormatted = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(locale || "en", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(currentDate);
    } catch {
      return "";
    }
  }, [locale, currentDate]);

  const displayName = user?.displayName || user?.username;

  const filters = useMemo(() => {
    const list: { id: HomeFilterCategory; label: string }[] = [
      { id: "all", label: t("home.all") || "All" },
    ];
    if (hasQuickData) {
      list.push({
        id: "speedDial",
        label: t("home.speedDial") || "Speed dial",
      });
    }
    list.push(
      { id: "mixes", label: t("home.filter_mixes") || "Mixes" },
      { id: "charts", label: t("home.filter_charts") || "Charts" },
      { id: "albums", label: t("home.filter_albums") || "Albums" },
    );
    return list;
  }, [t, hasQuickData]);

  return (
    <header className="relative w-full select-none" data-window-drag>
      <div className="pt-[20px] pb-[8px] px-8 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <button
              type="button"
              onClick={() => openSettingsTab("Profile")}
              title={t("settings.profile.edit_profile") || "Edit profile"}
              aria-label={t("settings.profile.edit_profile") || "Edit profile"}
              className="group relative shrink-0 p-0 border-0 bg-transparent cursor-pointer rounded-[10px] transition-transform active:scale-95"
              data-no-window-drag
            >
              <CurrentUserAvatar user={user} size={44} className="!rounded-[10px]" />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[inherit] bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
                <Pencil2Line size={16} />
              </span>
            </button>

            <div className="flex flex-col gap-0.5 min-w-0">
              <h1 className="text-[26px] font-[700] text-text-primary tracking-[-0.03em] leading-[1.15] m-0 font-sans">
                {greeting}
                {displayName ? (
                  <span className="text-text-tertiary font-[500]">
                    , {displayName}
                  </span>
                ) : null}
              </h1>

              <div className="flex items-center gap-1.5">
                <VibeIcon className={cn("w-3.5 h-3.5", vibeColor)} />
                {dateFormatted && (
                  <span className="text-[12.5px] font-[450] text-text-tertiary tracking-tight font-sans">
                    {dateFormatted}
                  </span>
                )}
              </div>
            </div>
          </div>

          {canQuickPlay && onQuickPlay && (
            <button
              type="button"
              onClick={onQuickPlay}
              data-no-window-drag
              className={cn(
                "group flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold cursor-pointer transition-colors duration-150 active:scale-95 shrink-0 mt-1 font-sans",
                "bg-btn-primary-bg text-btn-primary-text",
              )}
            >
              <PlayFill className="w-3.5 h-3.5 fill-current" />
              <span>{t("home.quickPlay") || "Quick Play"}</span>
            </button>
          )}
        </div>

        <div
          className="flex items-center gap-2 overflow-x-auto no-scrollbar"
          data-no-window-drag
        >
          {filters.map((filter) => {
            const isActive = activeFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => onFilterChange(filter.id)}
                className={cn(
                  "relative px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors duration-150 cursor-pointer active:scale-95 shrink-0 select-none font-sans",
                  isActive
                    ? "bg-text-primary text-bg-canvas font-semibold"
                    : "bg-bg-elevated text-text-secondary hover:text-text-primary",
                )}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}

export default memo(HomePageHeader);
