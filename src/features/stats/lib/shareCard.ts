import type { ListeningStats } from "./computeStats";
import { formatMinutes } from "./computeStats";

/**
 * Draws a 1080x1350 summary card and downloads it as a PNG. Text only, covers
 * come from other origins and would taint the canvas.
 */
export async function downloadShareCard(opts: {
  stats: ListeningStats;
  rangeLabel: string;
  userName: string;
  labels: { minutes: string; topSongs: string; topArtists: string; footer: string };
}): Promise<void> {
  const { stats, rangeLabel, userName, labels } = opts;
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const raw = getComputedStyle(document.documentElement).getPropertyValue("--accent-primary").trim();
  // the glow appends an alpha byte, so only accept plain #rrggbb
  const accent = /^#[0-9a-f]{6}$/i.test(raw) ? raw : "#ff4d4d";
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0b0b10");
  bg.addColorStop(1, "#1b1030");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.85, H * 0.1, 0, W * 0.85, H * 0.1, W * 0.8);
  glow.addColorStop(0, accent + "88");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  await document.fonts?.ready;
  const font = (weight: number, size: number) =>
    `${weight} ${size}px Montserrat, Inter, "Segoe UI", sans-serif`;
  const fit = (text: string, max: number) => {
    if (ctx.measureText(text).width <= max) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + "…").width > max) t = t.slice(0, -1);
    return t + "…";
  };

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = font(600, 34);
  ctx.fillText(fit(`${userName} · ${rangeLabel}`, W - 160), 80, 130);

  ctx.fillStyle = "#fff";
  ctx.font = font(800, 150);
  ctx.fillText(formatMinutes(stats.totalMs), 80, 300);
  ctx.fillStyle = accent;
  ctx.font = font(700, 44);
  ctx.fillText(labels.minutes, 84, 365);

  const list = (title: string, rows: string[], y: number) => {
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = font(700, 32);
    ctx.fillText(title.toUpperCase(), 80, y);
    rows.slice(0, 5).forEach((row, i) => {
      const ry = y + 70 + i * 66;
      ctx.fillStyle = accent;
      ctx.font = font(800, 40);
      ctx.fillText(String(i + 1), 80, ry);
      ctx.fillStyle = "#fff";
      ctx.font = font(600, 40);
      ctx.fillText(fit(row, W - 220), 140, ry);
    });
  };
  list(labels.topSongs, stats.topTracks.map((t) => `${t.track.title} — ${t.track.artists}`), 480);
  list(labels.topArtists, stats.topArtists.map((a) => a.name), 900);

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = font(600, 28);
  ctx.fillText(labels.footer, 80, H - 70);

  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `liner-wrapped-${new Date().toISOString().slice(0, 10)}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}
