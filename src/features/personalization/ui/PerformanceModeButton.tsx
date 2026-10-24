import { Leaf3Fill, Leaf3Line } from "@mingcute/react";
import { useTranslation } from "@/languages";
import { showToast } from "@/shared/ui";
import { usePersonalizationStore } from "../store/personalizationStore";

/** header quick toggle for performance mode */
export function PerformanceModeButton() {
  const { t } = useTranslation();
  const enabled = usePersonalizationStore((s) => s.performanceMode);
  const setPerformanceMode = usePersonalizationStore((s) => s.setPerformanceMode);
  const label = enabled
    ? t("settings.performance.button_on")
    : t("settings.performance.button_off");

  return (
    <button
      type="button"
      onClick={() => {
        setPerformanceMode(!enabled);
        showToast(
          enabled ? t("settings.performance.toast_off") : t("settings.performance.toast_on"),
          "info",
        );
      }}
      aria-pressed={enabled}
      aria-label={label}
      title={label}
      data-no-window-drag
      data-testid="performance-mode-button"
      className={`inline-flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border-0 backdrop-blur-[20px] transition-colors cursor-pointer ${
        enabled
          ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
          : "bg-bg-glass text-text-tertiary hover:text-text-primary"
      }`}
    >
      {enabled ? <Leaf3Fill size={18} /> : <Leaf3Line size={18} />}
    </button>
  );
}

export default PerformanceModeButton;
