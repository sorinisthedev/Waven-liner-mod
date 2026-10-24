import { describe, it, expect } from "vitest";
import { fuzzyScore } from "./commandStore";

describe("fuzzyScore", () => {
  it("prefers direct substring matches", () => {
    expect(fuzzyScore("stat", "Stats")).toBeGreaterThan(fuzzyScore("stat", "Sleep timer: 15 min"));
  });
  it("matches subsequences and rejects misses", () => {
    expect(fuzzyScore("prf", "Turn on performance mode")).toBeGreaterThan(0);
    expect(fuzzyScore("zzz", "Home")).toBe(-1);
  });
});
