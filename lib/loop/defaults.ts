import { makeDefaultBassPatch, makeDefaultDeviceChain } from "@/lib/audio/patches";
import type { Step, Track } from "@/types";

const STEP_COUNT = 16;

function makeInactiveStep(note: string): Step {
  return {
    active: false,
    note,
    velocity: 0.8,
  };
}

/**
 * Creates the default initial track set for the studio.
 */
export function createDefaultTracks(): Track[] {
  const leadPatch = makeDefaultBassPatch();
  leadPatch.filter.cutoff = 1800;
  leadPatch.filter.resonance = 1.8;
  leadPatch.ampEnvelope.attack = 0.01;
  leadPatch.ampEnvelope.release = 0.35;

  const chordPatch = makeDefaultBassPatch();
  chordPatch.filter.cutoff = 1400;
  chordPatch.ampEnvelope.attack = 0.04;
  chordPatch.ampEnvelope.release = 0.9;
  chordPatch.fx.chorusMix = 0.45;
  chordPatch.fx.stereoWidth = 0.6;

  return [
    {
      id: "kick",
      name: "Kick",
      type: "drum",
      mute: false,
      solo: false,
      volume: 0.9,
      synthPatch: null,
      deviceChain: makeDefaultDeviceChain("sampler-drum-rack"),
      steps: Array.from({ length: STEP_COUNT }, () => makeInactiveStep("C2")).map(
        (step, index) => ({
          ...step,
          active: index % 4 === 0,
        }),
      ),
    },
    {
      id: "snare",
      name: "Snare",
      type: "drum",
      mute: false,
      solo: false,
      volume: 0.75,
      synthPatch: null,
      deviceChain: makeDefaultDeviceChain("sampler-drum-rack"),
      steps: Array.from({ length: STEP_COUNT }, () => makeInactiveStep("D2")).map(
        (step, index) => ({
          ...step,
          active: index % 8 === 4,
        }),
      ),
    },
    {
      id: "hihat",
      name: "Hi-Hats",
      type: "drum",
      role: "rhythm",
      mute: false,
      solo: false,
      volume: 0.6,
      synthPatch: null,
      deviceChain: makeDefaultDeviceChain("sampler-drum-rack"),
      steps: Array.from({ length: STEP_COUNT }, () => makeInactiveStep("F#2")).map(
        (step, index) => ({
          ...step,
          active: index % 2 === 1,
          velocity: index % 4 === 3 ? 0.55 : 0.38,
        }),
      ),
    },
    {
      id: "bass",
      name: "Wobble Bass",
      type: "bass",
      role: "bass",
      mute: false,
      solo: false,
      volume: 0.7,
      synthPatch: makeDefaultBassPatch(),
      deviceChain: makeDefaultDeviceChain("subtractive-bass"),
      steps: Array.from({ length: STEP_COUNT }, () => makeInactiveStep("F1")).map(
        (step, index) => ({
          ...step,
          active: index % 2 === 0,
          velocity: 0.65,
        }),
      ),
    },
    {
      id: "lead",
      name: "Lead Synth",
      type: "bass",
      role: "lead",
      mute: false,
      solo: false,
      volume: 0.62,
      synthPatch: leadPatch,
      deviceChain: makeDefaultDeviceChain("supersaw-stack"),
      steps: Array.from({ length: STEP_COUNT }, () => makeInactiveStep("F3")).map(
        (step, index) => ({
          ...step,
          active: [0, 3, 6, 10, 12, 14].includes(index),
          velocity: 0.58,
        }),
      ),
    },
    {
      id: "chords",
      name: "Chord Synth",
      type: "bass",
      role: "harmony",
      mute: false,
      solo: false,
      volume: 0.56,
      synthPatch: chordPatch,
      deviceChain: makeDefaultDeviceChain("wavetable-synth"),
      steps: Array.from({ length: STEP_COUNT }, () => makeInactiveStep("F2")).map(
        (step, index) => ({
          ...step,
          active: index % 4 === 0,
          velocity: 0.52,
        }),
      ),
    },
  ];
}
