import { useTranslation } from "@/languages";
import Tooltip from "@/shared/ui/Tooltip";
import { useSoundStore } from "@/features/sound/store/soundStore";
import { pitchShifter } from "../engine/pitchShifter";
import { codecName, qualityLabel, useStreamInfoStore } from "../store/streamInfoStore";

/** small pill on the player bar saying what quality is playing */
export function QualityBadge({ trackId }: { trackId: string | undefined }) {
  const { t } = useTranslation();
  const info = useStreamInfoStore((s) => s.info);
  const show = useSoundStore((s) => s.showQualityBadge);
  if (!show || !info || !trackId || info.trackId !== trackId) return null;

  const pure = !pitchShifter.isAttached();
  const lines = [
    `${codecName(info.codec)}${info.bitrateKbps > 0 ? ` · ${info.bitrateKbps} kbps` : ""}`,
    info.sampleRate
      ? `${info.bitDepth ? `${info.bitDepth}-bit · ` : ""}${(info.sampleRate / 1000).toFixed(1).replace(/\.0$/, "")} kHz`
      : "",
    info.lossless ? t("settings.sound.quality_lossless") : t("settings.sound.quality_lossy"),
    t(`settings.sound.quality_origin_${info.origin}`),
    pure ? t("settings.sound.quality_pure") : t("settings.sound.quality_processed"),
  ].filter(Boolean);

  return (
    <Tooltip content={lines.join("\n")} side="top" multiline>
      <span
        data-testid="quality-badge"
        className={`pointer-events-auto inline-flex h-[16px] shrink-0 cursor-default items-center rounded-[4px] px-[5px] text-[9.5px] font-[700] leading-none tracking-[0.04em] ${
          info.lossless
            ? "bg-[#d4b25c]/20 text-[#b8942f] dark:text-[#e6c975]"
            : "bg-black/[0.07] text-text-tertiary dark:bg-white/[0.1]"
        }`}
        style={{ fontFamily: "var(--font-inter), sans-serif" }}
      >
        {qualityLabel(info)}
      </span>
    </Tooltip>
  );
}

export default QualityBadge;
