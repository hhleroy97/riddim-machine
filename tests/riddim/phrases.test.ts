import assert from "node:assert/strict";
import test from "node:test";

import { renderMotifPhrases } from "../../lib/riddim/phrases";
import type { HarmonicPlan, MotifPlan } from "../../types";

const harmonicPlan: HarmonicPlan = {
  key: "F",
  mode: "minor",
  scaleDegrees: ["1", "2", "b3", "4", "5", "b6", "b7"],
  progression: [{ degree: "i", chord: "Fm", function: "tonic", bars: 4 }],
};

const motifPlan: MotifPlan = {
  bass: {
    contour: "leap-return",
    variationStrategy: "answer",
    density: 0.35,
    events: [
      { step: 0, degree: "1", octave: 1, length: 1, velocity: 0.9, articulation: "growl" },
      { step: 18, degree: "b5", octave: 1, length: 1, velocity: 0.75, articulation: "answer" },
    ],
  },
  lead: {
    relationship: "answer-bass",
    density: 0.2,
    events: [{ step: 10, degree: "5", octave: 4, length: 1, velocity: 0.55, articulation: "answer" }],
  },
  chords: {
    voicing: "stabs",
    density: 0.2,
    events: [{ step: 4, degree: "b3", octave: 3, length: 1, velocity: 0.5, articulation: "stab" }],
  },
  drums: {
    kickSteps: [0, 10, 32],
    snareSteps: [4, 12, 36, 44],
    hatSteps: [2, 6, 10, 14],
    swing: 0.08,
  },
};

test("renderMotifPhrases creates multi-bar role-separated phrases", () => {
  const rendered = renderMotifPhrases(harmonicPlan, motifPlan, 4, 0.8);
  assert.equal(rendered.bass.length, 64);
  assert.equal(rendered.lead.length, 64);
  assert.equal(rendered.chords.length, 64);
  assert.equal(rendered.kick[0]?.active, true);
  assert.equal(rendered.snare[4]?.active, true);
  assert.equal(rendered.bass[0]?.note, "F1");
  assert.equal(rendered.bass[18]?.active, true);
  assert.equal(rendered.lead[10]?.active, true);
});

test("renderMotifPhrases preserves AI-authored absolute step positions", () => {
  const denseMotif: MotifPlan = {
    ...motifPlan,
    bass: {
      ...motifPlan.bass,
      events: [
        { step: 0, degree: "1", octave: 1, length: 1, velocity: 0.9, articulation: "growl" },
        { step: 4, degree: "b3", octave: 1, length: 1, velocity: 0.7, articulation: "growl" },
        { step: 8, degree: "5", octave: 1, length: 1, velocity: 0.7, articulation: "growl" },
        { step: 12, degree: "b7", octave: 1, length: 1, velocity: 0.7, articulation: "answer" },
        { step: 16, degree: "1", octave: 1, length: 1, velocity: 0.8, articulation: "growl" },
      ],
    },
  };

  const rendered = renderMotifPhrases(harmonicPlan, denseMotif, 4, 0.8);
  assert.equal(rendered.bass[16]?.active, true);
  assert.equal(rendered.bass[32]?.active, false);
});
