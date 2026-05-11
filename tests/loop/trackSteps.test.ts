import assert from "node:assert/strict";
import test from "node:test";

import { makeDefaultDeviceChain } from "../../lib/audio/patches";
import { coerceTrackSteps } from "../../lib/loop/trackSteps";
import type { Track } from "../../types";

function minimalDrumTrack(overrides: Partial<Track>): Track {
  return {
    id: "kick",
    name: "Kick",
    type: "drum",
    mute: false,
    solo: false,
    volume: 0.9,
    steps: [],
    synthPatch: null,
    deviceChain: makeDefaultDeviceChain("sampler-drum-rack"),
    ...overrides,
  };
}

test("coerceTrackSteps fills 16 steps when steps is undefined", () => {
  const raw = { ...minimalDrumTrack({}), steps: undefined as unknown as Track["steps"] };
  const out = coerceTrackSteps(raw);
  assert.equal(out.steps.length, 16);
  assert.equal(out.steps.every((s) => s.note === "C2"), true);
});

test("coerceTrackSteps accepts boolean shorthand steps from loose JSON", () => {
  const raw = minimalDrumTrack({
    steps: [true, false, true] as unknown as Track["steps"],
  });
  const out = coerceTrackSteps(raw);
  assert.equal(out.steps[0].active, true);
  assert.equal(out.steps[1].active, false);
  assert.equal(out.steps[15].active, false);
});

test("coerceTrackSteps truncates grids longer than 16", () => {
  const twenty = Array.from({ length: 20 }, (_, i) => ({
    active: i === 19,
    note: "C2",
    velocity: 0.5 as const,
  }));
  const raw = minimalDrumTrack({ steps: twenty });
  const out = coerceTrackSteps(raw);
  assert.equal(out.steps.length, 16);
  assert.equal(out.steps[15].active, false);
});

test("coerceTrackSteps preserves polyphonic step notes arrays", () => {
  const raw = minimalDrumTrack({
    id: "chords",
    type: "bass",
    deviceChain: makeDefaultDeviceChain("wavetable-synth"),
    steps: [
      { active: true, note: "F2", notes: ["F2", "Ab2", "C3"], velocity: 0.6 },
      ...Array.from({ length: 15 }, () => ({
        active: false,
        note: "C2",
        velocity: 0.5 as const,
      })),
    ] as Track["steps"],
  });
  const out = coerceTrackSteps(raw);
  assert.deepEqual(out.steps[0].notes, ["F2", "Ab2", "C3"]);
});

test("coerceTrackSteps uses bass default note by id", () => {
  const raw = minimalDrumTrack({
    id: "bass",
    name: "Bass",
    type: "bass",
    synthPatch: null,
    deviceChain: makeDefaultDeviceChain("subtractive-bass"),
    steps: undefined as unknown as Track["steps"],
  });
  const out = coerceTrackSteps(raw);
  assert.equal(out.steps[0].note, "F1");
});
