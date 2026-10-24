import { useEffect } from "react";
import { isTypingTarget } from "@/features/navigation/utils/shortcutGuards";
import { useCommandStore } from "../store/commandStore";
import { CommandPalette } from "./CommandPalette";
import { ShortcutCheatSheet } from "./ShortcutCheatSheet";

/** Ctrl/Cmd+K for the palette, ? for the shortcut sheet, Esc closes either */
export function CommandLayer() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const store = useCommandStore.getState();
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        e.stopPropagation();
        store.togglePalette();
        return;
      }
      if (e.key === "Escape" && (store.paletteOpen || store.cheatSheetOpen)) {
        e.preventDefault();
        e.stopPropagation();
        store.setPaletteOpen(false);
        store.setCheatSheetOpen(false);
        return;
      }
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey && !isTypingTarget(e.target)) {
        e.preventDefault();
        store.setCheatSheetOpen(!store.cheatSheetOpen);
      }
    };
    // capture so it wins over the page's own key handlers
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  return (
    <>
      <CommandPalette />
      <ShortcutCheatSheet />
    </>
  );
}

export default CommandLayer;
