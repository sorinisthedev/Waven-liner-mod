import { create } from "zustand";
import { isLocalTrackId, localTrackFormat, localTrackPath } from "@/shared/local/localFiles";

/** what is actually coming out of the speakers right now, for the quality badge */
export interface StreamInfo {
  trackId: string;
  codec: string;
  bitrateKbps: number;
  sampleRate?: number;
  bitDepth?: number;
  lossless: boolean;
  origin: "stream" | "saved" | "file";
}

interface StreamInfoState {
  info: StreamInfo | null;
  setInfo: (info: StreamInfo | null) => void;
}

export const useStreamInfoStore = create<StreamInfoState>((set) => ({
  info: null,
  setInfo: (info) => set({ info }),
}));

const LOSSLESS_CODECS = /flac|alac|pcm|wav|aiff|ape|wavpack/i;

export function codecFromMime(mime: string): string {
  if (/webm|opus/i.test(mime)) return "opus";
  if (/mp4|aac|m4a/i.test(mime)) return "aac";
  if (/mpeg|mp3/i.test(mime)) return "mp3";
  if (/flac/i.test(mime)) return "flac";
  if (/wav/i.test(mime)) return "pcm";
  if (/ogg/i.test(mime)) return "vorbis";
  return "";
}

function cleanCodec(codec: string): string {
  const c = codec.toLowerCase();
  if (c.includes("flac")) return "flac";
  if (c.includes("alac")) return "alac";
  if (c.includes("pcm") || c.includes("wav")) return "pcm";
  if (c.includes("opus")) return "opus";
  if (c.includes("vorbis")) return "vorbis";
  if (c.includes("mpeg") && c.includes("3")) return "mp3";
  if (c.includes("mp3")) return "mp3";
  if (c.includes("aac") || c.includes("mp4a")) return "aac";
  return c.split(/[\s/]/)[0] ?? "";
}

export function publishStreamInfo(
  trackId: string,
  codec: string,
  bitrateBps: number,
  origin: StreamInfo["origin"],
) {
  if (isLocalTrackId(trackId)) {
    const format = localTrackFormat(trackId);
    const isAiff = /\.aif[cf]?$/i.test(localTrackPath(trackId));
    const fileCodec = isAiff ? "aiff" : cleanCodec(format?.codec || codec);
    useStreamInfoStore.getState().setInfo({
      trackId,
      codec: fileCodec,
      bitrateKbps: Math.round((format?.bitrate || bitrateBps) / 1000),
      sampleRate: format?.sampleRate,
      bitDepth: format?.bitsPerSample,
      lossless: Boolean(format?.lossless) || LOSSLESS_CODECS.test(fileCodec),
      origin: "file",
    });
    return;
  }
  const clean = cleanCodec(codec);
  useStreamInfoStore.getState().setInfo({
    trackId,
    codec: clean,
    bitrateKbps: Math.round(bitrateBps / 1000),
    lossless: LOSSLESS_CODECS.test(clean),
    origin,
  });
}

const CODEC_NAMES: Record<string, string> = {
  opus: "Opus",
  aac: "AAC",
  mp3: "MP3",
  flac: "FLAC",
  alac: "ALAC",
  pcm: "WAV",
  aiff: "AIFF",
  vorbis: "Vorbis",
};

export function codecName(codec: string): string {
  return CODEC_NAMES[codec] ?? codec.toUpperCase();
}

/** short label for the badge, e.g. "FLAC 24/96" or "OPUS 160" */
export function qualityLabel(info: StreamInfo): string {
  const name = codecName(info.codec).toUpperCase();
  if (info.lossless) {
    const khz = info.sampleRate ? Math.round(info.sampleRate / 100) / 10 : 0;
    if (info.bitDepth && khz) return `${name} ${info.bitDepth}/${khz % 1 === 0 ? khz : khz.toFixed(1)}`;
    return `${name} LOSSLESS`;
  }
  return info.bitrateKbps > 0 ? `${name} ${info.bitrateKbps}` : name;
}
