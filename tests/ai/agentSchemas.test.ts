import assert from "node:assert/strict";
import test from "node:test";

import { repairCriticPayload } from "../../lib/ai/repairCriticPayload";
import { repairDirectorPayload } from "../../lib/ai/repairDirectorPayload";
import { repairMotifPayload } from "../../lib/ai/repairMotifPayload";
import { repairPatchPayload } from "../../lib/ai/repairPatchPayload";
import { agentResponseSchemas } from "../../lib/ai/schemas";
import { createDefaultTracks } from "../../lib/loop/defaults";

test("pattern response schema accepts normalized track payload", () => {
  const parsed = agentResponseSchemas.pattern.safeParse({ tracks: createDefaultTracks() });
  assert.equal(parsed.success, true);
});

test("modulation response schema enforces numeric payload", () => {
  const good = agentResponseSchemas.modulation.safeParse({ cutoff: 600, resonance: 2.2 });
  const bad = agentResponseSchemas.modulation.safeParse({ cutoff: "bad", resonance: 2.2 });
  assert.equal(good.success, true);
  assert.equal(bad.success, false);
});

test("automation response schema accepts clip-scoped granular lanes", () => {
  const parsed = agentResponseSchemas.automation.safeParse({
    automationLanes: [
      {
        id: "drop-bass-clip-filter",
        trackId: "bass",
        clipId: "drop-bass-call-1",
        variantId: "bass-call",
        target: "filter.cutoff",
        points: [
          { bar: 0, value: 0.28 },
          { bar: 0.25, value: 0.82 },
          { bar: 0.5, value: 0.35 },
        ],
      },
    ],
  });
  assert.equal(parsed.success, true);
});

test("riddim composer schema accepts critic-approved composition plans", () => {
  const parsed = agentResponseSchemas["riddim-composer"].safeParse({
    compositionPlan: {
      title: "Phrygian Pressure",
      styleProfile: "wonky-riddim",
      mood: "dark and sparse",
      harmonicPlan: {
        key: "F",
        mode: "phrygian",
        scaleDegrees: ["1", "b2", "b3", "4", "5", "b6", "b7"],
        progression: [{ degree: "i", chord: "Fm", function: "tonic", bars: 4 }],
      },
      arrangementIntent: {
        sections: [{ id: "drop", name: "Drop", role: "drop", bars: 8, energy: 0.9 }],
      },
      patternLibraryPlan: {
        motifs: [
          { id: "bass-call", trackId: "bass", role: "call", sourceBar: 0, transform: "none" },
          { id: "bass-response", trackId: "bass", role: "response", sourceBar: 1, transform: "transpose-up" },
          { id: "bass-fill", trackId: "bass", role: "fill", sourceBar: 3, transform: "fill-ending" },
        ],
        placements: [
          { sectionId: "drop", trackId: "bass", motifId: "bass-call", startBar: 0, bars: 1 },
          { sectionId: "drop", trackId: "bass", motifId: "bass-response", startBar: 1, bars: 1 },
          { sectionId: "drop", trackId: "bass", motifId: "bass-call", startBar: 2, bars: 1 },
          { sectionId: "drop", trackId: "bass", motifId: "bass-fill", startBar: 3, bars: 1 },
        ],
      },
      motifPlan: {
        bass: {
          contour: "leap-return",
          variationStrategy: "answer",
          density: 0.35,
          events: [{ step: 0, degree: "1", octave: 1, length: 1, velocity: 0.9, articulation: "growl" }],
        },
        lead: { relationship: "answer-bass", density: 0.2, events: [] },
        chords: { voicing: "stabs", density: 0.2, events: [] },
        drums: { kickSteps: [0, 10], snareSteps: [4, 12], hatSteps: [2, 6, 10, 14], swing: 0.08 },
      },
      instrumentIntents: [
        {
          trackId: "bass",
          role: "bass",
          instrumentPluginId: "fm-synth",
          instrumentPresetId: "inst-fm-yoi-growl",
        },
        { trackId: "kick", role: "rhythm", instrumentPluginId: "sampler-drum-rack" },
      ],
      patchIntents: [
        {
          trackId: "bass",
          character: "gritty",
          macroTargets: { macro1: 0.9, macro2: 0.4 },
          effectBias: ["saturator", "limiter"],
        },
      ],
      critic: { pass: true, score: 0.86, reasons: ["half-time grammar and negative space are present"] },
    },
    songIdea: {
      title: "Phrygian Pressure",
      mood: "dark and sparse",
      arrangement: {
        id: "test",
        bpm: 140,
        totalBars: 8,
        sectionOrder: ["drop"],
        sections: [
          {
            id: "drop",
            name: "Drop",
            bars: 8,
            clips: [],
            assets: [],
            automationLanes: [],
            chordProgression: [{ chord: "Fm", bars: 4 }],
            locked: false,
          },
        ],
        scenes: [{ id: "scene", name: "Scene", sectionIds: ["drop"] }],
      },
      recommendedTracks: [
        {
          name: "Bass",
          role: "bass",
          instrumentPluginId: "fm-synth",
          instrumentPresetId: "inst-fm-yoi-growl",
        },
      ],
      renderPlan: {
        stemMap: [{ trackId: "bass", stemName: "bass.wav" }],
        sectionMarkers: [{ sectionId: "drop", startBar: 0, endBar: 8 }],
        tempoMap: [{ bar: 0, bpm: 140 }],
      },
    },
  });
  assert.equal(parsed.success, true);
});

