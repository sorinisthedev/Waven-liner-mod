import { app, dialog, ipcMain, protocol, type BrowserWindow } from "electron";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";

/**
 * Your own music files. You pick folders, they get scanned for audio and tags,
 * and the renderer plays them through waven-media://, which only serves files
 * inside the folders you added.
 */

export const LOCAL_MEDIA_SCHEME = "waven-media";

const AUDIO_EXT = new Map<string, string>([
  [".mp3", "audio/mpeg"],
  [".m4a", "audio/mp4"],
  [".aac", "audio/aac"],
  [".flac", "audio/flac"],
  [".wav", "audio/wav"],
  [".ogg", "audio/ogg"],
  [".oga", "audio/ogg"],
  [".opus", "audio/ogg"],
  [".webm", "audio/webm"],
  // chromium can't decode aiff, these are turned into wav while serving
  [".aif", "audio/wav"],
  [".aiff", "audio/wav"],
  [".aifc", "audio/wav"],
]);
const AIFF_EXT = new Set([".aif", ".aiff", ".aifc"]);
const MAX_DEPTH = 10;
const MAX_FILES = 20000;

export interface LocalTrackInfo {
  path: string;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  hasCover: boolean;
  mtimeMs: number;
  size: number;
  codec?: string;
  lossless?: boolean;
  sampleRate?: number;
  bitsPerSample?: number;
  bitrate?: number;
}

interface StoredState {
  folders: string[];
  cache: Record<string, LocalTrackInfo>;
}

// must run before app ready: lets <audio> stream and seek, and fetch() read it
export function registerLocalMediaScheme() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: LOCAL_MEDIA_SCHEME,
      privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true, corsEnabled: true },
    },
  ]);
}

const encodePath = (p: string) => Buffer.from(p, "utf8").toString("base64url");
const decodePath = (s: string) => Buffer.from(s, "base64url").toString("utf8");

export class LocalMediaLibrary {
  private readonly file = path.join(app.getPath("userData"), "local-media.json");
  private state: StoredState = { folders: [], cache: {} };
  private scanning: Promise<LocalTrackInfo[]> | null = null;

