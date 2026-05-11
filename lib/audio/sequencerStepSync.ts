import type { Step } from "@/types";

/**
 * Per-slot container for {@link Tone.Sequence} so callbacks get a stable step index.
 * Tone.js 15 proxies `sequence.events` and reschedules the entire Part on indexed
 * assignment — only mutate {@link SequencedStepCell.step} in place during playback.
 */
export interface SequencedStepCell {
  readonly idx: number;
  step: Step;
}

/** Shallow-clone a step for isolation from store references. */
export function cloneStepForSequence(step: Step): Step {
  return {
    active: step.active,
    note: step.note,
    velocity: step.velocity,
    ...(step.notes !== undefined ? { notes: [...step.notes] } : {}),
  };
}

/** Copy sequencer-audio fields without replacing the target object reference. */
export function copyStepAudioFields(target: Step, source: Step): void {
  target.active = source.active;
  target.note = source.note;
  target.velocity = source.velocity;
  if (source.notes !== undefined) {
    target.notes = [...source.notes];
  } else {
    delete target.notes;
  }
}
