import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ app: {}, dialog: {}, ipcMain: { handle: () => {} }, protocol: {} }));

const { convertAiff } = await import("./localMedia");

function extended80(rate: number): Buffer {
  const out = Buffer.alloc(10);
  const exp = Math.floor(Math.log2(rate));
  out.writeUInt16BE(exp + 16383, 0);
  const mantissa = rate / 2 ** exp; // 1.x
  out.writeUInt32BE(Math.floor(mantissa * 2 ** 31) >>> 0, 2);
  return out;
}

function aiff(samples: number[], channels = 2, rate = 44100): Buffer {
  const pcm = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => pcm.writeInt16BE(s, i * 2));
  const comm = Buffer.concat([Buffer.from("COMM"), Buffer.from([0, 0, 0, 18]), Buffer.alloc(8), extended80(rate)]);
  comm.writeUInt16BE(channels, 8);
  comm.writeUInt32BE(samples.length / channels, 10);
  comm.writeUInt16BE(16, 14);
  const ssndHead = Buffer.alloc(16);
  ssndHead.write("SSND", 0, "ascii");
  ssndHead.writeUInt32BE(8 + pcm.length, 4);
  const body = Buffer.concat([Buffer.from("AIFF"), comm, ssndHead, pcm]);
  const form = Buffer.alloc(8);
  form.write("FORM", 0, "ascii");
  form.writeUInt32BE(body.length, 4);
  return Buffer.concat([form, body]);
}

describe("aiff to wav", () => {
  it("keeps the samples, rate and channels", () => {
    const wav = convertAiff(aiff([1000, -1000, 32767, -32768]));
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.readUInt16LE(22)).toBe(2);
    expect(wav.readUInt32LE(24)).toBe(44100);
    expect(wav.readUInt16LE(34)).toBe(16);
    expect([0, 1, 2, 3].map((i) => wav.readInt16LE(44 + i * 2))).toEqual([1000, -1000, 32767, -32768]);
  });

  it("reads other sample rates", () => {
    expect(convertAiff(aiff([0, 0], 1, 96000)).readUInt32LE(24)).toBe(96000);
  });

  it("rejects files that aren't aiff", () => {
    expect(() => convertAiff(Buffer.from("RIFF0000WAVE"))).toThrow();
  });
});
