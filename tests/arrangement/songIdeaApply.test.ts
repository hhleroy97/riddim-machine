import assert from "node:assert/strict";
import test from "node:test";

import { makeDefaultArrangement } from "../../lib/arrangement/defaults";
import { materializeSongIdea } from "../../lib/arrangement/songIdeaApply";
import { createDefaultTracks } from "../../lib/loop/defaults";
import type { CompositionPlan } from "../../types";

test("materializeSongIdea populates section clips and automation for each track", () => {
  const tracks = createDefaultTracks();
  const arrangement = makeDefaultArrangement(tracks, 140);
  arrangement.sections.push({
    ...structuredClone(arrangement.sections[0]),
    id: "section-b",
    name: "Drop",
    bars: 4,
    clips: [],
    assets: [],
    automationLanes: [],
    chordProgression: [{ chord: "Db", bars: 2 }, { chord: "Eb", bars: 2 }],
  });
  arrangement.sectionOrder = ["section-a", "section-b"];
  arrangement.totalBars = 8;

  const songIdea = {
    title: "Test",
    mood: "dark",
    arrangement,
    recommendedTracks: [],
    renderPlan: {
      stemMap: [],
      sectionMarkers: [],
      tempoMap: [{ bar: 0, bpm: 140 }],
    },
  };

  const result = materializeSongIdea(songIdea, tracks);
  result.arrangement.sections.forEach((section) => {
    assert.ok(section.clips.length >= tracks.length * section.bars);
    assert.ok(section.automationLanes.length >= tracks.length);
  });
  result.tracks.forEach((track) => {
    const variantKeys = Object.keys(track.clipVariants ?? {});
    const expectedBars = result.arrangement.sections.reduce((acc, section) => acc + section.bars, 0);
    assert.ok(variantKeys.length >= expectedBars);
  });
});

test("materializeSongIdea maps recommended synth types to track chains", () => {
  const tracks = createDefaultTracks();
  const arrangement = makeDefaultArrangement(tracks, 140);
  const songIdea = {
    title: "Role Mapping",
    mood: "aggressive and dark",
    arrangement,
    recommendedTracks: [
      { name: "Lead Synth", role: "lead" as const, instrumentPluginId: "phase-distortion-synth" as const },
      { name: "Chord Synth", role: "harmony" as const, instrumentPluginId: "granular-texture" as const },
    ],
    renderPlan: {
      stemMap: [],
      sectionMarkers: [],
      tempoMap: [{ bar: 0, bpm: 140 }],
    },
  };
  const result = materializeSongIdea(songIdea, tracks);
  const lead = result.tracks.find((track) => track.id === "lead");
  const chords = result.tracks.find((track) => track.id === "chords");
  assert.equal(lead?.deviceChain.instrumentPluginId, "phase-distortion-synth");
  assert.equal(chords?.deviceChain.instrumentPluginId, "granular-texture");
});

test("materializeSongIdea applies selected instrument preset patches", () => {
  const tracks = createDefaultTracks();
  const arrangement = makeDefaultArrangement(tracks, 140);
  const songIdea = {
    title: "Preset Mapping",
    mood: "heavy vowel growl",
    arrangement,
    recommendedTracks: [
      {
        name: "Wobble Bass",
        role: "bass" as const,
        instrumentPluginId: "wavetable-synth" as const,
        instrumentPresetId: "inst-wavetable-vowel-bass",
      },
    ],
    renderPlan: {
      stemMap: [],
      sectionMarkers: [],
      tempoMap: [{ bar: 0, bpm: 140 }],
    },
  };

  const result = materializeSongIdea(songIdea, tracks);
  const bass = result.tracks.find((track) => track.id === "bass");
  assert.equal(bass?.deviceChain.instrumentPluginId, "wavetable-synth");
  assert.equal(bass?.synthPatch?.filter.resonance, 4.1);
  assert.equal(bass?.synthPatch?.macros[0]?.label, "Vowel");
});

