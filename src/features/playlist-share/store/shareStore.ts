import { create } from "zustand";
import type { SharedPlaylist } from "@/shared/local/playlistShare";

interface PlaylistShareState {
  /** playlist being shared from this PC */
  sharing: SharedPlaylist | null;
  /** how many songs were left out because they're local files */
  skippedLocal: number;
  /** playlist arriving from a link or file, waiting for the user to accept */
  incoming: SharedPlaylist | null;
  openShare: (playlist: SharedPlaylist, skippedLocal: number) => void;
  closeShare: () => void;
  openImport: (playlist: SharedPlaylist) => void;
  closeImport: () => void;
}

export const usePlaylistShareStore = create<PlaylistShareState>((set) => ({
  sharing: null,
  skippedLocal: 0,
  incoming: null,
  openShare: (sharing, skippedLocal) => set({ sharing, skippedLocal }),
  closeShare: () => set({ sharing: null, skippedLocal: 0 }),
  openImport: (incoming) => set({ incoming }),
  closeImport: () => set({ incoming: null }),
}));
