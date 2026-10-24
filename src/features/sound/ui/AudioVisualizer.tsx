import { useEffect, useRef } from "react";
import { usePlayerStore } from "@/features/player";
import { pitchShifter } from "@/features/player/engine/pitchShifter";
import { usePersonalizationStore } from "@/features/personalization/store/personalizationStore";
import { isWindowVisible } from "@/shared/utils/windowVisibility";
import { useSoundStore } from "../store/soundStore";

const BAR_COUNT = 48;
const FRAME_MS = 1000 / 30;

/**
 * Soft spectrum bars along the bottom of the fullscreen player. Runs at 30 fps,
 * idles while paused or hidden, and is off in performance mode.
 */
export function AudioVisualizer() {
  const enabled = useSoundStore((s) => s.visualizer);
  const performanceMode = usePersonalizationStore((s) => s.performanceMode);
  const playing = usePlayerStore((s) => s.status === "playing");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const active = enabled && !performanceMode;

  useEffect(() => {
    if (!active || !playing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    if (!pitchShifter.getAnalyser()) pitchShifter.ensurePostChain();

    const levels = new Float32Array(BAR_COUNT);
    let data: Uint8Array<ArrayBuffer> | null = null;
    let raf = 0;
    let last = 0;

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - last < FRAME_MS || !isWindowVisible()) return;
      last = now;
      const analyser = pitchShifter.getAnalyser();
      if (!analyser) return;
      if (!data || data.length !== analyser.frequencyBinCount) {
        data = new Uint8Array(analyser.frequencyBinCount);
      }
      analyser.getByteFrequencyData(data);

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.clearRect(0, 0, w, h);
      const gap = 4 * dpr;
      const barW = (w - gap * (BAR_COUNT - 1)) / BAR_COUNT;
      // the top bins are mostly empty for music, so spread the lower 70%
      const usable = Math.floor(data.length * 0.7);
      ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
      for (let i = 0; i < BAR_COUNT; i++) {
        const bin = Math.floor(Math.pow(i / BAR_COUNT, 1.6) * usable);
        const target = data[bin] / 255;
        levels[i] += (target - levels[i]) * 0.35;
        const barH = Math.max(2 * dpr, levels[i] * h);
        const x = i * (barW + gap);
        ctx.beginPath();
        ctx.roundRect(x, h - barH, barW, barH, Math.min(barW / 2, 3 * dpr));
        ctx.fill();
      }
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [active, playing]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-[90px] w-full opacity-80"
      style={{ maskImage: "linear-gradient(to top, black 40%, transparent)" }}
    />
  );
}

export default AudioVisualizer;
