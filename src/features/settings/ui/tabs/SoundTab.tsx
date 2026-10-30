import { useEffect, useState } from "react";
import { MoonStarsLine } from "@mingcute/react";
import { useTranslation } from "@/languages";
import { MenuSelect, Slider, ToggleSwitch } from "@/shared/ui";
import { usePlayerStore } from "@/features/player";
import {
  CROSSFADE_MAX_SEC,
  useAlarmStore,
  EQ_BAND_LABELS,
  EQ_MAX_DB,
  EQ_MIN_DB,
  EQ_PRESETS,
  formatRemaining,
  useSleepTimerStore,
  useSoundStore,
} from "@/features/sound";
import { SettingBlock, SettingRow, SettingSection } from "../controls";
import { AudioQualitySection } from "./AudioQualitySection";

const font = { fontFamily: "var(--font-inter), sans-serif" } as const;

const SLEEP_MINUTES = [15, 30, 45, 60, 90] as const;

const chip =
  "inline-flex h-[30px] items-center whitespace-nowrap rounded-[9px] border-0 px-[12px] text-[12.5px] leading-none transition-colors cursor-pointer";
const chipIdle =
  "bg-black/[0.06] text-text-primary hover:bg-black/[0.1] dark:bg-black/30 dark:hover:bg-black/40";
const chipActive = "bg-text-primary/80 text-bg-primary";

function EqualizerBands() {
  const { t } = useTranslation();
  const gains = useSoundStore((s) => s.eqGains);
  const enabled = useSoundStore((s) => s.eqEnabled);
  const setEqBand = useSoundStore((s) => s.setEqBand);

  return (
    <div
      className={`flex items-stretch justify-between gap-[4px] rounded-[10px] bg-black/[0.04] px-[10px] pt-[10px] pb-[8px] transition-opacity dark:bg-black/20 ${
        enabled ? "" : "opacity-50"
      }`}
    >
      <div
        className="flex flex-col justify-between pb-[18px] text-[10px] text-text-tertiary tabular-nums"
        style={font}
        aria-hidden
      >
        <span>+{EQ_MAX_DB}</span>
        <span>0</span>
        <span>{EQ_MIN_DB}</span>
      </div>
      {gains.map((g, i) => (
        <label key={i} className="flex flex-1 flex-col items-center gap-[4px]" style={font}>
          <span className="h-[14px] text-[10px] text-text-secondary tabular-nums">
            {g > 0 ? `+${g}` : g}
          </span>
          <input
            type="range"
            min={EQ_MIN_DB}
            max={EQ_MAX_DB}
            step={0.5}
            value={g}
            onChange={(e) => setEqBand(i, Number(e.target.value))}
            onDoubleClick={() => setEqBand(i, 0)}
            aria-label={`${EQ_BAND_LABELS[i]} Hz`}
            title={t("settings.sound.eq_band_hint")}
            data-testid={`eq-band-${i}`}
            className="h-[120px] w-[18px] cursor-pointer accent-[var(--text-primary)]"
            style={{ writingMode: "vertical-lr", direction: "rtl" }}
          />
          <span className="text-[10px] text-text-tertiary">{EQ_BAND_LABELS[i]}</span>
        </label>
      ))}
    </div>
  );
}

