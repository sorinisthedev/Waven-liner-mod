import { useEffect, useState } from "react";
import { MoonStarsLine, CloseLine } from "@mingcute/react";
import { useTranslation } from "@/languages";
import { formatRemaining, useSleepTimerStore } from "../store/sleepTimerStore";

/** small header pill showing the running sleep timer, click to cancel */
export function SleepTimerChip() {
  const { t } = useTranslation();
  const mode = useSleepTimerStore((s) => s.mode);
  const endsAt = useSleepTimerStore((s) => s.endsAt);
  const cancel = useSleepTimerStore((s) => s.cancel);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (mode !== "time") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [mode]);

  if (!mode) return null;

  const label =
    mode === "time" && endsAt
      ? formatRemaining(endsAt - now)
      : t("settings.sound.sleep_end_of_track_short");

  return (
    <button
      type="button"
      onClick={cancel}
      title={t("settings.sound.sleep_cancel")}
      data-no-window-drag
      className="group inline-flex h-[28px] items-center gap-[6px] rounded-full border-0 bg-bg-toolbox px-[10px] text-[12px] font-[500] text-text-secondary tabular-nums transition-colors hover:bg-bg-toolbox-active hover:text-text-primary cursor-pointer"
      style={{ fontFamily: "var(--font-inter), sans-serif" }}
    >
      <MoonStarsLine size={14} className="text-indigo-400 group-hover:hidden" />
      <CloseLine size={14} className="hidden group-hover:block" />
      {label}
    </button>
  );
}

export default SleepTimerChip;
