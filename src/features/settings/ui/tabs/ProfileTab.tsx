import { useEffect, useState } from "react";
import { Camera2Line, Delete2Line, Upload2Line } from "@mingcute/react";
import { useTranslation } from "@/languages";
import { useToast } from "@/shared/ui";
import { resolveApiErrorMessage } from "@/shared/api";
import { useAuthStore } from "@/features/auth";
import { userDisplayName } from "@/entities/user";
import {
  CurrentUserAvatar,
  ImageInputError,
  usePersonalizationStore,
  type AvatarShape,
} from "@/features/personalization";
import { SegmentedControl, SettingBlock, SettingRow, SettingSection } from "../controls";
import { useImageDrop } from "./useImageDrop";

const font = { fontFamily: "var(--font-inter), sans-serif" } as const;

const pillButton =
  "inline-flex h-[32px] items-center gap-[6px] whitespace-nowrap rounded-[10px] border-0 px-[12px] text-[13px] leading-none transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50";

export function ProfileTab({ searchQuery }: { searchQuery?: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const avatarDataUrl = usePersonalizationStore((s) => s.avatarDataUrl);
  const avatarShape = usePersonalizationStore((s) => s.avatarShape);
  const setAvatarFromFile = usePersonalizationStore((s) => s.setAvatarFromFile);
  const clearAvatar = usePersonalizationStore((s) => s.clearAvatar);
  const setAvatarShape = usePersonalizationStore((s) => s.setAvatarShape);

  const [busy, setBusy] = useState(false);
  const [nameDraft, setNameDraft] = useState(user?.displayName ?? "");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    setNameDraft(user?.displayName ?? "");
  }, [user?.displayName]);

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      await setAvatarFromFile(file);
      toast.success(t("settings.profile_custom.avatar_updated"));
    } catch (err) {
      toast.error(
        err instanceof ImageInputError
          ? err.message
          : t("settings.profile_custom.avatar_failed"),
      );
    } finally {
      setBusy(false);
    }
  };

  const { inputProps, dropProps, dragging, openPicker } = useImageDrop(handleFile);

  const trimmedName = nameDraft.trim();
  const nameChanged = trimmedName !== (user?.displayName ?? "").trim();

  const saveName = async () => {
    if (!user || !nameChanged || savingName) return;
    setSavingName(true);
    try {
      await updateProfile({ displayName: trimmedName || null });
      toast.success(t("settings.profile_custom.name_saved"));
    } catch (err) {
      toast.error(
        resolveApiErrorMessage(err, t, "settings.profile_custom.name_failed"),
      );
    } finally {
      setSavingName(false);
    }
  };

  const shapeOptions: readonly { value: AvatarShape; label: string }[] = [
    { value: "rounded", label: t("settings.profile_custom.shape_rounded") },
    { value: "circle", label: t("settings.profile_custom.shape_circle") },
  ];

  const showHero = !searchQuery?.trim();

  return (
    <SettingSection>
      {showHero && (
        <div
          {...dropProps}
          className={`relative flex items-center gap-[18px] rounded-[16px] px-[18px] py-[18px] transition-colors ${
            dragging
              ? "bg-text-primary/10 ring-2 ring-dashed ring-text-primary/50"
              : "bg-black/[0.04] dark:bg-white/[0.08]"
          }`}
        >
          <input {...inputProps} data-testid="avatar-file-input" />
          <button
            type="button"
            onClick={openPicker}
            disabled={busy}
            aria-label={t("settings.profile_custom.upload")}
            className="group relative shrink-0 rounded-[18px] border-0 bg-transparent p-0 cursor-pointer disabled:cursor-wait"
          >
            <CurrentUserAvatar
              user={user ?? null}
              size={88}
              className="!rounded-[18px] shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
            />
            <span
              className={`pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50 text-white transition-opacity ${
                avatarShape === "circle" ? "rounded-full" : "rounded-[18px]"
              } ${busy ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
            >
              <Camera2Line size={24} />
            </span>
          </button>

          <div className="flex min-w-0 flex-1 flex-col gap-[10px]">
            <div className="flex min-w-0 flex-col gap-[2px]">
              <span
                className="truncate text-text-primary text-[17px] font-[600] leading-tight"
                style={font}
              >
                {userDisplayName(user) ?? "WAVEN"}
              </span>
              <span className="truncate text-text-tertiary text-[12.5px]" style={font}>
                {dragging
                  ? t("settings.profile_custom.drop_here")
                  : t("settings.profile_custom.avatar_hint")}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-[6px]">
              <button
                type="button"
                onClick={openPicker}
                disabled={busy}
                className={`${pillButton} bg-text-primary/80 text-bg-primary hover:bg-text-primary`}
                style={font}
              >
                <Upload2Line size={15} />
                {avatarDataUrl
                  ? t("settings.profile_custom.change")
                  : t("settings.profile_custom.upload")}
              </button>
              {avatarDataUrl && (
                <button
                  type="button"
                  onClick={() => {
                    clearAvatar();
                    toast.info(t("settings.profile_custom.avatar_removed"));
                  }}
                  disabled={busy}
                  className={`${pillButton} bg-black/[0.06] text-text-primary hover:bg-black/[0.1] dark:bg-black/30 dark:hover:bg-black/40`}
                  style={font}
                >
                  <Delete2Line size={15} />
                  {t("settings.profile_custom.remove")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <SettingRow
        title={t("settings.profile_custom.shape_title")}
        description={t("settings.profile_custom.shape_description")}
        titleKey="settings.profile_custom.shape_title"
        descKey="settings.profile_custom.shape_description"
        searchQuery={searchQuery}
        explained
        control={
          <SegmentedControl
            options={shapeOptions}
            value={avatarShape}
            onChange={setAvatarShape}
            ariaLabel={t("settings.profile_custom.shape_title")}
          />
        }
      />

      {user && (
        <SettingBlock
          title={t("settings.profile_custom.name_title")}
          description={t("settings.profile_custom.name_description")}
          titleKey="settings.profile_custom.name_title"
          descKey="settings.profile_custom.name_description"
          searchQuery={searchQuery}
        >
          <form
            className="flex items-center gap-[8px]"
            onSubmit={(e) => {
              e.preventDefault();
              void saveName();
            }}
          >
            <input
              type="text"
              value={nameDraft}
              maxLength={48}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder={user.username ?? ""}
              aria-label={t("settings.profile_custom.name_title")}
              className="h-[34px] min-w-0 flex-1 rounded-[10px] border-0 bg-black/[0.06] px-[12px] text-[13px] text-text-primary outline-none placeholder:text-text-tertiary focus:bg-black/[0.09] dark:bg-black/30 dark:focus:bg-black/40"
              style={font}
            />
            <button
              type="submit"
              disabled={!nameChanged || savingName}
              className={`${pillButton} bg-text-primary/80 text-bg-primary hover:bg-text-primary`}
              style={font}
            >
              {savingName
                ? t("settings.profile_custom.saving")
                : t("settings.profile_custom.save")}
            </button>
          </form>
        </SettingBlock>
      )}
    </SettingSection>
  );
}
