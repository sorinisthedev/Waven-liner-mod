import { ThemeProvider } from "next-themes";
import GlobalTooltip from "@/shared/ui/GlobalTooltip";
import { OverlayPlayer } from "@/features/overlay/ui/OverlayPlayer";
import { hasActiveSession } from "@/shared/api/auth-session";
import "./globals.css";

export default function OverlayApp() {
  if (!hasActiveSession()) {
    window.linerElectron?.closeOverlay?.();
    return null;
  }

  return (
    <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false} forcedTheme="dark">
      <GlobalTooltip />
      <OverlayPlayer />
    </ThemeProvider>
  );
}
