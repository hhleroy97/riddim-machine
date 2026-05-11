import assert from "node:assert/strict";
import test from "node:test";

import {
  cloneStepForSequence,
  copyStepAudioFields,
} from "../../lib/audio/sequencerStepSync";

test("cloneStepForSequence detaches notes array from store", () => {
  const source: { active: boolean; note: string; velocity: number; notes: string[] } = {
    active: true,
    note: "C4",
    velocity: 100,
    notes: ["C4", "E4"],
  };
  const clone = cloneStepForSequence(source);
  assert.notStrictEqual(clone.notes, source.notes);
  source.notes.push("G4");
  assert.equal(clone.notes?.length, 2);
});

test("copyStepAudioFields mutates target in place and clears notes when source has none", () => {
  const target = cloneStepForSequence({
    active: false,
    note: "C1",
    velocity: 80,
    notes: ["C1", "D1"],
  });
  const ref = target;
  copyStepAudioFields(target, { active: true, note: "E1", velocity: 120 });
  assert.strictEqual(target, ref);
  assert.equal(target.active, true);
  assert.equal(target.note, "E1");
  assert.equal(target.velocity, 120);
  assert.equal("notes" in target, false);
});
