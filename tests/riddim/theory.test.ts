import assert from "node:assert/strict";
import test from "node:test";

import { buildChordProgression, degreeToNote } from "../../lib/riddim/theory";
import type { HarmonicPlan } from "../../types";

const harmonicPlan: HarmonicPlan = {
  key: "F",
  mode: "phrygian",
  scaleDegrees: ["1", "b2", "b3", "4", "5", "b6", "b7"],
  progression: [
    { degree: "i", chord: "Fm", function: "tonic", bars: 2 },
    { degree: "bII", chord: "Gb", function: "tension", bars: 2 },
  ],
};

test("degreeToNote converts modal scale degrees into note names", () => {
  assert.equal(degreeToNote(harmonicPlan, "1", 2), "F2");
  assert.equal(degreeToNote(harmonicPlan, "b2", 2), "F#2");
  assert.equal(degreeToNote(harmonicPlan, "5", 1), "C2");
});

test("buildChordProgression preserves harmonic bar spans", () => {
  assert.deepEqual(buildChordProgression(harmonicPlan), [
    { chord: "Fm", bars: 2 },
    { chord: "Gb", bars: 2 },
  ]);
});
