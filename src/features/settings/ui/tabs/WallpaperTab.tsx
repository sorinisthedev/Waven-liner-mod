import { useState } from "react";
import { CheckLine, Delete2Line, Refresh2Line, Upload2Line } from "@mingcute/react";
import { useTranslation } from "@/languages";
import { MenuSelect, Slider, ToggleSwitch, useToast } from "@/shared/ui";
import {
  ACCENT_PRESETS,
  APP_FONTS,
  LYRICS_FONTS,
  LYRICS_SCALE_MAX,
  LYRICS_SCALE_MIN,
  ImageInputError,
  WALLPAPER_BLUR_MAX,
  WALLPAPER_DIM_MAX,
  WALLPAPER_PRESETS,
  usePersonalizationStore,
} from "@/features/personalization";
import { SettingBlock, SettingRow, SettingSection } from "../controls";
import { useImageDrop } from "./useImageDrop";
import { ThemeBuilder } from "./ThemeBuilder";

const font = { fontFamily: "var(--font-inter), sans-serif" } as const;

function SelectedBadge() {
  return (
    <span className="absolute right-[6px] top-[6px] flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white text-black shadow">
      <CheckLine size={12} />
    </span>
  );
}

function Tile({
  active,
  label,
  onClick,
  children,
  testId,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-testid={testId}
      className="group flex flex-col gap-[6px] border-0 bg-transparent p-0 text-left cursor-pointer"
    >
      <span
        className={`relative block aspect-[16/10] w-full overflow-hidden rounded-[10px] border transition-colors ${
          active
            ? "border-text-primary ring-1 ring-text-primary"
            : "border-border-primary group-hover:border-text-tertiary"
        }`}
      >
        {children}
        {active ? <SelectedBadge /> : null}
      </span>
      <span
        className={`truncate text-[12px] leading-none ${
          active ? "text-text-primary" : "text-text-secondary"
        }`}
        style={{ ...font, fontWeight: active ? 500 : 400 }}
      >
        {label}
      </span>
    </button>
  );
}

