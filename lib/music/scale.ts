export type ScaleName =
  | "minor"
  | "major"
  | "phrygian"
  | "dorian"
  | "harmonic-minor";

export const CHROMATIC_NOTES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

export type ChromaticNote = (typeof CHROMATIC_NOTES)[number];

const SCALE_INTERVALS: Record<ScaleName, number[]> = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  "harmonic-minor": [0, 2, 3, 5, 7, 8, 11],
};

/**
 * Builds note names in descending piano-roll order for the selected key and scale.
 */
export function buildScaleNotes(args: {
  root: ChromaticNote;
  scale: ScaleName;
  minOctave: number;
  maxOctave: number;
}): string[] {
  const { root, scale, minOctave, maxOctave } = args;
  const rootIndex = CHROMATIC_NOTES.indexOf(root);
  const intervals = SCALE_INTERVALS[scale];
  const low = Math.min(minOctave, maxOctave);
  const high = Math.max(minOctave, maxOctave);
  const notes: string[] = [];

  for (let octave = high; octave >= low; octave -= 1) {
    [...intervals].reverse().forEach((interval) => {
      const pitchIndex = (rootIndex + interval) % CHROMATIC_NOTES.length;
      const octaveOffset = rootIndex + interval >= CHROMATIC_NOTES.length ? 1 : 0;
      const pitch = CHROMATIC_NOTES[pitchIndex];
      notes.push(`${pitch}${octave + octaveOffset}`);
    });
  }

  return notes;
}

/**
 * Returns the nearest listed scale note, preserving an existing note when possible.
 */
export function resolveScaleNote(note: string, scaleNotes: string[]): string {
  if (scaleNotes.includes(note)) {
    return note;
  }

  return scaleNotes[0] ?? note;
}
