import { afterEach, describe, expect, it } from "vitest";
import { selectBestAudioFormat, setAudioQualityPreference, type AudioFormat } from "./innertubeAudioFormats";

const f = (itag: number, bitrate: number): AudioFormat => ({ itag, bitrate, url: `u${itag}`, mimeType: "audio/webm" });
const formats = [f(249, 50_000), f(250, 70_000), f(251, 160_000), f(140, 128_000)];

describe("streaming quality", () => {
  afterEach(() => setAudioQualityPreference("best"));

  it("picks the best stream by default", () => {
    expect(selectBestAudioFormat(formats)?.itag).toBe(251);
  });

  it("picks smaller streams for balanced and data saver", () => {
    setAudioQualityPreference("balanced");
    expect(selectBestAudioFormat(formats)?.itag).toBe(250);
    setAudioQualityPreference("saver");
    expect(selectBestAudioFormat(formats)?.itag).toBe(249);
  });
});