export function WallpaperTab({ searchQuery }: { searchQuery?: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const s = usePersonalizationStore();
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      await s.setImageWallpaper(file);
      toast.success(t("settings.personalize.wallpaper_updated"));
    } catch (err) {
      toast.error(
        err instanceof ImageInputError
          ? err.message
          : t("settings.personalize.wallpaper_failed"),
      );
    } finally {
      setUploading(false);
    }
  };

  const { inputProps, dropProps, dragging, openPicker } = useImageDrop(handleFile);
  const hasWallpaper = s.wallpaperKind !== "none";

  return (
    <div className="flex flex-col gap-[18px]">
      <SettingSection label={t("settings.performance.section")}>
        <SettingRow
          title={t("settings.performance.title")}
          description={t("settings.performance.description")}
          titleKey="settings.performance.title"
          descKey="settings.performance.description"
          searchQuery={searchQuery}
          explained
          control={
            <ToggleSwitch
              checked={s.performanceMode}
              onChange={s.setPerformanceMode}
              ariaLabel={t("settings.performance.title")}
            />
          }
        />
      </SettingSection>

      <SettingSection label={t("settings.personalize.wallpaper_section")}>
        <SettingBlock
          title={t("settings.personalize.wallpaper_title")}
          description={t("settings.personalize.wallpaper_description")}
          titleKey="settings.personalize.wallpaper_title"
          descKey="settings.personalize.wallpaper_description"
          searchQuery={searchQuery}
        >
          <input {...inputProps} data-testid="wallpaper-file-input" />
          <div className="grid grid-cols-4 gap-[10px]" {...dropProps}>
            <Tile
              active={s.wallpaperKind === "none"}
              label={t("settings.personalize.none")}
              onClick={s.clearWallpaper}
              testId="wallpaper-none"
            >
              <span className="flex h-full w-full items-center justify-center bg-bg-canvas text-[11px] text-text-tertiary">
                {t("settings.personalize.none")}
              </span>
            </Tile>

            <Tile
              active={s.wallpaperKind === "image"}
              label={
                s.wallpaperImageUrl
                  ? t("settings.personalize.your_image")
                  : t("settings.personalize.upload")
              }
              onClick={() =>
                s.wallpaperImageUrl ? s.applyStoredImageWallpaper() : openPicker()
              }
              testId="wallpaper-custom"
            >
              {s.wallpaperImageUrl ? (
                <img
                  src={s.wallpaperImageUrl}
                  alt=""
                  draggable={false}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span
                  className={`flex h-full w-full flex-col items-center justify-center gap-[4px] border-dashed text-[11px] transition-colors ${
                    dragging
                      ? "bg-text-primary/10 text-text-primary"
                      : "bg-black/[0.04] text-text-tertiary dark:bg-white/[0.04]"
                  }`}
                >
                  <Upload2Line size={18} />
                  {uploading
                    ? t("settings.personalize.processing")
                    : t("settings.personalize.drop_or_browse")}
                </span>
              )}
            </Tile>

            {WALLPAPER_PRESETS.map((preset) => (
              <Tile
                key={preset.id}
                active={s.wallpaperKind === "preset" && s.wallpaperPresetId === preset.id}
                label={t(`settings.personalize.presets.${preset.id}`)}
                onClick={() => s.setPresetWallpaper(preset.id)}
                testId={`wallpaper-preset-${preset.id}`}
              >
                <span className="block h-full w-full" style={{ background: preset.background }} />
              </Tile>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-[6px] pt-[2px]">
            <button
              type="button"
              onClick={openPicker}
              disabled={uploading}
              className="inline-flex h-[30px] items-center gap-[6px] rounded-[9px] border-0 bg-black/[0.06] px-[12px] text-[12.5px] text-text-primary transition-colors hover:bg-black/[0.1] cursor-pointer disabled:opacity-50 dark:bg-black/30 dark:hover:bg-black/40"
              style={font}
            >
              <Upload2Line size={14} />
              {uploading
                ? t("settings.personalize.processing")
                : s.wallpaperImageUrl
                  ? t("settings.personalize.replace_image")
                  : t("settings.personalize.upload_image")}
            </button>
            {s.wallpaperImageUrl && (
              <button
                type="button"
                onClick={() => void s.removeWallpaperImage()}
                className="inline-flex h-[30px] items-center gap-[6px] rounded-[9px] border-0 bg-transparent px-[10px] text-[12.5px] text-text-secondary transition-colors hover:bg-black/[0.06] hover:text-text-primary cursor-pointer dark:hover:bg-white/[0.06]"
                style={font}
              >
                <Delete2Line size={14} />
                {t("settings.personalize.remove_image")}
              </button>
            )}
          </div>
        </SettingBlock>

        <SettingBlock
          title={t("settings.personalize.blur_title")}
          description={t("settings.personalize.blur_description")}
          titleKey="settings.personalize.blur_title"
          descKey="settings.personalize.blur_description"
          searchQuery={searchQuery}
        >
          <Slider
            value={s.wallpaperBlur}
            onChange={s.setWallpaperBlur}
            min={0}
            max={WALLPAPER_BLUR_MAX}
            step={1}
            unit="px"
            disabled={!hasWallpaper}
            ariaLabel={t("settings.personalize.blur_title")}
          />
        </SettingBlock>

        <SettingBlock
          title={t("settings.personalize.dim_title")}
          description={t("settings.personalize.dim_description")}
          titleKey="settings.personalize.dim_title"
          descKey="settings.personalize.dim_description"
          searchQuery={searchQuery}
        >
          <Slider
            value={Math.round(s.wallpaperDim * 100)}
            onChange={(v) => s.setWallpaperDim(v / 100)}
            min={0}
            max={Math.round(WALLPAPER_DIM_MAX * 100)}
            step={1}
            unit="%"
            disabled={!hasWallpaper}
            ariaLabel={t("settings.personalize.dim_title")}
          />
        </SettingBlock>

        <SettingRow
          title={t("settings.personalize.motion_title")}
          description={t("settings.personalize.motion_description")}
          titleKey="settings.personalize.motion_title"
          descKey="settings.personalize.motion_description"
          searchQuery={searchQuery}
          explained
          control={
            <ToggleSwitch
              checked={s.wallpaperMotion}
              onChange={s.setWallpaperMotion}
              disabled={!hasWallpaper}
              ariaLabel={t("settings.personalize.motion_title")}
            />
          }
        />

        <SettingRow
          title={t("settings.personalize.cover_backdrops_title")}
          description={t("settings.personalize.cover_backdrops_description")}
          titleKey="settings.personalize.cover_backdrops_title"
          descKey="settings.personalize.cover_backdrops_description"
          searchQuery={searchQuery}
          explained
          control={
            <ToggleSwitch
              checked={s.coverBackdrops}
              onChange={s.setCoverBackdrops}
              ariaLabel={t("settings.personalize.cover_backdrops_title")}
            />
          }
        />
      </SettingSection>

      <SettingSection label={t("settings.personalize.text_section")}>
        <SettingRow
          title={t("settings.personalize.app_font_title")}
          description={t("settings.personalize.app_font_description")}
          titleKey="settings.personalize.app_font_title"
          descKey="settings.personalize.app_font_description"
          searchQuery={searchQuery}
          explained
          control={
            <MenuSelect
              options={APP_FONTS.map((f) => ({ value: f.id, label: f.label }))}
              value={s.appFontId}
              onChange={s.setAppFont}
              className="min-w-[150px]"
              aria-label={t("settings.personalize.app_font_title")}
            />
          }
        />
        <SettingRow
          title={t("settings.personalize.lyrics_font_title")}
          description={t("settings.personalize.lyrics_font_description")}
          titleKey="settings.personalize.lyrics_font_title"
          descKey="settings.personalize.lyrics_font_description"
          searchQuery={searchQuery}
          explained
          control={
            <MenuSelect
              options={LYRICS_FONTS.map((f) => ({ value: f.id, label: f.label }))}
              value={s.lyricsFontId}
              onChange={s.setLyricsFont}
              className="min-w-[150px]"
              aria-label={t("settings.personalize.lyrics_font_title")}
            />
          }
        />
        <SettingBlock
          title={t("settings.personalize.lyrics_size_title")}
          description={t("settings.personalize.lyrics_size_description")}
          titleKey="settings.personalize.lyrics_size_title"
          descKey="settings.personalize.lyrics_size_description"
          searchQuery={searchQuery}
        >
          <Slider
            value={Math.round(s.lyricsScale * 100)}
            onChange={(v) => s.setLyricsScale(v / 100)}
            min={Math.round(LYRICS_SCALE_MIN * 100)}
            max={Math.round(LYRICS_SCALE_MAX * 100)}
            step={5}
            unit="%"
            ariaLabel={t("settings.personalize.lyrics_size_title")}
          />
          <p
            className="m-0 truncate rounded-[10px] bg-black/[0.04] px-[14px] py-[10px] text-text-primary dark:bg-black/20"
            style={{
              fontFamily: "var(--liner-lyrics-font, var(--font-montserrat-family))",
              fontWeight: 600,
              fontSize: `${Math.round(20 * s.lyricsScale)}px`,
            }}
          >
            {t("settings.personalize.lyrics_preview")}
          </p>
        </SettingBlock>
      </SettingSection>

      <ThemeBuilder searchQuery={searchQuery} />

      <SettingSection label={t("settings.personalize.color_section")}>
        <SettingBlock
          title={t("settings.personalize.accent_title")}
          description={t("settings.personalize.accent_description")}
          titleKey="settings.personalize.accent_title"
          descKey="settings.personalize.accent_description"
          searchQuery={searchQuery}
        >
          <div className="flex flex-wrap gap-[10px]" role="radiogroup">
            {ACCENT_PRESETS.map((accent) => {
              const active = s.accentId === accent.id;
              const label = t(`settings.personalize.accents.${accent.id}`);
              return (
                <button
                  key={accent.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={label}
                  title={label}
                  data-testid={`accent-${accent.id}`}
                  onClick={() => s.setAccent(accent.id)}
                  className={`relative flex h-[30px] w-[30px] items-center justify-center rounded-full border-0 p-0 cursor-pointer transition-transform hover:scale-110 ${
                    active ? "ring-2 ring-text-primary ring-offset-2 ring-offset-bg-primary" : ""
                  }`}
                  style={{ background: accent.color ?? "#ff4d4d" }}
                >
                  {active ? <CheckLine size={14} className="text-white" /> : null}
                </button>
              );
            })}
          </div>
        </SettingBlock>

        <SettingRow
          title={t("settings.personalize.reset_title")}
          description={t("settings.personalize.reset_description")}
          titleKey="settings.personalize.reset_title"
          descKey="settings.personalize.reset_description"
          searchQuery={searchQuery}
          explained
          control={
            <button
              type="button"
              onClick={async () => {
                await s.resetPersonalization();
                toast.info(t("settings.personalize.reset_done"));
              }}
              className="inline-flex h-[32px] items-center gap-[6px] rounded-[10px] border-0 bg-black/[0.06] px-[12px] text-[13px] text-text-primary transition-colors hover:bg-black/[0.1] cursor-pointer dark:bg-black/30 dark:hover:bg-black/40"
              style={font}
            >
              <Refresh2Line size={15} />
              {t("settings.personalize.reset_button")}
            </button>
          }
        />
      </SettingSection>
    </div>
  );
}
