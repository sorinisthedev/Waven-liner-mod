import { useMemo } from "react";
import { UserAvatar, type UserAvatarProps } from "@/shared/ui";
import { usePersonalizationStore } from "../store/personalizationStore";

// call sites pass `!rounded-[..]` overrides, a circle has to win over those
const stripRounding = (className: string) =>
  className
    .split(/\s+/)
    .filter((c) => !/^!?rounded(-|$)/.test(c))
    .join(" ");

/**
 * The signed-in user's avatar with the local picture and shape from
 * personalization applied on top of the account one.
 */
export function CurrentUserAvatar({ user, className = "", ...rest }: UserAvatarProps) {
  const avatarDataUrl = usePersonalizationStore((s) => s.avatarDataUrl);
  const shape = usePersonalizationStore((s) => s.avatarShape);

  const merged = useMemo(
    () =>
      avatarDataUrl ? { ...user, avatarUrl: avatarDataUrl } : user,
    [user, avatarDataUrl],
  );

  return (
    <UserAvatar
      // a new picture should retry even if the old url failed to load
      key={merged?.avatarUrl ?? "none"}
      user={merged}
      className={
        shape === "circle" ? `${stripRounding(className)} !rounded-full` : className
      }
      {...rest}
    />
  );
}

export default CurrentUserAvatar;
