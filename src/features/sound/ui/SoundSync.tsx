import { useEffect, useRef } from "react";
import { playerEngine, usePlayerStore } from "@/features/player";
import { pitchShifter } from "@/features/player/engine/pitchShifter";
import { useTranslation } from "@/languages";
import { showToast } from "@/shared/ui";
import { effectiveEqGains, needsPostChain, useSoundStore } from "../store/soundStore";
import { useSleepTimerStore } from "../store/sleepTimerStore";
import { isAlarmDue, localDay, useAlarmStore } from "../store/alarmStore";

const FADE_MS = 10_000;

function liveAudio(): HTMLAudioElement | null {
  const win = window as unknown as { __liner_audio?: HTMLAudioElement };
  return win.__liner_audio ?? (document.getElementById("liner-audio") as HTMLAudioElement | null);
}

/** keeps the equalizer, sleep timer and now-playing notifications running */
export function SoundSync() {
  const { t } = useTranslation();
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  // post effects (eq, leveling, karaoke, fades). the web-audio graph needs a
  // user gesture first, so it is only touched once something has played
  useEffect(() => {
    const apply = () => {
      const sound = useSoundStore.getState();
      pitchShifter.setPostEffects({
        eqGains: effectiveEqGains(sound),
        leveling: sound.leveling,
        karaoke: sound.karaoke,
      });
      if (pitchShifter.hasPostChain()) return;
      if (!needsPostChain(sound)) return;
      if (usePlayerStore.getState().status !== "playing" && !pitchShifter.isAttached()) return;
      pitchShifter.ensurePostChain();
    };
    apply();
    const unsubSound = useSoundStore.subscribe(apply);
    const unsubPlayer = usePlayerStore.subscribe((s, prev) => {
      if (s.status === "playing" && prev.status !== "playing") {
        apply();
        pitchShifter.resumeContext();
      }
    });
    return () => {
      unsubSound();
      unsubPlayer();
    };
  }, []);

  // crossfade: fade each song in over its first seconds and out over its last.
  // only ticks while crossfade is on and something is playing
  const crossfadeOn = useSoundStore((s) => s.crossfadeSec > 0);
  const isPlaying = usePlayerStore((s) => s.status === "playing");
  const crossfadeActive = crossfadeOn && isPlaying;
  useEffect(() => {
    if (!crossfadeActive) {
      if (!crossfadeOn) pitchShifter.setTransitionGain(1, 0.06);
      return;
    }
    let lastLevel = -1;
    const id = window.setInterval(() => {
      const cf = useSoundStore.getState().crossfadeSec;
      if (!pitchShifter.hasPostChain()) return;
      let level = 1;
      const p = usePlayerStore.getState();
      if (cf > 0 && p.durationMs > cf * 2000) {
        const windowMs = cf * 1000;
        const remaining = p.durationMs - p.positionMs;
        level = Math.min(1, Math.max(0, remaining / windowMs), Math.max(0, p.positionMs / windowMs));
        // a gentle curve sounds more even than a straight line
        level = Math.sin((level * Math.PI) / 2);
      }
      if (Math.abs(level - lastLevel) < 0.005) return;
      lastLevel = level;
      pitchShifter.setTransitionGain(level, 0.06);
    }, 100);
    return () => window.clearInterval(id);
  }, [crossfadeActive, crossfadeOn]);

  // sleep timer: only ticks while one is set
  const sleepArmed = useSleepTimerStore((s) => s.mode !== null);
  useEffect(() => {
    if (!sleepArmed) return;
    let fadeBase: number | null = null;
    const restoreVolume = () => {
      const audio = liveAudio();
      if (audio && fadeBase !== null) audio.volume = fadeBase;
      fadeBase = null;
    };
    const fire = () => {
      useSleepTimerStore.getState().cancel();
      playerEngine.pause();
      // give the pause a moment before the level comes back for next time
      window.setTimeout(restoreVolume, 300);
      showToast(tRef.current("settings.sound.sleep_fired"), "info");
    };
    const tick = () => {
      const timer = useSleepTimerStore.getState();
      if (!timer.mode) {
        restoreVolume();
        return;
      }
      const player = usePlayerStore.getState();
      if (timer.mode === "time" && timer.endsAt) {
        const remaining = timer.endsAt - Date.now();
        if (remaining <= 0) return fire();
        if (remaining <= FADE_MS && player.status === "playing") {
          const audio = liveAudio();
          if (audio) {
            if (fadeBase === null) fadeBase = audio.volume;
            audio.volume = Math.max(0, fadeBase * (remaining / FADE_MS));
          }
        } else {
          restoreVolume();
        }
        return;
      }
      if (timer.mode === "end_of_track") {
        const current = player.currentTrack?.id ?? null;
        const nearEnd =
          player.durationMs > 0 && player.positionMs >= player.durationMs - 700;
        if ((timer.trackId && current !== timer.trackId) || nearEnd) fire();
      }
    };
    const id = window.setInterval(tick, 250);
    return () => {
      window.clearInterval(id);
      restoreVolume();
    };
  }, [sleepArmed]);

  // wake-up alarm: resume what was playing, ramping up from silence
  useEffect(() => {
    let rampTimer: number | null = null;
    const check = () => {
      const alarm = useAlarmStore.getState();
      if (!isAlarmDue(alarm)) return;
      alarm.markFired(localDay());
      const player = usePlayerStore.getState();
      const message = tRef.current("settings.sound.alarm_fired");
      try {
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification("WAVEN", { body: message, silent: false });
        }
      } catch {}
      if (!player.currentTrack) {
        showToast(tRef.current("settings.sound.alarm_nothing"), "info");
        return;
      }
      const target = player.volume > 0.05 ? player.volume : 0.6;
      playerEngine.setVolume(0);
      if (player.status !== "playing") playerEngine.resume();
      showToast(message, "info");
      const started = Date.now();
      const rampMs = alarm.rampSec * 1000;
      if (rampTimer) window.clearInterval(rampTimer);
      rampTimer = window.setInterval(() => {
        const t = Math.min(1, (Date.now() - started) / rampMs);
        playerEngine.setVolume(target * t);
        if (t >= 1 && rampTimer) {
          window.clearInterval(rampTimer);
          rampTimer = null;
        }
      }, 500);
    };
    check();
    const id = window.setInterval(check, 15_000);
    return () => {
      window.clearInterval(id);
      if (rampTimer) window.clearInterval(rampTimer);
    };
  }, []);

  // desktop notification when the track changes while Liner is in the background
  useEffect(() => {
    return usePlayerStore.subscribe((s, prev) => {
      const track = s.currentTrack;
      if (!track || track.id === prev.currentTrack?.id) return;
      if (!useSoundStore.getState().notifyOnTrackChange) return;
      if (document.hasFocus()) return;
      if (typeof Notification === "undefined" || Notification.permission === "denied") return;
      const show = () => {
        try {
          new Notification(track.title, {
            body: track.artists,
            icon: /^https?:/.test(track.coverUrl) ? track.coverUrl : undefined,
            silent: true,
            tag: "liner-now-playing",
          });
        } catch {
          // notifications unavailable in this environment
        }
      };
      if (Notification.permission === "granted") show();
      else void Notification.requestPermission().then((p) => p === "granted" && show());
    });
  }, []);

  return null;
}

export default SoundSync;