  constructor(private readonly getWindow: () => BrowserWindow | null) {
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, "utf8")) as Partial<StoredState>;
      this.state = {
        folders: Array.isArray(raw.folders) ? raw.folders.filter((f) => typeof f === "string") : [],
        cache: raw.cache && typeof raw.cache === "object" ? raw.cache : {},
      };
    } catch {
      // first run
    }

    ipcMain.handle("localmedia:get-folders", () => this.state.folders);
    ipcMain.handle("localmedia:add-folder", async () => {
      const win = this.getWindow();
      const result = win
        ? await dialog.showOpenDialog(win, { properties: ["openDirectory"], title: "Add a music folder" })
        : await dialog.showOpenDialog({ properties: ["openDirectory"], title: "Add a music folder" });
      if (result.canceled || !result.filePaths[0]) return this.state.folders;
      const folder = path.resolve(result.filePaths[0]);
      if (!this.state.folders.includes(folder)) {
        this.state.folders.push(folder);
        this.save();
      }
      return this.state.folders;
    });
    ipcMain.handle("localmedia:remove-folder", (_e, folder: unknown) => {
      if (typeof folder !== "string") return this.state.folders;
      this.state.folders = this.state.folders.filter((f) => f !== folder);
      this.save();
      return this.state.folders;
    });
    ipcMain.handle("localmedia:scan", () => this.scan());
  }

  registerProtocolHandler() {
    protocol.handle(LOCAL_MEDIA_SCHEME, async (request) => {
      try {
        const url = new URL(request.url);
        const target = decodePath(url.pathname.replace(/^\//, ""));
        if (!this.isAllowed(target)) return new Response("Not allowed", { status: 403 });
        if (url.hostname === "cover") return await this.serveCover(target);
        if (url.hostname === "file") return this.serveFile(target, request.headers.get("range"));
        return new Response("Not found", { status: 404 });
      } catch {
        return new Response("Not found", { status: 404 });
      }
    });
  }

  /** only files inside a folder the user added are ever served */
  private isAllowed(target: string): boolean {
    const resolved = path.resolve(target);
    if (!AUDIO_EXT.has(path.extname(resolved).toLowerCase())) return false;
    return this.state.folders.some((folder) => {
      const rel = path.relative(folder, resolved);
      return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
    });
  }

  private serveFile(target: string, range: string | null): Response {
    if (AIFF_EXT.has(path.extname(target).toLowerCase())) return serveBuffer(aiffAsWav(target), "audio/wav", range);
    const stat = fs.statSync(target);
    const type = AUDIO_EXT.get(path.extname(target).toLowerCase()) ?? "application/octet-stream";
    const total = stat.size;
    const match = range ? /bytes=(\d*)-(\d*)/.exec(range) : null;
    if (match) {
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Math.min(Number(match[2]), total - 1) : total - 1;
      if (start >= total || start > end) {
        return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${total}` } });
      }
      const stream = Readable.toWeb(fs.createReadStream(target, { start, end })) as ReadableStream;
      return new Response(stream, {
        status: 206,
        headers: {
          "Content-Type": type,
          "Content-Length": String(end - start + 1),
          "Content-Range": `bytes ${start}-${end}/${total}`,
          "Accept-Ranges": "bytes",
        },
      });
    }
    const stream = Readable.toWeb(fs.createReadStream(target)) as ReadableStream;
    return new Response(stream, {
      status: 200,
      headers: { "Content-Type": type, "Content-Length": String(total), "Accept-Ranges": "bytes" },
    });
  }

  private async serveCover(target: string): Promise<Response> {
    const { parseFile, selectCover } = await import("music-metadata");
    const meta = await parseFile(target, { duration: false, skipCovers: false });
    const pic = selectCover(meta.common.picture);
    if (!pic) return new Response("No cover", { status: 404 });
    return new Response(Buffer.from(pic.data), {
      headers: { "Content-Type": pic.format || "image/jpeg", "Cache-Control": "max-age=86400" },
    });
  }

  private save() {
    try {
      fs.writeFileSync(this.file, JSON.stringify(this.state));
    } catch {
      // a failed save only means a slower next scan
    }
  }

  private collect(dir: string, depth: number, out: string[]) {
    if (depth > MAX_DEPTH || out.length >= MAX_FILES) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (out.length >= MAX_FILES) return;
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) this.collect(full, depth + 1, out);
      else if (entry.isFile() && AUDIO_EXT.has(path.extname(entry.name).toLowerCase())) out.push(full);
    }
  }

  scan(): Promise<LocalTrackInfo[]> {
    if (this.scanning) return this.scanning;
    this.scanning = (async () => {
      const { parseFile } = await import("music-metadata");
      const files: string[] = [];
      for (const folder of this.state.folders) this.collect(folder, 0, files);
      const nextCache: Record<string, LocalTrackInfo> = {};
      for (const file of files) {
        let stat: fs.Stats;
        try {
          stat = fs.statSync(file);
        } catch {
          continue;
        }
        const cached = this.state.cache[file];
        if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size && cached.codec !== undefined) {
          nextCache[file] = cached;
          continue;
        }
        const fallbackTitle = path.basename(file, path.extname(file));
        try {
          const meta = await parseFile(file, { duration: true, skipCovers: false });
          nextCache[file] = {
            path: file,
            title: meta.common.title?.trim() || fallbackTitle,
            artist: meta.common.artist?.trim() || meta.common.albumartist?.trim() || "Unknown artist",
            album: meta.common.album?.trim() || "",
            durationMs: Math.round((meta.format.duration ?? 0) * 1000),
            hasCover: Boolean(meta.common.picture?.length),
            mtimeMs: stat.mtimeMs,
            size: stat.size,
            codec: meta.format.codec ?? meta.format.container ?? "",
            lossless: Boolean(meta.format.lossless),
            ...(meta.format.sampleRate ? { sampleRate: meta.format.sampleRate } : {}),
            ...(meta.format.bitsPerSample ? { bitsPerSample: meta.format.bitsPerSample } : {}),
            ...(meta.format.bitrate ? { bitrate: Math.round(meta.format.bitrate) } : {}),
          };
        } catch {
          nextCache[file] = {
            path: file,
            title: fallbackTitle,
            artist: "Unknown artist",
            album: "",
            durationMs: 0,
            hasCover: false,
            mtimeMs: stat.mtimeMs,
            size: stat.size,
            codec: "",
          };
        }
      }
      this.state.cache = nextCache;
      this.save();
      return Object.values(nextCache);
    })().finally(() => {
      this.scanning = null;
    });
    return this.scanning;
  }
}

export function localMediaUrl(kind: "file" | "cover", filePath: string) {
  return `${LOCAL_MEDIA_SCHEME}://${kind}/${encodePath(filePath)}`;
}

// last converted aiff, so seeking doesn't convert the whole file again
let aiffCache: { file: string; mtimeMs: number; wav: Buffer } | null = null;

/** aiff is big-endian pcm, wav is little-endian pcm: swap the bytes and add a wav header */
export function aiffAsWav(file: string): Buffer {
  const mtimeMs = fs.statSync(file).mtimeMs;
  if (aiffCache && aiffCache.file === file && aiffCache.mtimeMs === mtimeMs) return aiffCache.wav;
  const wav = convertAiff(fs.readFileSync(file));
  aiffCache = { file, mtimeMs, wav };
  return wav;
}

function readExtended80(buf: Buffer, offset: number): number {
  const exponent = buf.readUInt16BE(offset) & 0x7fff;
  const hi = buf.readUInt32BE(offset + 2);
  const lo = buf.readUInt32BE(offset + 6);
  return (hi * 2 ** 32 + lo) * 2 ** (exponent - 16383 - 63);
}

export function convertAiff(buf: Buffer): Buffer {
  if (buf.toString("ascii", 0, 4) !== "FORM") throw new Error("not an aiff file");
  const form = buf.toString("ascii", 8, 12);
  let channels = 0;
  let bits = 0;
  let rate = 0;
  let littleEndian = false;
  let isFloat = false;
  let data: Buffer | null = null;
  let pos = 12;
  while (pos + 8 <= buf.length) {
    const id = buf.toString("ascii", pos, pos + 4);
    const size = buf.readUInt32BE(pos + 4);
    const body = pos + 8;
    if (id === "COMM") {
      channels = buf.readUInt16BE(body);
      bits = buf.readUInt16BE(body + 6);
      rate = Math.round(readExtended80(buf, body + 8));
      if (form === "AIFC" && size >= 22) {
        const compression = buf.toString("ascii", body + 18, body + 22);
        if (compression === "sowt") littleEndian = true;
        else if (compression === "fl32" || compression === "FL32") isFloat = true;
        else if (compression !== "NONE" && compression !== "twos") throw new Error("compressed aiff is not supported");
      }
    } else if (id === "SSND") {
      const offset = buf.readUInt32BE(body);
      data = buf.subarray(body + 8 + offset, Math.min(buf.length, body + size));
    }
    pos = body + size + (size % 2);
  }
  if (!data || !channels || !bits || !rate) throw new Error("aiff file is missing audio");
  const bytes = Math.ceil(bits / 8);
  const pcm = Buffer.from(data.subarray(0, data.length - (data.length % (bytes * channels))));
  if (bytes === 1) {
    // aiff 8-bit is signed, wav 8-bit is unsigned
    for (let i = 0; i < pcm.length; i++) pcm[i] = (pcm[i]! + 128) & 0xff;
  } else if (!littleEndian && !isFloat) {
    for (let i = 0; i < pcm.length; i += bytes) pcm.subarray(i, i + bytes).reverse();
  } else if (isFloat) {
    // fl32 is big-endian float
    for (let i = 0; i < pcm.length; i += 4) pcm.subarray(i, i + 4).reverse();
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVEfmt ", 8, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(isFloat ? 3 : 1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * channels * bytes, 28);
  header.writeUInt16LE(channels * bytes, 32);
  header.writeUInt16LE(bytes * 8, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function serveBuffer(buf: Buffer, type: string, range: string | null): Response {
  const total = buf.length;
  const match = range ? /bytes=(\d*)-(\d*)/.exec(range) : null;
  if (match) {
    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Math.min(Number(match[2]), total - 1) : total - 1;
    if (start >= total || start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${total}` } });
    }
    return new Response(new Uint8Array(buf.subarray(start, end + 1)), {
      status: 206,
      headers: {
        "Content-Type": type,
        "Content-Length": String(end - start + 1),
        "Content-Range": `bytes ${start}-${end}/${total}`,
        "Accept-Ranges": "bytes",
      },
    });
  }
  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: { "Content-Type": type, "Content-Length": String(total), "Accept-Ranges": "bytes" },
  });
}
