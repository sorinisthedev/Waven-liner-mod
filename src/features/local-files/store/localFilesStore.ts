import { create } from "zustand";
import type { Track } from "@/shared/types";
import { registerLocalTracks, toClientLocalTrack } from "@/shared/local/localFiles";

interface LocalFilesState {
  folders: string[];
  tracks: Track[];
  scanning: boolean;
  loaded: boolean;
  available: boolean;
  load: () => Promise<void>;
  addFolder: () => Promise<void>;
  removeFolder: (folder: string) => Promise<void>;
  rescan: () => Promise<void>;
}

const bridge = () => (typeof window !== "undefined" ? window.linerElectron?.localMedia : undefined);

export const useLocalFilesStore = create<LocalFilesState>((set, get) => ({
  folders: [],
  tracks: [],
  scanning: false,
  loaded: false,
  available: Boolean(bridge()),

  load: async () => {
    if (get().loaded || !bridge()) return;
    const folders = await bridge()!.getFolders();
    set({ folders, loaded: true });
    if (folders.length) await get().rescan();
  },

  rescan: async () => {
    const api = bridge();
    if (!api || get().scanning) return;
    set({ scanning: true });
    try {
      const infos = await api.scan();
      registerLocalTracks(infos);
      const tracks = infos
        .map(toClientLocalTrack)
        .sort((a, b) => a.artists.localeCompare(b.artists) || a.title.localeCompare(b.title));
      set({ tracks });
    } finally {
      set({ scanning: false });
    }
  },

  addFolder: async () => {
    const api = bridge();
    if (!api) return;
    const before = get().folders.length;
    const folders = await api.addFolder();
    set({ folders });
    if (folders.length !== before) await get().rescan();
  },

  removeFolder: async (folder) => {
    const api = bridge();
    if (!api) return;
    set({ folders: await api.removeFolder(folder) });
    await get().rescan();
  },
}));