test("riddim director repair normalizes legacy Claude shape", () => {
  const repaired = repairDirectorPayload({
    title: "Void Crawler",
    styleProfile: "heavy riddim with industrial undertones",
    mood: "dark, menacing, methodical",
    harmonicPlan: {
      key: "D minor",
      mode: "phrygian",
      rootNote: "D",
      scalePattern: [1, 2, 3, 4, 5, 6, 7],
      functionalProgression: "i - bII - bVII - i",
      chordProgression: ["Dm", "Eb", "C", "Dm"],
      scaleDegrees: {
        bass: [1, 4, 5, 1],
        harmonicMovement: "chromatic descent with tritone tension",
      },
    },
    arrangementIntent: {
      sections: [
        {
          name: "intro",
          bars: 8,
          description: "sparse drums with filtered bass stabs on beats 1 and 3",
        },
        {
          name: "buildup",
          bars: 8,
          description: "add snare fills and chord stabs",
        },
        {
          name: "drop",
          bars: 16,
          description: "half-time riddim pattern",
        },
      ],
      totalBars: 32,
      dropCharacteristics: "sparse half-time riddim with heavy bass emphasis",
    },
  });

  const parsed = agentResponseSchemas["riddim-director"].safeParse(repaired);
  assert.equal(parsed.success, true);
  if (!parsed.success) {
    return;
  }
  assert.equal(parsed.data.styleProfile, "dark-underground");
  assert.equal(parsed.data.harmonicPlan.key, "D");
  assert.deepEqual(
    parsed.data.harmonicPlan.progression.map((item) => item.degree),
    ["i", "bII", "bVII", "i"],
  );
  assert.deepEqual(
    parsed.data.arrangementIntent.sections.map((section) => section.role),
    ["intro", "build", "drop"],
  );
});

test("riddim motif repair normalizes section-scoped prose shape", () => {
  const repaired = repairMotifPayload({
    motifPlan: {
      intro: {
        bass: {
          pattern: "F# quarter rest, G eighth F# eighth, rest half",
          octave: 1,
          style: "sparse_call",
          notes: "Deep sub hits on chord changes, minimal movement",
        },
        lead: {
          pattern: "rest half, B eighth A eighth G eighth F# eighth",
          octave: 4,
          style: "atmospheric_response",
          notes: "Whispered responses in upper register, answering bass calls",
        },
        chords: {
          pattern: "F#m stab on beat 1 | G stab on beat 1",
          octave: 3,
          style: "dark_stabs",
          notes: "Sharp chord stabs on downbeats only",
        },
        drums: {
          pattern: "Kick on 1, ghost snare on 2.5 | Kick on 1, snare on 3",
          style: "minimal_intro",
          notes: "Sparse kick pattern with ghost snares",
        },
      },
      drop: {
        bass: {
          pattern: "F# quarter F# eighth rest eighth, G quarter rest quarter",
          octave: 1,
          style: "heavy_call",
          notes: "Aggressive bass calls with space for lead responses",
        },
        lead: {
          pattern: "rest quarter A eighth B eighth, C# quarter B eighth A eighth",
          octave: 5,
          style: "melodic_response",
          notes: "Melodic lead answers filling bass gaps",
        },
        chords: {
          pattern: "F#m power chord on 1, 2.5, 4",
          octave: 3,
          style: "power_stabs",
          notes: "Heavy power chord stabs",
        },
        drums: {
          pattern: "Kick on 1 and 3, snare on 2 and 4, hi-hat sixteenths",
          style: "heavy_riddim",
          notes: "Full riddim pattern with hi-hat variations",
        },
      },
    },
  });

  const parsed = agentResponseSchemas["riddim-motif"].safeParse(repaired);
  assert.equal(parsed.success, true);
  if (!parsed.success) {
    return;
  }
  assert.equal(parsed.data.motifPlan.bass.contour, "leap-return");
  assert.equal(parsed.data.motifPlan.bass.events.length > 0, true);
  assert.deepEqual(parsed.data.motifPlan.drums.kickSteps, [0, 8, 32, 40]);
  assert.deepEqual(
    parsed.data.motifPlan.lead.events.map((event) => event.step),
    [14, 22, 38],
  );
  assert.deepEqual(
    parsed.data.motifPlan.chords.events.map((event) => event.step),
    [12, 30, 44],
  );
});

