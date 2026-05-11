import { z } from "zod";

const effectSlotSchema = z.object({
  id: z.string(),
  pluginId: z.enum([
    "eq3",
    "state-filter",
    "compressor",
    "saturator",
    "chorus-phaser",
    "delay",
    "reverb",
    "limiter",
    "utility",
    "stereo-widener",
    "transient-shaper",
    "gate",
    "bitcrusher",
    "ring-mod",
    "auto-pan",
    "multiband-split",
    "cabinet",
  ]),
  bypass: z.boolean(),
  wet: z.number().min(0).max(1),
  params: z.record(z.string(), z.number()),
});

const deviceChainSchema = z.object({
  instrumentPluginId: z.enum([
    "sampler-drum-rack",
    "subtractive-bass",
    "fm-synth",
    "wavetable-synth",
    "granular-texture",
    "additive-synth",
    "phase-distortion-synth",
    "karplus-pluck",
    "supersaw-stack",
    "percussive-noise",
  ]),
  instrumentParams: z.record(z.string(), z.number()),
  effects: z.array(effectSlotSchema),
});

const automationTargetSchema = z.enum([
  "amp.attack",
  "amp.decay",
  "amp.sustain",
  "amp.release",
  "filter.cutoff",
  "filter.resonance",
  "fx.drive",
  "fx.chorusMix",
  "fx.stereoWidth",
]);

/**
 * Shared POST body schema for agent routes.
 */
export const agentBodySchema = z.object({
  prompt: z.string().min(1),
  bpm: z.number().min(60).max(200),
  bars: z.number().min(1).max(16),
  existingTracks: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        type: z.enum(["drum", "bass"]),
        deviceChain: deviceChainSchema.optional(),
      }),
    )
    .default([]),
  selectedTrackId: z.string().optional(),
  selectedTrackChain: deviceChainSchema.optional(),
  selectedArrangementSection: z
    .object({
      id: z.string(),
      name: z.string(),
      bars: z.number().min(1).max(32),
      clips: z.array(
        z.object({
          id: z.string(),
          trackId: z.string(),
          variantId: z.string(),
          bars: z.number().min(1).max(16),
          startBar: z.number().min(0),
          muted: z.boolean(),
        }),
      ),
      automationLanes: z.array(
        z.object({
          id: z.string(),
          trackId: z.string(),
          clipId: z.string().optional(),
          variantId: z.string().optional(),
          target: automationTargetSchema,
          points: z.array(z.object({ bar: z.number().min(0), value: z.number().min(0).max(1) })),
        }),
      ),
    })
    .optional(),
  arrangementGoals: z
    .object({
      desiredSections: z.number().min(1).max(12).optional(),
      targetBars: z.number().min(4).max(256).optional(),
      mood: z.string().min(1).max(120).optional(),
      energyCurve: z.array(z.number().min(0).max(1)).optional(),
    })
    .optional(),
  /** Only read by the `riddim-composer` route. */
  composerOptions: z
    .object({
      /** When true, still return `songIdea` after a failed critic (studio testing / iteration). */
      applyDespiteLowCriticScore: z.boolean().optional(),
    })
    .optional(),
});

const synthPatchSchema = z
  .object({
    version: z.literal(1),
    oscillators: z.array(
      z.object({
        id: z.string(),
        enabled: z.boolean(),
        waveform: z.enum(["sine", "triangle", "square", "sawtooth"]),
        octave: z.number(),
        detune: z.number(),
        gain: z.number(),
      }),
    ),
    ampEnvelope: z.object({
      attack: z.number(),
      decay: z.number(),
      sustain: z.number(),
      release: z.number(),
    }),
    modEnvelope: z.object({
      attack: z.number(),
      decay: z.number(),
      sustain: z.number(),
      release: z.number(),
    }),
    filter: z.object({
      cutoff: z.number(),
      resonance: z.number(),
      envelopeAmount: z.number(),
    }),
    fx: z.object({
      drive: z.number(),
      chorusMix: z.number(),
      stereoWidth: z.number(),
      lowCut: z.number(),
      highCut: z.number(),
    }),
    macros: z.array(
      z.object({
        id: z.enum(["macro1", "macro2", "macro3", "macro4"]),
        label: z.string(),
        value: z.number(),
      }),
    ),
    modRoutes: z.array(
      z.object({
        id: z.string(),
        source: z.enum(["lfo1", "env1", "macro1", "macro2", "macro3", "macro4"]),
        target: z.enum([
          "filterCutoff",
          "filterResonance",
          "oscMix",
          "drive",
          "chorusMix",
          "stereoWidth",
        ]),
        amount: z.number(),
        smoothing: z.number(),
        invert: z.boolean(),
        enabled: z.boolean(),
      }),
    ),
  })
  .nullable();

const trackSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["drum", "bass"]),
  mute: z.boolean(),
  solo: z.boolean(),
  volume: z.number(),
  steps: z.array(
    z.object({
      active: z.boolean(),
      note: z.string(),
      velocity: z.number(),
      notes: z.array(z.string()).optional(),
    }),
  ),
  synthPatch: synthPatchSchema,
  deviceChain: deviceChainSchema,
});

const chordEventSchema = z.object({
  chord: z.string().min(1),
  bars: z.number().min(1).max(16),
});

const arrangementClipSchema = z.object({
  id: z.string(),
  trackId: z.string(),
  variantId: z.string(),
  bars: z.number().min(1).max(16),
  startBar: z.number().min(0),
  muted: z.boolean(),
});

const arrangementSectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  bars: z.number().min(1).max(32),
  clips: z.array(arrangementClipSchema),
  assets: z
    .array(
      z.object({
        id: z.string(),
        kind: z.enum(["audio", "midi"]),
        label: z.string(),
        startBar: z.number().min(0),
        bars: z.number().min(1).max(32),
        trackId: z.string().optional(),
      }),
    )
    .default([]),
  automationLanes: z
    .array(
      z.object({
        id: z.string(),
        trackId: z.string(),
        clipId: z.string().optional(),
        variantId: z.string().optional(),
        target: automationTargetSchema,
        points: z.array(z.object({ bar: z.number().min(0), value: z.number().min(0).max(1) })),
      }),
    )
    .default([]),
  chordProgression: z.array(chordEventSchema),
  locked: z.boolean(),
});

const arrangementSceneSchema = z.object({
  id: z.string(),
  name: z.string(),
  sectionIds: z.array(z.string()),
});

const songArrangementSchema = z.object({
  id: z.string(),
  bpm: z.number().min(60).max(200),
  totalBars: z.number().min(1),
  sectionOrder: z.array(z.string()),
  sections: z.array(arrangementSectionSchema),
  scenes: z.array(arrangementSceneSchema),
});

const renderPlanSchema = z.object({
  stemMap: z.array(z.object({ trackId: z.string(), stemName: z.string() })),
  sectionMarkers: z.array(
    z.object({ sectionId: z.string(), startBar: z.number(), endBar: z.number() }),
  ),
  tempoMap: z.array(z.object({ bar: z.number(), bpm: z.number() })),
});

const songIdeaSchema = z.object({
  title: z.string(),
  mood: z.string(),
  arrangement: songArrangementSchema,
  recommendedTracks: z.array(
    z.object({
      name: z.string(),
      role: z.enum(["rhythm", "bass", "harmony", "lead", "fx"]),
      instrumentPluginId: deviceChainSchema.shape.instrumentPluginId,
      instrumentPresetId: z.string().min(1).optional(),
    }),
  ),
  renderPlan: renderPlanSchema,
});

const styleProfileSchema = z.enum([
  "deep-minimal",
  "wonky-riddim",
  "modern-festival",
  "dark-underground",
  "tearout-adjacent",
]);

const scaleDegreeSchema = z.enum(["1", "b2", "2", "b3", "3", "4", "b5", "5", "b6", "6", "b7", "7"]);

export const harmonicPlanSchema = z.object({
  key: z.string().min(1).max(8),
  mode: z.enum(["minor", "phrygian", "dorian", "harmonic-minor"]),
  scaleDegrees: z.array(scaleDegreeSchema).min(5),
  progression: z
    .array(
      z.object({
        degree: z.enum(["i", "bII", "bIII", "iv", "v", "bV", "bVI", "bVII"]),
        chord: z.string().min(1),
        function: z.enum(["tonic", "predominant", "dominant", "tension", "release"]),
        bars: z.number().min(1).max(16),
      }),
    )
    .min(1),
});

const phraseEventSchema = z.object({
  step: z.number().int().min(0).max(63),
  degree: z.string().min(1),
  octave: z.number().int().min(1).max(7),
  length: z.number().min(0.25).max(8),
  velocity: z.number().min(0).max(1),
  articulation: z.enum(["stab", "sustain", "growl", "silence", "fill", "answer"]),
  macroAutomation: z
    .partialRecord(z.enum(["macro1", "macro2", "macro3", "macro4"]), z.number().min(0).max(1))
    .optional(),
});

