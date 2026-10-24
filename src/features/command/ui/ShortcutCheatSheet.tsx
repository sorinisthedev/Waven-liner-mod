import { CloseLine } from "@mingcute/react";
import { useTranslation } from "@/languages";
import { useShortcutsStore } from "@/features/shortcuts/store/shortcutsStore";
import { getAcceleratorKeycaps } from "@/features/shortcuts/utils/shortcutMatching";
import { useCommandStore } from "../store/commandStore";

const MAIN_ROWS: [string, string][] = [
  ["playPause", "play_pause"],
  ["nextTrack", "next_track"],
  ["prevTrack", "prev_track"],
  ["seekForward", "seek_forward"],
  ["seekBackward", "seek_backward"],
  ["volumeUp", "volume_up"],
  ["volumeDown", "volume_down"],
  ["toggleMute", "toggle_mute"],
  ["search", "search"],
  ["toggleQueue", "toggle_queue"],
  ["toggleFullscreen", "toggle_fullscreen"],
];

const GLOBAL_ROWS: [string, string][] = [
  ["toggleOverlay", "toggle_overlay"],
  ["quickLikeSong", "quick_like_song"],
];

function Keys({ accelerator }: { accelerator: string }) {
  return (
    <span className="flex shrink-0 items-center gap-[4px]">
      {getAcceleratorKeycaps(accelerator).map((k, i) => (
        <kbd
          key={i}
          className="min-w-[24px] rounded-[6px] border border-border-alpha-14 bg-bg-elevated px-[7px] py-[2px] text-center text-[11.5px] font-[500] text-text-secondary"
        >
          {k}
        </kbd>
      ))}
    </span>
  );
}

export function ShortcutCheatSheet() {
  const { t } = useTranslation();
  const open = useCommandStore((s) => s.cheatSheetOpen);
  const setOpen = useCommandStore((s) => s.setCheatSheetOpen);
  const mainApp = useShortcutsStore((s) => s.mainApp) as unknown as Record<string, string>;
  const global = useShortcutsStore((s) => s.global) as unknown as Record<string, string>;

  if (!open) return null;

  const section = (title: string, rows: [string, string][], values: Record<string, string>) => (
    <section className="flex flex-col gap-[2px]">
      <h3 className="m-0 pb-[6px] text-[11px] font-[600] uppercase tracking-wide text-text-tertiary">{title}</h3>
      {rows.map(([key, label]) => (
        <div key={key} className="flex items-center justify-between gap-4 py-[5px] text-[13px] text-text-primary">
          <span className="truncate">{t(`settings.shortcuts.${label}`)}</span>
          <Keys accelerator={values[key] ?? ""} />
        </div>
      ))}
    </section>
  );

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/35"
      data-dialog-container
      onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
      onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
    >
      <div
        role="dialog"
        aria-label={t("command.shortcuts")}
        className="flex max-h-[80vh] w-[640px] max-w-[92vw] flex-col gap-4 overflow-y-auto rounded-[16px] border border-border-alpha-14 bg-bg-surface/95 p-[22px] shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
      >
        <div className="flex items-center justify-between">
          <h2 className="m-0 text-[18px] font-[700] text-text-primary">{t("command.shortcuts")}</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("common.close")}
            className="inline-flex h-[28px] w-[28px] items-center justify-center rounded-md border-0 bg-transparent text-text-tertiary hover:bg-border-alpha-14 hover:text-text-primary cursor-pointer"
          >
            <CloseLine size={17} />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {section(t("settings.shortcuts.main_app_section"), MAIN_ROWS, mainApp)}
          <div className="flex flex-col gap-6">
            {section(t("settings.shortcuts.global_section"), GLOBAL_ROWS, global)}
            <section className="flex flex-col gap-[2px]">
              <h3 className="m-0 pb-[6px] text-[11px] font-[600] uppercase tracking-wide text-text-tertiary">
                {t("command.group.liner2")}
              </h3>
              <div className="flex items-center justify-between gap-4 py-[5px] text-[13px] text-text-primary">
                <span>{t("command.title")}</span>
                <Keys accelerator="Control+K" />
              </div>
              <div className="flex items-center justify-between gap-4 py-[5px] text-[13px] text-text-primary">
                <span>{t("command.shortcuts")}</span>
                <Keys accelerator="Shift+?" />
              </div>
            </section>
          </div>
        </div>
        <p className="m-0 text-[12px] text-text-tertiary">{t("command.shortcuts_hint")}</p>
      </div>
    </div>
  );
}

export default ShortcutCheatSheet;
