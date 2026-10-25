import { useRef, useState } from "react";
import { CheckLine, Delete2Line, Download2Line, Upload2Line } from "@mingcute/react";
import { useTranslation } from "@/languages";
import { ToggleSwitch, useToast } from "@/shared/ui";
import {
  THEME_COLOR_KEYS,
  THEME_PRESETS,
  exportThemeJson,
  useThemeStore,
  type CustomTheme,
} from "@/features/personalization";
import { SettingBlock, SettingRow, SettingSection, SegmentedControl } from "../controls";

const font = { fontFamily: "var(--font-inter), sans-serif" } as const;
const chip =
  "inline-flex h-[30px] items-center gap-[6px] whitespace-nowrap rounded-[9px] border-0 px-[12px] text-[12.5px] leading-none transition-colors cursor-pointer";
const chipIdle =
  "bg-black/[0.06] text-text-primary hover:bg-black/[0.1] dark:bg-black/30 dark:hover:bg-black/40";

function Swatch({ theme, active, onClick }: { theme: CustomTheme; active: boolean; onClick: () => void }) {
  const c = theme.colors;
  return (
    <button
      type="button"
      onClick={onClick}
      title={theme.name}
      aria-pressed={active}
      className="group flex flex-col gap-[5px] border-0 bg-transparent p-0 text-left cursor-pointer"
    >
      <span
        className={`relative flex h-[46px] w-full overflow-hidden rounded-[9px] border ${
          active ? "border-text-primary ring-1 ring-text-primary" : "border-border-primary group-hover:border-text-tertiary"
        }`}
        style={{ background: c.canvas }}
      >
        <span className="m-[6px] flex flex-1 flex-col justify-center gap-[4px] rounded-[5px] px-[6px]" style={{ background: c.surface }}>
          <span className="h-[4px] w-[60%] rounded-full" style={{ background: c.text }} />
          <span className="h-[4px] w-[35%] rounded-full" style={{ background: c.accent }} />
        </span>
        {active ? (
          <span className="absolute right-[4px] top-[4px] flex h-[14px] w-[14px] items-center justify-center rounded-full bg-white text-black">
            <CheckLine size={9} />
          </span>
        ) : null}
      </span>
      <span className="truncate text-[11.5px] text-text-secondary" style={font}>{theme.name}</span>
    </button>
  );
}

