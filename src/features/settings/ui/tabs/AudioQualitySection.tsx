import { useEffect, useState } from "react";
import { useTranslation } from "@/languages";
import { MenuSelect, ToggleSwitch } from "@/shared/ui";
import { usePlayerStore } from "@/features/player";
import { pitchShifter } from "@/features/player/engine/pitchShifter";
import { useSoundStore } from "@/features/sound";
import { SettingRow, SettingSection } from "../controls";

const font = { fontFamily: "var(--font-inter), sans-serif" } as const;

function useOutputDevices() {
  const [devices, setDevices] = useState<{ id: string; label: string }[]>([]);
  useEffect(() => {
    const md = navigator.mediaDevices;
    if (!md?.enumerateDevices) return;
    const load = () =>
      void md
        .enumerateDevices()
        .then((list) =>
          setDevices(
            list
              .filter((d) => d.kind === "audiooutput" && d.deviceId !== "default" && d.deviceId !== "communications")
              .map((d, i) => ({ id: d.deviceId, label: d.label || `Output ${i + 1}` })),
          ),
        )
        .catch(() => {});
    load();
    md.addEventListener("devicechange", load);
    return () => md.removeEventListener("devicechange", load);
  }, []);
  return devices;
}

export function AudioQualitySection({ searchQuery }: { searchQuery?: string }) {
  const { t } = useTranslation();
  const audioQuality = usePlayerStore((s) => s.audioQuality);
  const setAudioQuality = usePlayerStore((s) => s.setAudioQuality);
  const pureMode = useSoundStore((s) => s.pureMode);
  const setPureMode = useSoundStore((s) => s.setPureMode);
  const showBadge = useSoundStore((s) => s.showQualityBadge);
  const setShowBadge = useSoundStore((s) => s.setShowQualityBadge);
  const outputDeviceId = useSoundStore((s) => s.outputDeviceId);
  const setOutputDeviceId = useSoundStore((s) => s.setOutputDeviceId);
  const devices = useOutputDevices();
  const [needsRestart, setNeedsRestart] = useState(false);

  const qualityValue = audioQuality === "low" || audioQuality === "standard" ? audioQuality : "high";
  const deviceOptions = [
    { value: "", label: t("settings.sound.device_default") },
    ...devices.map((d) => ({ value: d.id, label: d.label })),
  ];
  // a device that was unplugged still shows as the default
  const deviceValue = devices.some((d) => d.id === outputDeviceId) ? outputDeviceId : "";

  return (
    <SettingSection label={t("settings.sound.quality_section")}>
      <SettingRow
        title={t("settings.sound.quality_title")}
        description={t("settings.sound.quality_description")}
        titleKey="settings.sound.quality_title"
        descKey="settings.sound.quality_description"
        searchQuery={searchQuery}
        explained
        control={
          <MenuSelect
            options={[
              { value: "high", label: t("settings.sound.quality_best") },
              { value: "standard", label: t("settings.sound.quality_balanced") },
              { value: "low", label: t("settings.sound.quality_saver") },
            ]}
            value={qualityValue}
            onChange={(v: string) => setAudioQuality(v as "high" | "standard" | "low")}
            className="min-w-[150px]"
            aria-label={t("settings.sound.quality_title")}
          />
        }
      />
      <SettingRow
        title={t("settings.sound.device_title")}
        description={t("settings.sound.device_description")}
        titleKey="settings.sound.device_title"
        descKey="settings.sound.device_description"
        searchQuery={searchQuery}
        explained
        control={
          <MenuSelect
            options={deviceOptions}
            value={deviceValue}
            onChange={(v: string) => setOutputDeviceId(v)}
            className="min-w-[190px] max-w-[240px]"
            aria-label={t("settings.sound.device_title")}
          />
        }
      />
      <SettingRow
        title={t("settings.sound.pure_title")}
        description={t("settings.sound.pure_description")}
        titleKey="settings.sound.pure_title"
        descKey="settings.sound.pure_description"
        searchQuery={searchQuery}
        explained
        control={
          <ToggleSwitch
            checked={pureMode}
            onChange={(on: boolean) => {
              setPureMode(on);
              if (!on) {
                setNeedsRestart(false);
                return;
              }
              const player = usePlayerStore.getState();
              player.resetSpeedAndPitch();
              player.setIsReverbEnabled(false);
              // once audio has gone through the effects graph it stays there until restart
              setNeedsRestart(pitchShifter.isAttached());
            }}
            ariaLabel={t("settings.sound.pure_title")}
          />
        }
      />
      {needsRestart && pureMode && (
        <p className="m-0 -mt-[4px] px-[2px] text-[12px] text-amber-600 dark:text-amber-300" style={font}>
          {t("settings.sound.pure_restart")}
        </p>
      )}
      <SettingRow
        title={t("settings.sound.badge_title")}
        description={t("settings.sound.badge_description")}
        titleKey="settings.sound.badge_title"
        descKey="settings.sound.badge_description"
        searchQuery={searchQuery}
        explained
        control={<ToggleSwitch checked={showBadge} onChange={setShowBadge} ariaLabel={t("settings.sound.badge_title")} />}
      />
    </SettingSection>
  );
}

export default AudioQualitySection;
