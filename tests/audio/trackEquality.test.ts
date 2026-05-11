import assert from "node:assert/strict";
import test from "node:test";

import {
  deviceChainsEqual,
  hasSynthPatchChanged,
  stepsAudioEqual,
  synthPatchesEqual,
} from "@/lib/audio/trackEquality";
import type { DeviceChain, Step, SynthPatch, Track } from "@/types";

const baseSynthPatch = (): SynthPatch => ({
  version: 1,
  oscillators: [
    {
      id: "a",
      enabled: true,
      waveform: "sawtooth",
      octave: 0,
      detune: 0,
      gain: 0.5,
    },
  ],
  ampEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.2 },
  modEnvelope: { attack: 0.01, decay: 0.15, sustain: 0.4, release: 0.3 },
  filter: { cutoff: 2800, resonance: 4, envelopeAmount: 0.35 },
  fx: {
    drive: 0,
    chorusMix: 0,
    stereoWidth: 0.55,
    lowCut: 60,
    highCut: 12000,
  },
  macros: [
    { id: "macro1", label: "A", value: 0 },
    { id: "macro2", label: "B", value: 0 },
    { id: "macro3", label: "C", value: 0 },
    { id: "macro4", label: "D", value: 0 },
  ],
  modRoutes: [],
});

test("synthPatchesEqual treats identical patches as equal", () => {
  const a = baseSynthPatch();
  const b = baseSynthPatch();
  assert.ok(synthPatchesEqual(a, b));
});

test("synthPatchesEqual detects oscillator drift", () => {
  const a = baseSynthPatch();
  const b = { ...a, oscillators: a.oscillators.map((layer) => ({ ...layer, gain: 1 })) };
  assert.equal(synthPatchesEqual(a, b), false);
});

test("deviceChainsEqual compares chains structurally", () => {
  const chain = (): DeviceChain => ({
    instrumentPluginId: "subtractive-bass",
    instrumentParams: { coarse: 0 },
    effects: [],
  });
  assert.ok(deviceChainsEqual(chain(), chain()));
});

test("deviceChainsEqual detects instrument id changes", () => {
  const chain = (): DeviceChain => ({
    instrumentPluginId: "subtractive-bass",
    instrumentParams: { coarse: 0 },
    effects: [],
  });
  const a = chain();
  const b: DeviceChain = { ...a, instrumentPluginId: "fm-synth" };
  assert.equal(deviceChainsEqual(a, b), false);
});

test("stepsAudioEqual matches equivalent chord note arrays", () => {
  const step = (): Step => ({
    active: true,
    note: "C3",
    notes: ["C3"],
    velocity: 0.9,
  });
  assert.ok(stepsAudioEqual(step(), { ...step(), notes: ["C3"] }));
});

test("stepsAudioEqual detects chord length changes", () => {
  const step = (): Step => ({
    active: true,
    note: "C3",
    notes: ["C3"],
    velocity: 0.9,
  });
  assert.equal(stepsAudioEqual(step(), { ...step(), notes: ["C3", "E3"] }), false);
});

test("hasSynthPatchChanged short-circuits on shared references", () => {
  const patch = baseSynthPatch();
  const baseTrack: Omit<Track, "synthPatch"> = {
    id: "t",
    name: "",
    type: "bass",
    mute: false,
    solo: false,
    volume: 0,
    steps: [],
    deviceChain: {
      instrumentPluginId: "subtractive-bass",
      instrumentParams: {},
      effects: [],
    },
  };
  const a: Track = { ...baseTrack, synthPatch: patch };
  const b: Track = { ...baseTrack, synthPatch: patch };
  assert.equal(hasSynthPatchChanged(a, b), false);
});
