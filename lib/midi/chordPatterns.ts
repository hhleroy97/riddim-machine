import type { AIChordResult, ChordEvent, Step, Track } from "@/types";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const STEPS_PER_BAR = 16;

function parseChordRoot(chord: string): { root: string; minor: boolean } {
  const cleaned = chord.trim();
  const root = cleaned.slice(0, cleaned.includes("#") ? 2 : 1) || "F";
  return { root, minor: /m(?!aj)/i.test(cleaned) };
}

function noteToMidi(note: string): number {
  const match = note.match(/^([A-G]#?)(-?\d)$/);
  if (!match) {
    return 41;
  }
  const [, pitch, octaveRaw] = match;
  const octave = Number(octaveRaw);
  return (octave + 1) * 12 + NOTE_NAMES.indexOf(pitch);
}

function midiToNote(value: number): string {
  const clamped = Math.max(24, Math.min(108, Math.round(value)));
  const pitch = NOTE_NAMES[clamped % 12];
  const octave = Math.floor(clamped / 12) - 1;
  return `${pitch}${octave}`;
}

function chordNotes(chord: string, octave: number): string[] {
  const { root, minor } = parseChordRoot(chord);
  const rootMidi = noteToMidi(`${root}${octave}`);
  const third = rootMidi + (minor ? 3 : 4);
  const fifth = rootMidi + 7;
  return [midiToNote(rootMidi), midiToNote(third), midiToNote(fifth)];
}

/**
 * Normalizes chord agent output into weighted {@link ChordEvent}s for sequencer expansion.
 *
 * When `progression` is omitted, each symbol is one bar-wide span (`bars: 1`) cycling through the phrase.
 *
 * `barBudget` fills in when the progression is empty but `chords` is also missing.
 */
export function normalizeChordAgentProgression(
  result: AIChordResult,
  barBudget: number,
): ChordEvent[] {
  const safeBudget = Math.max(1, Math.min(32, Math.floor(barBudget)));

  if (Array.isArray(result.progression) && result.progression.length > 0) {
    const out: ChordEvent[] = [];
    for (const event of result.progression) {
      const chord =
        typeof event.chord === "string" && event.chord.trim().length > 0
          ? event.chord.trim()
          : "";
      if (!chord) continue;
      const bars = Number.isFinite(event.bars)
        ? Math.max(1, Math.min(16, Math.floor(event.bars)))
        : 1;
      out.push({ chord, bars });
    }
    return out.length > 0 ? out : [{ chord: "Fm", bars: safeBudget }];
  }

  const symbols = result.chords
    .map((c) => (typeof c === "string" ? c.trim() : ""))
    .filter((c) => c.length > 0);

  if (symbols.length === 0) {
    return [{ chord: "Fm", bars: safeBudget }];
  }

  return symbols.map((chord) => ({ chord, bars: 1 }));
}

/**
 * Generates deterministic chord-stab steps (triad voiced together on quarter-note hits).
 */
export function buildChordPattern(chords: ChordEvent[], octave = 3): Step[] {
  const steps = Array.from({ length: STEPS_PER_BAR }, (): Step => ({
    active: false,
    note: "C3",
    velocity: 0.7,
  }));

  if (chords.length === 0) {
    return steps;
  }

  const expanded: string[] = [];
  chords.forEach((event) => {
    const events = Math.max(1, event.bars) * 4;
    for (let index = 0; index < events; index += 1) {
      expanded.push(event.chord);
    }
  });

  for (let index = 0; index < STEPS_PER_BAR; index += 4) {
    const chord = expanded[index % expanded.length];
    if (!chord) {
      continue;
    }
    const tones = chordNotes(chord, octave);
    steps[index] = {
      active: true,
      note: tones[0] ?? "C3",
      notes: tones,
      velocity: 0.55 + ((index / 4) % 4) * 0.07,
    };
  }

  return steps;
}

/**
 * Injects a section variant into a track's clipVariants map.
 */
export function withChordVariant(
  track: Track,
  variantId: string,
  chords: ChordEvent[],
  octave = 3,
): Track {
  const variant = buildChordPattern(chords, octave);
  return {
    ...track,
    clipVariants: {
      ...(track.clipVariants ?? {}),
      [variantId]: variant,
    },
  };
}