function SleepTimerControls() {
  const { t } = useTranslation();
  const mode = useSleepTimerStore((s) => s.mode);
  const endsAt = useSleepTimerStore((s) => s.endsAt);
  const startMinutes = useSleepTimerStore((s) => s.startMinutes);
  const startEndOfTrack = useSleepTimerStore((s) => s.startEndOfTrack);
  const cancel = useSleepTimerStore((s) => s.cancel);
  const currentTrackId = usePlayerStore((s) => s.currentTrack?.id ?? null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (mode !== "time") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [mode]);

  return (
    <div className="flex flex-col gap-[10px]">
      <div className="flex flex-wrap gap-[6px]">
        {SLEEP_MINUTES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => startMinutes(m)}
            className={`${chip} ${chipIdle}`}
            style={font}
          >
            {t("settings.sound.sleep_minutes", { count: m })}
          </button>
        ))}
        <button
          type="button"
          onClick={() => startEndOfTrack(currentTrackId)}
          disabled={!currentTrackId}
          className={`${chip} ${mode === "end_of_track" ? chipActive : chipIdle} disabled:cursor-not-allowed disabled:opacity-50`}
          style={font}
        >
          {t("settings.sound.sleep_end_of_track")}
        </button>
      </div>
      {mode && (
        <div
          className="flex items-center justify-between gap-[10px] rounded-[10px] bg-indigo-500/10 px-[12px] py-[8px]"
          style={font}
        >
          <span className="flex items-center gap-[8px] text-[13px] text-text-primary">
            <MoonStarsLine size={16} className="text-indigo-400" />
            {mode === "time" && endsAt
              ? t("settings.sound.sleep_running", { time: formatRemaining(endsAt - now) })
              : t("settings.sound.sleep_running_track")}
          </span>
          <button type="button" onClick={cancel} className={`${chip} ${chipIdle}`} style={font}>
            {t("settings.sound.sleep_cancel")}
          </button>
        </div>
      )}
    </div>
  );
}

function AlarmControls() {
  const { t } = useTranslation();
  const alarm = useAlarmStore();
  return (
    <div className="flex flex-wrap items-center gap-[10px]">
      <ToggleSwitch
        checked={alarm.enabled}
        onChange={(next) => {
          alarm.setEnabled(next);
          if (next && typeof Notification !== "undefined" && Notification.permission === "default") {
            void Notification.requestPermission();
          }
        }}
        ariaLabel={t("settings.sound.alarm_title")}
      />
      <input
        type="time"
        value={alarm.time}
        onChange={(e) => alarm.setTime(e.target.value)}
        aria-label={t("settings.sound.alarm_time")}
        data-testid="alarm-time"
        className="h-[32px] rounded-[9px] border-0 bg-black/[0.06] px-[10px] text-[13px] text-text-primary outline-none [color-scheme:light] dark:bg-black/30 dark:[color-scheme:dark]"
        style={font}
      />
      <button
        type="button"
        onClick={() => alarm.setRepeatDaily(!alarm.repeatDaily)}
        className={`${chip} ${alarm.repeatDaily ? chipActive : chipIdle}`}
        style={font}
        aria-pressed={alarm.repeatDaily}
      >
        {t("settings.sound.alarm_daily")}
      </button>
    </div>
  );
}

