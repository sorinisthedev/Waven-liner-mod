import { create } from "zustand";

interface CommandUiState {
  paletteOpen: boolean;
  cheatSheetOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  togglePalette: () => void;
  setCheatSheetOpen: (open: boolean) => void;
}

export const useCommandStore = create<CommandUiState>((set) => ({
  paletteOpen: false,
  cheatSheetOpen: false,
  setPaletteOpen: (paletteOpen) => set({ paletteOpen, cheatSheetOpen: false }),
  togglePalette: () => set((s) => ({ paletteOpen: !s.paletteOpen, cheatSheetOpen: false })),
  setCheatSheetOpen: (cheatSheetOpen) => set({ cheatSheetOpen, paletteOpen: false }),
}));

/** subsequence match score, higher is better, -1 means no match */
export function fuzzyScore(query: string, text: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const t = text.toLowerCase();
  const direct = t.indexOf(q);
  if (direct !== -1) return 1000 - direct * 2 - (t.length - q.length) * 0.1;
  let score = 0;
  let ti = 0;
  let streak = 0;
  for (const ch of q) {
    if (ch === " ") continue;
    const found = t.indexOf(ch, ti);
    if (found === -1) return -1;
    streak = found === ti ? streak + 1 : 0;
    score += 10 + streak * 5 - (found - ti);
    ti = found + 1;
  }
  return score;
}
