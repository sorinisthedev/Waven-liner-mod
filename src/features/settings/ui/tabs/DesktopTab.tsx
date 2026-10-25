import { useEffect, useRef, useState } from "react";
import { Download2Line, Upload2Line } from "@mingcute/react";
import { useTranslation } from "@/languages";
import { ToggleSwitch, useToast } from "@/shared/ui";
import { createBackup, downloadBlob, restoreBackup } from "@/features/personalization/lib/settingsBackup";
import { SettingRow, SettingSection } from "../controls";

const font = { fontFamily: "var(--font-inter), sans-serif" } as const;
const chip =
  "inline-flex h-[32px] items-center gap-[6px] whitespace-nowrap rounded-[10px] border-0 px-[12px] text-[13px] leading-none transition-colors cursor-pointer bg-black/[0.06] text-text-primary hover:bg-black/[0.1] dark:bg-black/30 dark:hover:bg-black/40 disabled:opacity-50";

interface DesktopOptions {
  closeToTray: boolean;
  openAtLogin: boolean;
}

export function DesktopTab({ searchQuery }: { searchQuery?: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const bridge = typeof window !== "undefined" ? window.linerElectron : undefined;
  const [options, setOptions] = useState<DesktopOptions | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void bridge?.getDesktopOptions?.().then(setOptions).catch(() => {});
  }, [bridge]);

  const update = async (patch: Partial<DesktopOptions>) => {
    if (!bridge?.setDesktopOptions) return;
    setOptions((o) => (o ? { ...o, ...patch } : o));
    try {
      setOptions(await bridge.setDesktopOptions(patch));
    } catch {
      toast.error(t("settings.desktop.save_failed"));
    }
  };

  const available = Boolean(bridge?.setDesktopOptions && options);

  return (
    <div className="flex flex-col gap-[18px]">
      <SettingSection label={t("settings.desktop.window_section")}>
        <SettingRow
          title={t("settings.desktop.tray_title")}
          description={t("settings.desktop.tray_description")}
          titleKey="settings.desktop.tray_title"
          descKey="settings.desktop.tray_description"
          searchQuery={searchQuery}
          explained
          control={
            <ToggleSwitch
              checked={options?.closeToTray ?? false}
              disabled={!available}
              onChange={(v) => void update({ closeToTray: v })}
              ariaLabel={t("settings.desktop.tray_title")}
            />
          }
        />
        <SettingRow
          title={t("settings.desktop.login_title")}
          description={t("settings.desktop.login_description")}
          titleKey="settings.desktop.login_title"
          descKey="settings.desktop.login_description"
          searchQuery={searchQuery}
          explained
          control={
            <ToggleSwitch
              checked={options?.openAtLogin ?? false}
              disabled={!available}
              onChange={(v) => void update({ openAtLogin: v })}
              ariaLabel={t("settings.desktop.login_title")}
            />
          }
        />
      </SettingSection>

      <SettingSection label={t("settings.desktop.backup_section")}>
        <SettingRow
          title={t("settings.desktop.backup_title")}
          description={t("settings.desktop.backup_description")}
          titleKey="settings.desktop.backup_title"
          descKey="settings.desktop.backup_description"
          searchQuery={searchQuery}
          explained
          control={
            <div className="flex gap-[6px]">
              <button
                type="button"
                disabled={busy}
                className={chip}
                style={font}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const blob = await createBackup();
                    downloadBlob(blob, `waven-settings-${new Date().toISOString().slice(0, 10)}.json`);
                    toast.success(t("settings.desktop.backup_saved"));
                  } catch {
                    toast.error(t("settings.desktop.backup_failed"));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Download2Line size={15} />
                {t("settings.desktop.export")}
              </button>
              <button type="button" disabled={busy} className={chip} style={font} onClick={() => fileRef.current?.click()}>
                <Upload2Line size={15} />
                {t("settings.desktop.import")}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  setBusy(true);
                  try {
                    await restoreBackup(await file.text());
                    toast.success(t("settings.desktop.restored"));
                    setTimeout(() => window.location.reload(), 900);
                  } catch {
                    toast.error(t("settings.desktop.restore_failed"));
                    setBusy(false);
                  }
                }}
              />
            </div>
          }
        />
      </SettingSection>
    </div>
  );
}