export function SoundTab({ searchQuery }: { searchQuery?: string }) {
  const { t } = useTranslation();
  const eqEnabled = useSoundStore((s) => s.eqEnabled);
  const eqPresetId = useSoundStore((s) => s.eqPresetId);
  const setEqEnabled = useSoundStore((s) => s.setEqEnabled);
  const applyEqPreset = useSoundStore((s) => s.applyEqPreset);
  const notify = useSoundStore((s) => s.notifyOnTrackChange);
  const setNotify = useSoundStore((s) => s.setNotifyOnTrackChange);
  const leveling = useSoundStore((s) => s.leveling);
  const setLeveling = useSoundStore((s) => s.setLeveling);
  const karaoke = useSoundStore((s) => s.karaoke);
  const setKaraoke = useSoundStore((s) => s.setKaraoke);
  const crossfadeSec = useSoundStore((s) => s.crossfadeSec);
  const setCrossfadeSec = useSoundStore((s) => s.setCrossfadeSec);
  const visualizer = useSoundStore((s) => s.visualizer);
  const setVisualizer = useSoundStore((s) => s.setVisualizer);

  const presetOptions = [
    ...EQ_PRESETS.map((p) => ({ value: p.id, label: t(`settings.sound.presets.${p.id}`) })),
    ...(eqPresetId === "custom"
      ? [{ value: "custom", label: t("settings.sound.presets.custom") }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-[18px]">
      <AudioQualitySection searchQuery={searchQuery} />
      <SettingSection label={t("settings.sound.eq_section")}>
        <SettingRow
          title={t("settings.sound.eq_title")}
          description={t("settings.sound.eq_description")}
          titleKey="settings.sound.eq_title"
          descKey="settings.sound.eq_description"
          searchQuery={searchQuery}
          explained
          control={
            <ToggleSwitch
              checked={eqEnabled}
              onChange={setEqEnabled}
              ariaLabel={t("settings.sound.eq_title")}
            />
          }
        />
        <SettingBlock
          title={t("settings.sound.eq_preset_title")}
          description={t("settings.sound.eq_preset_description")}
          titleKey="settings.sound.eq_preset_title"
          descKey="settings.sound.eq_preset_description"
          searchQuery={searchQuery}
        >
          <div className="flex items-center gap-[8px]">
            <MenuSelect
              options={presetOptions}
              value={eqPresetId}
              onChange={(v: string) => v !== "custom" && applyEqPreset(v)}
              className="min-w-[170px]"
              aria-label={t("settings.sound.eq_preset_title")}
            />
            <button
              type="button"
              onClick={() => applyEqPreset("flat")}
              className={`${chip} ${chipIdle}`}
              style={font}
            >
              {t("settings.sound.eq_reset")}
            </button>
          </div>
          <EqualizerBands />
        </SettingBlock>
      </SettingSection>

      <SettingSection label={t("settings.sound.effects_section")}>
        <SettingBlock
          title={t("settings.sound.crossfade_title")}
          description={t("settings.sound.crossfade_description")}
          titleKey="settings.sound.crossfade_title"
          descKey="settings.sound.crossfade_description"
          searchQuery={searchQuery}
        >
          <Slider
            value={crossfadeSec}
            onChange={setCrossfadeSec}
            min={0}
            max={CROSSFADE_MAX_SEC}
            step={1}
            formatValue={(v) => (v === 0 ? t("settings.sound.off") : `${v}s`)}
            ariaLabel={t("settings.sound.crossfade_title")}
          />
        </SettingBlock>
        <SettingRow
          title={t("settings.sound.leveling_title")}
          description={t("settings.sound.leveling_description")}
          titleKey="settings.sound.leveling_title"
          descKey="settings.sound.leveling_description"
          searchQuery={searchQuery}
          explained
          control={
            <ToggleSwitch checked={leveling} onChange={setLeveling} ariaLabel={t("settings.sound.leveling_title")} />
          }
        />
        <SettingRow
          title={t("settings.sound.karaoke_title")}
          description={t("settings.sound.karaoke_description")}
          titleKey="settings.sound.karaoke_title"
          descKey="settings.sound.karaoke_description"
          searchQuery={searchQuery}
          explained
          control={
            <ToggleSwitch checked={karaoke} onChange={setKaraoke} ariaLabel={t("settings.sound.karaoke_title")} />
          }
        />
        <SettingRow
          title={t("settings.sound.visualizer_title")}
          description={t("settings.sound.visualizer_description")}
          titleKey="settings.sound.visualizer_title"
          descKey="settings.sound.visualizer_description"
          searchQuery={searchQuery}
          explained
          control={
            <ToggleSwitch checked={visualizer} onChange={setVisualizer} ariaLabel={t("settings.sound.visualizer_title")} />
          }
        />
      </SettingSection>

      <SettingSection label={t("settings.sound.extras_section")}>
        <SettingBlock
          title={t("settings.sound.alarm_title")}
          description={t("settings.sound.alarm_description")}
          titleKey="settings.sound.alarm_title"
          descKey="settings.sound.alarm_description"
          searchQuery={searchQuery}
        >
          <AlarmControls />
        </SettingBlock>

        <SettingBlock
          title={t("settings.sound.sleep_title")}
          description={t("settings.sound.sleep_description")}
          titleKey="settings.sound.sleep_title"
          descKey="settings.sound.sleep_description"
          searchQuery={searchQuery}
        >
          <SleepTimerControls />
        </SettingBlock>

        <SettingRow
          title={t("settings.sound.notify_title")}
          description={t("settings.sound.notify_description")}
          titleKey="settings.sound.notify_title"
          descKey="settings.sound.notify_description"
          searchQuery={searchQuery}
          explained
          control={
            <ToggleSwitch
              checked={notify}
              onChange={(next) => {
                setNotify(next);
                if (next && typeof Notification !== "undefined" && Notification.permission === "default") {
                  void Notification.requestPermission();
                }
              }}
              ariaLabel={t("settings.sound.notify_title")}
            />
          }
        />
      </SettingSection>
    </div>
  );
}
