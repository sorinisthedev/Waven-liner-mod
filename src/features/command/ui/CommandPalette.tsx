import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  Search2Line,
  Home7Line,
  BookmarksLine,
  ChartBarLine,
  HistoryLine,
  PlayLine,
  SkipForwardLine,
  SkipPreviousLine,
  ShuffleLine,
  MoonStarsLine,
  Leaf3Line,
  Settings4Line,
  KeyboardLine,
  HeartLine,
  PlaylistLine,
  SunLine,
  MicLine,
} from "@mingcute/react";
import { useTranslation } from "@/languages";
import { playerEngine, usePlayerStore } from "@/features/player";
import { useModalStore } from "@/features/library/store/modalStore";
import { usePlaylistsList } from "@/features/library/hooks";
import { usePersonalizationStore } from "@/features/personalization/store/personalizationStore";
import { useSleepTimerStore } from "@/features/sound/store/sleepTimerStore";
import { useSoundStore } from "@/features/sound/store/soundStore";
import { showToast } from "@/shared/ui";
import { fuzzyScore, useCommandStore } from "../store/commandStore";

interface Command {
  id: string;
  label: string;
  group: string;
  icon: ReactNode;
  keywords?: string;
  run: () => void;
}

const SETTINGS_TABS = [
  "Profile",
  "Personalize",
  "Sound",
  "Playback",
  "Appearance",
  "Shortcuts",
  "Overlay",
  "Storage",
  "About",
] as const;

