import type { HarmonicPlan } from "@/types";

const NOTE_TO_MIDI: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

const MIDI_TO_NOTE = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const DEGREE_OFFSETS: Record<string, number> = {
  "1": 0,
  b2: 1,
  "2": 2,
  b3: 3,
  "3": 4,
  "4": 5,
  b5: 6,
  "5": 7,
  b6: 8,
  "6": 9,
  b7: 10,
  "7": 11,
};

const MODE_DEGREES: Record<HarmonicPlan["mode"], HarmonicPlan["scaleDegrees"]> = {
  minor: ["1", "2", "b3", "4", "5", "b6", "b7"],
  phrygian: ["1", "b2", "b3", "4", "5", "b6", "b7"],
  dorian: ["1", "2", "b3", "4", "5", "6", "b7"],
  "harmonic-minor": ["1", "2", "b3", "4", "5", "b6", "7"],
};

/**
 * Convert a scale degree and octave into a note name.
 */
export function degreeToNote(plan: HarmonicPlan, degree: string, octave: number): string {
  const root = NOTE_TO_MIDI[plan.key] ?? NOTE_TO_MIDI[plan.key.toUpperCase()] ?? NOTE_TO_MIDI.F;
  const fallbackDegree = MODE_DEGREES[plan.mode][0] ?? "1";
  const offset = DEGREE_OFFSETS[degree] ?? DEGREE_OFFSETS[fallbackDegree] ?? 0;
  const midi = root + offset + (octave + 1) * 12;
  const note = MIDI_TO_NOTE[((midi % 12) + 12) % 12] ?? "F";
  return `${note}${Math.floor(midi / 12) - 1}`;
}

/**
 * Clamp rendered notes into an instrument-friendly octave range.
 */
export function clampOctave(octave: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(octave)));
}

/**
 * Resolve chord symbols from a harmonic plan for arrangement metadata.
 */
export function buildChordProgression(plan: HarmonicPlan): Array<{ chord: string; bars: number }> {
  return plan.progression.map((item) => ({
    chord: item.chord,
    bars: item.bars,
  }));
}
