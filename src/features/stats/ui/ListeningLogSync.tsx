import { useEffect } from "react";
import { usePlayerStore } from "@/features/player";
import type { Track } from "@/shared/types";
import { countsAsListen, useListeningLogStore } from "../store/listeningLogStore";

/** counts real playing time per track and commits a log entry when it changes */
export function ListeningLogSync() {
  useEffect(() => {
    let track: Track | null = null;
    let startedAt = 0;
    let ms = 0;
    let lastTick = performance.now();

    const commit = () => {
      if (track && countsAsListen(ms, track.durationMs)) {
        useListeningLogStore.getState().record({ track, at: startedAt, ms: Math.round(ms) });
      }
      track = null;
      ms = 0;
    };

    const tick = () => {
      const now = performance.now();
      const elapsed = now - lastTick;
      lastTick = now;
      const p = usePlayerStore.getState();
      const current = p.currentTrack;
      if (!current) return;
      if (!track || track.id !== current.id) {
        commit();
        track = current;
        startedAt = Date.now();
      }
      // cap the step so a suspended machine doesn't count hours of "playing"
      if (p.status === "playing") ms += Math.min(elapsed, 5_000);
    };

    const id = window.setInterval(tick, 1000);
    window.addEventListener("beforeunload", commit);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("beforeunload", commit);
      commit();
    };
  }, []);

  return null;
}

export default ListeningLogSync;
