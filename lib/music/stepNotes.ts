import type { Step } from "@/types";

/**
 * Returns all notes to sound for a step; uses `notes` when set, otherwise `note`.
 */
export function resolveStepNotes(step: Step): string[] {
  if (step.notes && step.notes.length > 0) {
    return step.notes;
  }
  if (step.active && step.note) {
    return [step.note];
  }
  return [];
}