export const motifPlanSchema = z.object({
  bass: z.object({
    contour: z.enum(["falling", "rising", "static", "leap-return"]),
    variationStrategy: z.enum(["sequence", "inversion", "fragment", "answer"]),
    density: z.number().min(0).max(1),
    events: z.array(phraseEventSchema).min(1),
  }),
  lead: z.object({
    relationship: z.enum(["answer-bass", "double-bass", "counter-rhythm", "sparse-hook"]),
    density: z.number().min(0).max(1),
    events: z.array(phraseEventSchema),
  }),
  chords: z.object({
    voicing: z.enum(["stabs", "sustained", "offbeat", "atmospheric"]),
    density: z.number().min(0).max(1),
    events: z.array(phraseEventSchema),
  }),
  drums: z.object({
    kickSteps: z.array(z.number().int().min(0).max(63)),
    snareSteps: z.array(z.number().int().min(0).max(63)),
    hatSteps: z.array(z.number().int().min(0).max(63)),
    swing: z.number().min(0).max(0.4),
  }),
});

const arrangementIntentSchema = z.object({
  sections: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        role: z.enum(["intro", "build", "drop", "break", "outro"]),
        bars: z.number().min(4).max(16),
        energy: z.number().min(0).max(1),
      }),
    )
    .min(1),
});

const patternMotifRoleSchema = z.enum(["base", "call", "response", "fill", "breakdown"]);
const patternMotifTransformSchema = z.enum([
  "none",
  "density-up",
  "density-down",
  "transpose-up",
  "transpose-down",
  "fill-ending",
  "mute",
]);

export const patternLibraryPlanSchema = z.object({
  motifs: z
    .array(
      z.object({
        id: z.string().min(1),
        trackId: z.string().min(1),
        role: patternMotifRoleSchema,
        sourceBar: z.number().int().min(0).max(15),
        transform: patternMotifTransformSchema,
      }),
    )
    .min(1),
  placements: z
    .array(
      z.object({
        sectionId: z.string().min(1),
        trackId: z.string().min(1),
        motifId: z.string().min(1),
        startBar: z.number().int().min(0).max(31),
        bars: z.number().int().min(1).max(16),
      }),
    )
    .min(1),
});

const instrumentIntentSchema = z.object({
  trackId: z.string().min(1),
  role: z.enum(["rhythm", "bass", "harmony", "lead", "fx"]),
  instrumentPluginId: deviceChainSchema.shape.instrumentPluginId,
  instrumentPresetId: z.string().min(1).optional(),
});

const patchIntentSchema = z.object({
  trackId: z.string().min(1),
  character: z.enum(["clean", "gritty", "metallic", "wide", "dark", "vocal"]),
  macroTargets: z.partialRecord(z.enum(["macro1", "macro2", "macro3", "macro4"]), z.number().min(0).max(1)),
  effectBias: z.array(effectSlotSchema.shape.pluginId),
});

export const criticResultSchema = z.object({
  pass: z.boolean(),
  score: z.number().min(0).max(1),
  reasons: z.array(z.string()).min(1),
});

export const compositionPlanSchema = z.object({
  title: z.string().min(1),
  styleProfile: styleProfileSchema,
  mood: z.string().min(1),
  harmonicPlan: harmonicPlanSchema,
  arrangementIntent: arrangementIntentSchema,
  patternLibraryPlan: patternLibraryPlanSchema,
  motifPlan: motifPlanSchema,
  instrumentIntents: z.array(instrumentIntentSchema).min(1),
  patchIntents: z.array(patchIntentSchema).min(1),
  critic: criticResultSchema,
});

/**
 * AI response validators by agent id.
 */
export const agentResponseSchemas = {
  pattern: z.object({ tracks: z.array(trackSchema) }),
  chord: z.object({
    chords: z.array(z.string().min(1)),
    progression: z.array(chordEventSchema).optional(),
  }),
  modulation: z.object({ cutoff: z.number(), resonance: z.number() }),
  automation: z.object({
    automationLanes: z.array(
      z.object({
        id: z.string(),
        trackId: z.string(),
        clipId: z.string().optional(),
        variantId: z.string().optional(),
        target: automationTargetSchema,
        points: z.array(z.object({ bar: z.number().min(0), value: z.number().min(0).max(1) })).min(1),
      }),
    ),
  }),
  arranger: z.object({
    sections: z.array(z.object({ name: z.string(), bars: z.number() })),
  }),
  "song-idea": z.object({ songIdea: songIdeaSchema }),
  "riddim-director": z.object({
    title: z.string().min(1),
    styleProfile: styleProfileSchema,
    mood: z.string().min(1),
    harmonicPlan: harmonicPlanSchema,
    arrangementIntent: arrangementIntentSchema,
  }),
  "riddim-motif": z.object({ motifPlan: motifPlanSchema }),
  "riddim-patch": z.object({
    instrumentIntents: z.array(instrumentIntentSchema).min(1),
    patchIntents: z.array(patchIntentSchema).min(1),
  }),
  "riddim-critic": z.object({ critic: criticResultSchema }),
  "riddim-composer": z.object({ compositionPlan: compositionPlanSchema, songIdea: songIdeaSchema }),
  "mix-coach": z.object({ suggestions: z.array(z.string()) }),
};