export function CommandPalette() {
  const { t } = useTranslation();
  const open = useCommandStore((s) => s.paletteOpen);
  const setOpen = useCommandStore((s) => s.setPaletteOpen);
  const setCheatSheetOpen = useCommandStore((s) => s.setCheatSheetOpen);
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const playlists = usePlaylistsList();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const go = (path: string) => () => navigate(path);
    const nav = t("command.group.navigate");
    const play = t("command.group.playback");
    const tools = t("command.group.tools");
    const settings = t("command.group.settings");
    const lists = t("command.group.playlists");
    const sleep = useSleepTimerStore.getState();
    const sound = useSoundStore.getState();
    const perf = usePersonalizationStore.getState();
    const iconSize = 17;

    const out: Command[] = [
      { id: "home", group: nav, label: t("common.sidebar.home"), icon: <Home7Line size={iconSize} />, run: go("/") },
      { id: "library", group: nav, label: t("common.sidebar.library"), icon: <BookmarksLine size={iconSize} />, run: go("/library") },
      { id: "likes", group: nav, label: t("playlist.liked_songs"), icon: <HeartLine size={iconSize} />, run: go("/library/playlist?id=likes") },
      { id: "stats", group: nav, label: t("common.sidebar.stats"), icon: <ChartBarLine size={iconSize} />, keywords: "wrapped top", run: go("/stats") },
      { id: "history", group: nav, label: t("common.sidebar.history"), icon: <HistoryLine size={iconSize} />, keywords: "recent played", run: go("/history") },
      { id: "search", group: nav, label: t("command.open_search"), icon: <Search2Line size={iconSize} />, run: () => useModalStore.getState().openSearch() },

      { id: "toggle-play", group: play, label: t("command.play_pause"), icon: <PlayLine size={iconSize} />, run: () => playerEngine.togglePlayPause() },
      { id: "next", group: play, label: t("command.next"), icon: <SkipForwardLine size={iconSize} />, run: () => void playerEngine.skipNext() },
      { id: "prev", group: play, label: t("command.previous"), icon: <SkipPreviousLine size={iconSize} />, run: () => void playerEngine.skipPrevious() },
      {
        id: "shuffle",
        group: play,
        label: t("command.shuffle"),
        icon: <ShuffleLine size={iconSize} />,
        run: () => playerEngine.setShuffle(!usePlayerStore.getState().shuffle),
      },
      ...[15, 30, 60].map((m) => ({
        id: `sleep-${m}`,
        group: play,
        label: t("command.sleep_in", { count: m }),
        icon: <MoonStarsLine size={iconSize} />,
        keywords: "timer",
        run: () => {
          useSleepTimerStore.getState().startMinutes(m);
          showToast(t("command.sleep_set", { count: m }), "info");
        },
      })),
      ...(sleep.mode
        ? [{ id: "sleep-cancel", group: play, label: t("settings.sound.sleep_cancel"), icon: <MoonStarsLine size={iconSize} />, run: () => useSleepTimerStore.getState().cancel() }]
        : []),

      {
        id: "performance",
        group: tools,
        label: perf.performanceMode ? t("command.performance_off") : t("command.performance_on"),
        icon: <Leaf3Line size={iconSize} />,
        run: () => usePersonalizationStore.getState().setPerformanceMode(!perf.performanceMode),
      },
      {
        id: "theme",
        group: tools,
        label: resolvedTheme === "dark" ? t("command.light_theme") : t("command.dark_theme"),
        icon: <SunLine size={iconSize} />,
        run: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
      },
      {
        id: "eq",
        group: tools,
        label: sound.eqEnabled ? t("command.eq_off") : t("command.eq_on"),
        icon: <Settings4Line size={iconSize} />,
        keywords: "equalizer bass",
        run: () => useSoundStore.getState().setEqEnabled(!sound.eqEnabled),
      },
      {
        id: "karaoke",
        group: tools,
        label: sound.karaoke ? t("command.karaoke_off") : t("command.karaoke_on"),
        icon: <MicLine size={iconSize} />,
        keywords: "vocals sing",
        run: () => useSoundStore.getState().setKaraoke(!sound.karaoke),
      },
      {
        id: "shortcuts",
        group: tools,
        label: t("command.shortcuts"),
        icon: <KeyboardLine size={iconSize} />,
        keywords: "keys help",
        run: () => setCheatSheetOpen(true),
      },
      ...SETTINGS_TABS.map((tab) => ({
        id: `settings-${tab}`,
        group: settings,
        label: t("command.open_settings", { tab: t(`settings.tabs.${tab.toLowerCase()}`) }),
        icon: <Settings4Line size={iconSize} />,
        run: () => useModalStore.getState().openSettingsTab(tab),
      })),
      ...(playlists.data?.playlists ?? []).map((p) => ({
        id: `playlist-${p.id}`,
        group: lists,
        label: p.title,
        icon: <PlaylistLine size={iconSize} />,
        run: go(`/library/playlist?id=${encodeURIComponent(p.id)}`),
      })),
    ];
    return out;
    // recomputed on open so toggle labels show the current state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, t, navigate, playlists.data, resolvedTheme, setTheme, setCheatSheetOpen]);

  const results = useMemo(() => {
    if (!query.trim()) return commands.filter((c) => !c.id.startsWith("playlist-")).slice(0, 40);
    return commands
      .map((c) => ({ c, score: fuzzyScore(query, `${c.label} ${c.keywords ?? ""}`) }))
      .filter((r) => r.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 40)
      .map((r) => r.c);
  }, [commands, query]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${index}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [index]);

  if (!open) return null;

  const runAt = (i: number) => {
    const cmd = results[i];
    if (!cmd) return;
    setOpen(false);
    cmd.run();
  };

  let lastGroup = "";
  return (
    <div
      className="fixed inset-0 z-[300] flex justify-center bg-black/30 pt-[14vh]"
      data-dialog-container
      onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
    >
      <div
        role="dialog"
        aria-label={t("command.title")}
        className="flex h-fit max-h-[60vh] w-[560px] max-w-[92vw] flex-col overflow-hidden rounded-[16px] border border-border-alpha-14 bg-bg-surface/95 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-[30px]"
      >
        <div className="flex items-center gap-[10px] border-b border-border-alpha-14 px-[16px]">
          <Search2Line size={18} className="shrink-0 text-text-tertiary" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("command.placeholder")}
            data-testid="command-input"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(results.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                runAt(index);
              } else if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
              }
            }}
            className="h-[52px] flex-1 border-0 bg-transparent text-[15px] text-text-primary outline-none placeholder:text-text-tertiary"
          />
          <kbd className="rounded-[6px] bg-bg-elevated px-[6px] py-[2px] text-[11px] text-text-tertiary">Esc</kbd>
        </div>
        <div ref={listRef} className="overflow-y-auto p-[6px]">
          {results.length === 0 ? (
            <p className="m-0 px-3 py-6 text-center text-[13px] text-text-tertiary">{t("command.no_results")}</p>
          ) : (
            results.map((cmd, i) => {
              // ranked results jump between groups, so headers only make sense unfiltered
              const searching = query.trim().length > 0;
              const header = !searching && cmd.group !== lastGroup ? cmd.group : null;
              lastGroup = cmd.group;
              return (
                <div key={cmd.id}>
                  {header && (
                    <p className="m-0 px-[10px] pt-[8px] pb-[4px] text-[11px] font-[600] uppercase tracking-wide text-text-tertiary">
                      {header}
                    </p>
                  )}
                  <button
                    type="button"
                    data-index={i}
                    onMouseMove={() => setIndex(i)}
                    onClick={() => runAt(i)}
                    className={`flex w-full items-center gap-[10px] rounded-[10px] border-0 px-[10px] py-[8px] text-left text-[13.5px] cursor-pointer ${
                      i === index ? "bg-text-primary/10 text-text-primary" : "bg-transparent text-text-secondary"
                    }`}
                  >
                    <span className="shrink-0 text-text-tertiary">{cmd.icon}</span>
                    <span className="flex-1 truncate">{cmd.label}</span>
                    {searching && (
                      <span className="shrink-0 text-[11px] text-text-tertiary">{cmd.group}</span>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