test("materializeSongIdea replaces stale clips with composer-generation clips", () => {
  const tracks = createDefaultTracks();
  const arrangement = makeDefaultArrangement(tracks, 140);
  const section = arrangement.sections[0]!;
  section.bars = 2;
  section.clips = [
    { id: "stale-clip", trackId: "bass", variantId: "stale-variant", bars: 1, startBar: 0, muted: false },
  ];
  section.chordProgression = [{ chord: "Fm", bars: 2 }];
  const compositionPlan: CompositionPlan = {
    title: "Composer Pass",
    styleProfile: "dark-underground",
    mood: "dark sparse",
    harmonicPlan: {
      key: "F",
      mode: "minor",
      scaleDegrees: ["1", "2", "b3", "4", "5", "b6", "b7"],
      progression: [{ degree: "i", chord: "Fm", function: "tonic", bars: 2 }],
    },
    arrangementIntent: {
      sections: [{ id: section.id, name: section.name, role: "drop", bars: 2, energy: 0.8 }],
    },
    patternLibraryPlan: {
      motifs: [
        { id: "bass-call", trackId: "bass", role: "call", sourceBar: 0, transform: "none" },
        { id: "bass-response", trackId: "bass", role: "response", sourceBar: 1, transform: "transpose-up" },
      ],
      placements: [
        { sectionId: section.id, trackId: "bass", motifId: "bass-call", startBar: 0, bars: 1 },
        { sectionId: section.id, trackId: "bass", motifId: "bass-response", startBar: 1, bars: 1 },
      ],
    },
    motifPlan: {
      bass: {
        contour: "leap-return",
        variationStrategy: "answer",
        density: 0.35,
        events: [
          { step: 0, degree: "1", octave: 1, length: 1, velocity: 0.9, articulation: "growl" },
          { step: 18, degree: "5", octave: 1, length: 1, velocity: 0.7, articulation: "answer" },
        ],
      },
      lead: { relationship: "answer-bass", density: 0.2, events: [] },
      chords: { voicing: "stabs", density: 0.2, events: [] },
      drums: { kickSteps: [0, 10], snareSteps: [4, 12], hatSteps: [2, 6, 10, 14], swing: 0.05 },
    },
    instrumentIntents: [{ trackId: "bass", role: "bass", instrumentPluginId: "fm-synth" }],
    patchIntents: [
      { trackId: "bass", character: "gritty", macroTargets: { macro1: 0.85 }, effectBias: ["saturator"] },
    ],
    critic: { pass: true, score: 0.9, reasons: ["good negative space"] },
  };
  const songIdea = {
    title: "Composer Pass",
    mood: "dark sparse",
    arrangement,
    recommendedTracks: [],
    renderPlan: { stemMap: [], sectionMarkers: [], tempoMap: [{ bar: 0, bpm: 140 }] },
  };

  const result = materializeSongIdea(songIdea, tracks, compositionPlan);
  const clipIds = result.arrangement.sections[0]!.clips.map((clip) => clip.id);
  assert.equal(clipIds.includes("stale-clip"), false);
  assert.ok(clipIds.every((id) => id.startsWith("composer-composer-pass")));
  assert.equal(result.tracks.find((track) => track.id === "bass")?.deviceChain.instrumentPluginId, "fm-synth");
});

test("materializeSongIdea reuses planned pattern motifs across clip placements", () => {
  const tracks = createDefaultTracks();
  const arrangement = makeDefaultArrangement(tracks, 140);
  const section = arrangement.sections[0]!;
  section.bars = 4;
  section.clips = [];
  section.chordProgression = [{ chord: "Fm", bars: 4 }];
  arrangement.totalBars = 4;
  const compositionPlan: CompositionPlan = {
    title: "Reusable Motifs",
    styleProfile: "wonky-riddim",
    mood: "focused and heavy",
    harmonicPlan: {
      key: "F",
      mode: "phrygian",
      scaleDegrees: ["1", "b2", "b3", "4", "5", "b6", "b7"],
      progression: [{ degree: "i", chord: "Fm", function: "tonic", bars: 4 }],
    },
    arrangementIntent: {
      sections: [{ id: section.id, name: section.name, role: "drop", bars: 4, energy: 0.9 }],
    },
    patternLibraryPlan: {
      motifs: [
        { id: "bass-call", trackId: "bass", role: "call", sourceBar: 0, transform: "none" },
        { id: "bass-response", trackId: "bass", role: "response", sourceBar: 1, transform: "transpose-up" },
      ],
      placements: [
        { sectionId: section.id, trackId: "bass", motifId: "bass-call", startBar: 0, bars: 1 },
        { sectionId: section.id, trackId: "bass", motifId: "bass-response", startBar: 1, bars: 1 },
        { sectionId: section.id, trackId: "bass", motifId: "bass-call", startBar: 2, bars: 1 },
        { sectionId: section.id, trackId: "bass", motifId: "bass-response", startBar: 3, bars: 1 },
      ],
    },
    motifPlan: {
      bass: {
        contour: "leap-return",
        variationStrategy: "answer",
        density: 0.35,
        events: [
          { step: 0, degree: "1", octave: 1, length: 1, velocity: 0.9, articulation: "growl" },
          { step: 18, degree: "5", octave: 1, length: 1, velocity: 0.7, articulation: "answer" },
        ],
      },
      lead: { relationship: "answer-bass", density: 0.2, events: [] },
      chords: { voicing: "stabs", density: 0.2, events: [] },
      drums: { kickSteps: [0, 10], snareSteps: [4, 12], hatSteps: [2, 6, 10, 14], swing: 0.05 },
    },
    instrumentIntents: [{ trackId: "bass", role: "bass", instrumentPluginId: "fm-synth" }],
    patchIntents: [
      { trackId: "bass", character: "gritty", macroTargets: { macro1: 0.85 }, effectBias: ["saturator"] },
    ],
    critic: { pass: true, score: 0.91, reasons: ["motifs repeat with call response logic"] },
  };
  const songIdea = {
    title: "Reusable Motifs",
    mood: "focused and heavy",
    arrangement,
    recommendedTracks: [],
    renderPlan: { stemMap: [], sectionMarkers: [], tempoMap: [{ bar: 0, bpm: 140 }] },
  };

  const result = materializeSongIdea(songIdea, tracks, compositionPlan);
  const bassClips = result.arrangement.sections[0]!.clips.filter((clip) => clip.trackId === "bass");
  const variantIds = bassClips.map((clip) => clip.variantId);
  assert.equal(new Set(variantIds).size, 2);
  assert.deepEqual(variantIds, [
    "composer-reusable-motifs-section-a-bass-call",
    "composer-reusable-motifs-section-a-bass-response",
    "composer-reusable-motifs-section-a-bass-call",
    "composer-reusable-motifs-section-a-bass-response",
  ]);
});
