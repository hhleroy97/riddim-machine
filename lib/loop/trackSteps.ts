import type { Step, Track } from "@/types";

const STEP_COUNT = 16;

const DEFAULT_NOTE_BY_ID: Record<string, string> = {
  kick: "C2",
  snare: "D2",
  bass: "F1",
};

/**
 * Resolves a fallback MIDI-style note when the model omits per-step notes.
 */
function defaultNoteForTrack(track: Track): string {
  return DEFAULT_NOTE_BY_ID[track.id] ?? (track.type === "bass" ? "F1" : "C2");
}

/**
 * Coerces unknown model output into a valid {@link Step} for the sequencer.
 */
function coerceStep(raw: unknown, fallbackNote: string): Step {
  if (typeof raw === "boolean") {
    return { active: raw, note: fallbackNote, velocity: 0.8 };
  }

  if (typeof raw === "number" && (raw === 0 || raw === 1)) {
    return { active: raw === 1, note: fallbackNote, velocity: 0.8 };
  }

  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const active = Boolean(o.active);
    const note =
      typeof o.note === "string" && o.note.length > 0 ? o.note : fallbackNote;
    let velocity = 0.8;
    if (typeof o.velocity === "number" && Number.isFinite(o.velocity)) {
      velocity = Math.max(0, Math.min(1, o.velocity));
    }

    let notes: string[] | undefined;
    if (Array.isArray(o.notes)) {
      const parsed = o.notes.filter(
        (candidate): candidate is string => typeof candidate === "string" && candidate.length > 0,
      );
      notes = parsed.length >= 2 ? parsed : undefined;
    }

    const step: Step = { active, note, velocity };
    if (notes) {
      step.notes = notes;
    }
    return step;
  }

  return { active: false, note: fallbackNote, velocity: 0.8 };
}

/**
 * Ensures every track has exactly {@link STEP_COUNT} steps so UI and audio never see `undefined`.
 * Truncates longer arrays; pads shorter or missing `steps` with inactive steps.
 */
export function coerceTrackSteps(track: Track): Track {
  const fallback = defaultNoteForTrack(track);
  const raw = track.steps;
  const source = Array.isArray(raw) ? raw : [];
  const steps: Step[] = Array.from({ length: STEP_COUNT }, (_, index) =>
    coerceStep(source[index], fallback),
  );
  return { ...track, steps };
}