export function ThemeBuilder({ searchQuery }: { searchQuery?: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const store = useThemeStore();
  const [name, setName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const exportTheme = (theme: CustomTheme) => {
    const blob = new Blob([exportThemeJson(theme)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${theme.name.replace(/[^\w\- ]+/g, "").trim() || "theme"}.waven-theme.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5_000);
    toast.success(t("settings.theme_builder.exported"));
  };

  const sameColors = (a: CustomTheme, b: CustomTheme) =>
    a.base === b.base && THEME_COLOR_KEYS.every((k) => a.colors[k] === b.colors[k]);

  return (
    <SettingSection label={t("settings.theme_builder.section")}>
      <SettingRow
        title={t("settings.theme_builder.enable_title")}
        description={t("settings.theme_builder.enable_description")}
        titleKey="settings.theme_builder.enable_title"
        descKey="settings.theme_builder.enable_description"
        searchQuery={searchQuery}
        explained
        control={
          <ToggleSwitch
            checked={store.enabled}
            onChange={store.setEnabled}
            ariaLabel={t("settings.theme_builder.enable_title")}
          />
        }
      />
      <SettingBlock
        title={t("settings.theme_builder.presets_title")}
        description={t("settings.theme_builder.presets_description")}
        titleKey="settings.theme_builder.presets_title"
        descKey="settings.theme_builder.presets_description"
        searchQuery={searchQuery}
      >
        <div className="grid grid-cols-4 gap-[10px]">
          {[...THEME_PRESETS, ...store.saved].map((theme) => (
            <Swatch
              key={theme.id}
              theme={theme}
              active={store.enabled && sameColors(store.active, theme)}
              onClick={() => store.applyTheme(theme)}
            />
          ))}
        </div>
      </SettingBlock>
      <SettingBlock
        title={t("settings.theme_builder.colors_title")}
        description={t("settings.theme_builder.colors_description")}
        titleKey="settings.theme_builder.colors_title"
        descKey="settings.theme_builder.colors_description"
        searchQuery={searchQuery}
      >
        <div className="flex items-center justify-between gap-3">
          <SegmentedControl
            options={[
              { value: "dark", label: t("settings.theme.dark") },
              { value: "light", label: t("settings.theme.light") },
            ]}
            value={store.active.base}
            onChange={store.setBase}
            ariaLabel={t("settings.theme_builder.base")}
          />
        </div>
        <div className="grid grid-cols-3 gap-[8px]">
          {THEME_COLOR_KEYS.map((key) => (
            <label
              key={key}
              className="flex items-center gap-[10px] rounded-[10px] bg-black/[0.04] px-[10px] py-[8px] dark:bg-black/20 cursor-pointer"
              style={font}
            >
              <input
                type="color"
                value={store.active.colors[key]}
                onChange={(e) => store.setColor(key, e.target.value)}
                className="h-[26px] w-[26px] shrink-0 cursor-pointer rounded-[6px] border-0 bg-transparent p-0"
              />
              <span className="flex min-w-0 flex-col">
                <span className="text-[12.5px] text-text-primary">{t(`settings.theme_builder.color.${key}`)}</span>
                <span className="text-[11px] uppercase text-text-tertiary tabular-nums">{store.active.colors[key]}</span>
              </span>
            </label>
          ))}
        </div>
        <form
          className="flex flex-wrap items-center gap-[6px] pt-[2px]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            store.saveActive(name);
            setName("");
            toast.success(t("settings.theme_builder.saved"));
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder={t("settings.theme_builder.name_placeholder")}
            className="h-[30px] min-w-0 flex-1 rounded-[9px] border-0 bg-black/[0.06] px-[10px] text-[12.5px] text-text-primary outline-none placeholder:text-text-tertiary dark:bg-black/30"
            style={font}
          />
          <button type="submit" disabled={!name.trim()} className={`${chip} ${chipIdle} disabled:opacity-50`} style={font}>
            {t("settings.theme_builder.save")}
          </button>
          <button type="button" onClick={() => exportTheme(store.active)} className={`${chip} ${chipIdle}`} style={font}>
            <Download2Line size={14} />
            {t("settings.theme_builder.export")}
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className={`${chip} ${chipIdle}`} style={font}>
            <Upload2Line size={14} />
            {t("settings.theme_builder.import")}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file || file.size > 100_000) return;
              const ok = store.importTheme(await file.text());
              if (ok) toast.success(t("settings.theme_builder.imported"));
              else toast.error(t("settings.theme_builder.import_failed"));
            }}
          />
        </form>
        {store.saved.length > 0 && (
          <div className="flex flex-col gap-[4px] pt-[4px]">
            {store.saved.map((theme) => (
              <div key={theme.id} className="flex items-center justify-between gap-2 text-[12.5px] text-text-secondary" style={font}>
                <span className="truncate">{theme.name}</span>
                <span className="flex shrink-0 gap-[4px]">
                  <button type="button" onClick={() => exportTheme(theme)} className={`${chip} ${chipIdle} h-[26px] px-[8px]`} aria-label={t("settings.theme_builder.export")}>
                    <Download2Line size={13} />
                  </button>
                  <button type="button" onClick={() => store.deleteSaved(theme.id)} className={`${chip} ${chipIdle} h-[26px] px-[8px]`} aria-label={t("settings.theme_builder.delete")}>
                    <Delete2Line size={13} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </SettingBlock>
    </SettingSection>
  );
}
