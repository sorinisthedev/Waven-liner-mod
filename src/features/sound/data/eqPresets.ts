// gains in dB for the 32 Hz … 16 kHz bands (see EQ_FREQUENCIES)
export interface EqPreset {
  id: string;
  gains: readonly number[];
}

export const EQ_BAND_LABELS = ["32", "64", "125", "250", "500", "1k", "2k", "4k", "8k", "16k"] as const;

export const EQ_PRESETS: readonly EqPreset[] = [
  { id: "flat", gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { id: "bass_boost", gains: [6, 5, 4, 2, 0, 0, 0, 0, 0, 0] },
  { id: "bass_reducer", gains: [-6, -5, -4, -2, 0, 0, 0, 0, 0, 0] },
  { id: "treble_boost", gains: [0, 0, 0, 0, 0, 1, 2, 4, 5, 6] },
  { id: "vocal", gains: [-2, -2, -1, 1, 3, 4, 3, 1, 0, -1] },
  { id: "pop", gains: [-1, 1, 3, 4, 3, 0, -1, -1, 1, 2] },
  { id: "rock", gains: [4, 3, 2, 0, -1, -1, 1, 3, 4, 4] },
  { id: "electronic", gains: [5, 4, 1, 0, -2, 1, 0, 1, 4, 5] },
  { id: "hip_hop", gains: [5, 4, 2, 3, -1, -1, 1, 0, 2, 3] },
  { id: "acoustic", gains: [3, 3, 2, 1, 2, 2, 3, 3, 2, 1] },
  { id: "late_night", gains: [3, 2, 1, 0, -1, -1, 0, 1, 2, 2] },
] as const;

export function findEqPreset(id: string | undefined) {
  return EQ_PRESETS.find((p) => p.id === id);
}