test("riddim motif repair clamps canonical event lengths", () => {
  const repaired = repairMotifPayload({
    motifPlan: {
      bass: {
        contour: "leap-return",
        variationStrategy: "fragment",
        density: 0.3,
        events: [
          { step: 0, degree: "1", octave: 2, length: 8, velocity: 0.9, articulation: "stab" },
          { step: 48, degree: "5", octave: 2, length: 10, velocity: 0.75, articulation: "growl" },
        ],
      },
      lead: {
        relationship: "answer-bass",
        density: 0.25,
        events: [{ step: 40, degree: "b6", octave: 4, length: 8, velocity: 0.6, articulation: "sustain" }],
      },
      chords: {
        voicing: "atmospheric",
        density: 0.4,
        events: [
          { step: 0, degree: "i", octave: 3, length: 16, velocity: 0.4, articulation: "sustain" },
          { step: 16, degree: "bII", octave: 3, length: 8, velocity: 0.45, articulation: "sustain" },
        ],
      },
      drums: {
        kickSteps: [0, 8, 16, 24, 32, 40, 48, 56],
        snareSteps: [12, 28, 44, 60],
        hatSteps: [4, 6, 10, 14, 18, 22, 26, 30, 34, 38, 42, 46, 50, 54, 58, 62],
        swing: 0.15,
      },
    },
  });

  const parsed = agentResponseSchemas["riddim-motif"].safeParse(repaired);
  assert.equal(parsed.success, true);
  if (!parsed.success) {
    return;
  }
  assert.equal(parsed.data.motifPlan.bass.events[1]?.length, 8);
  assert.equal(parsed.data.motifPlan.chords.events[0]?.length, 8);
});

test("riddim patch repair normalizes external plugin vocabulary", () => {
  const repaired = repairPatchPayload({
    instrumentIntents: [
      {
        trackId: "bass",
        instrumentPluginId: "neuro-reese",
        role: "wobble-bass",
        description: "Heavy neuro reese bass for aggressive wobbles and growls",
      },
      {
        trackId: "lead",
        instrumentPluginId: "supersaw-stack",
        role: "lead-synth",
        description: "Aggressive supersaw lead for riddim hooks and stabs",
      },
      {
        trackId: "chords",
        instrumentPluginId: "fm-synth",
        role: "chord-pad",
        description: "Wide FM pad for atmospheric chord sustains",
      },
    ],
    patchIntents: [
      {
        trackId: "bass",
        patchType: "wobble-growl",
        characteristics: ["heavy-low-end", "modulated-filter", "aggressive-distortion"],
        targetFreqRange: [40, 200],
        modulationRate: "1/8-dotted",
      },
      {
        trackId: "lead",
        patchType: "riddim-stab",
        characteristics: ["sharp-attack", "bright-harmonics", "punchy-midrange"],
        targetFreqRange: [800, 4000],
        modulationRate: "none",
      },
      {
        trackId: "chords",
        patchType: "atmospheric-pad",
        characteristics: ["wide-stereo", "soft-attack", "sustained-release"],
        targetFreqRange: [200, 1200],
        modulationRate: "slow-lfo",
      },
    ],
  });

  const parsed = agentResponseSchemas["riddim-patch"].safeParse(repaired);
  assert.equal(parsed.success, true);
  if (!parsed.success) {
    return;
  }
  assert.equal(parsed.data.instrumentIntents[0]?.role, "bass");
  assert.equal(parsed.data.instrumentIntents[0]?.instrumentPluginId, "wavetable-synth");
  assert.equal(parsed.data.instrumentIntents[2]?.role, "harmony");
  assert.deepEqual(parsed.data.patchIntents[0]?.effectBias, ["saturator", "state-filter", "limiter"]);
});

test("riddim critic repair normalizes ten-point scores", () => {
  const repaired = repairCriticPayload({
    critic: {
      pass: true,
      score: 8.5,
      reasons: [
        "Strong riddim authenticity with sparse half-time drums",
        "Excellent negative space utilization",
      ],
    },
  });

  const parsed = agentResponseSchemas["riddim-critic"].safeParse(repaired);
  assert.equal(parsed.success, true);
  if (!parsed.success) {
    return;
  }
  assert.equal(parsed.data.critic.score, 0.85);
  assert.equal(parsed.data.critic.pass, true);
});
