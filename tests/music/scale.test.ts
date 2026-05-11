import assert from "node:assert/strict";
import test from "node:test";

import { buildScaleNotes, resolveScaleNote } from "../../lib/music/scale";

test("buildScaleNotes returns descending notes for a selected scale", () => {
  const notes = buildScaleNotes({
    root: "F",
    scale: "minor",
    minOctave: 1,
    maxOctave: 1,
  });

  assert.deepEqual(notes, ["D#2", "C#2", "C2", "A#1", "G#1", "G1", "F1"]);
});

test("buildScaleNotes supports modal scale interval differences", () => {
  const minor = buildScaleNotes({
    root: "F",
    scale: "minor",
    minOctave: 1,
    maxOctave: 1,
  });
  const phrygian = buildScaleNotes({
    root: "F",
    scale: "phrygian",
    minOctave: 1,
    maxOctave: 1,
  });

  assert.ok(minor.includes("G1"));
  assert.ok(!phrygian.includes("G1"));
  assert.ok(phrygian.includes("F#1"));
});

test("resolveScaleNote preserves in-scale notes and falls back otherwise", () => {
  const notes = ["F2", "D#2", "C2"];

  assert.equal(resolveScaleNote("D#2", notes), "D#2");
  assert.equal(resolveScaleNote("E2", notes), "F2");
});
