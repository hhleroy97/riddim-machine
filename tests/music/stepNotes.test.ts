import assert from "node:assert/strict";
import test from "node:test";

import { resolveStepNotes } from "../../lib/music/stepNotes";
import type { Step } from "../../types";

function step(partial: Partial<Step>): Step {
  return {
    active: false,
    note: "C3",
    velocity: 0.8,
    ...partial,
  };
}

test("resolveStepNotes prefers chord voicing notes when polyphonic slot is authored", () => {
  const notes = resolveStepNotes(
    step({ active: true, note: "F3", notes: ["F3", "G#3", "C4"] }),
  );
  assert.deepEqual(notes, ["F3", "G#3", "C4"]);
});

test("resolveStepNotes falls back to note for monophonic active steps", () => {
  const notes = resolveStepNotes(step({ active: true, note: "G2" }));
  assert.deepEqual(notes, ["G2"]);
});

test("resolveStepNotes returns empty when inactive and monophonic", () => {
  assert.deepEqual(resolveStepNotes(step({ active: false, note: "D3" })), []);
});
