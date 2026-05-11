import { coerceTrackSteps } from "@/lib/loop/trackSteps";
import type {
  DeviceChain,
  EffectChainPreset,
  InstrumentPluginId,
  InstrumentPreset,
  PatchPreset,
  PluginChainPreset,
  SynthPatch,
  Track,
} from "@/types";

function createDefaultBassPatch(): SynthPatch {
  return {
    version: 1,
    oscillators: [
      {
        id: "sub",
        enabled: true,
        waveform: "sine",
        octave: -1,
        detune: 0,
        gain: 0.8,
      },
      {
        id: "mid",
        enabled: true,
        waveform: "sawtooth",
        octave: 0,
        detune: 3,
        gain: 0.65,
      },
      {
        id: "noise",
        enabled: false,
        waveform: "square",
        octave: 1,
        detune: 0,
        gain: 0.2,
      },
    ],
    ampEnvelope: {
      attack: 0.005,
      decay: 0.14,
      sustain: 0.55,
      release: 0.2,
    },
    modEnvelope: {
      attack: 0.001,
      decay: 0.2,
      sustain: 0.1,
      release: 0.12,
    },
    filter: {
      cutoff: 600,
      resonance: 2.4,
      envelopeAmount: 320,
    },
    fx: {
      drive: 0.2,
      chorusMix: 0.25,
      stereoWidth: 0.3,
      lowCut: 28,
      highCut: 14500,
    },
    macros: [
      { id: "macro1", label: "Growl", value: 0.4 },
      { id: "macro2", label: "Air", value: 0.35 },
      { id: "macro3", label: "Motion", value: 0.5 },
      { id: "macro4", label: "Punch", value: 0.45 },
    ],
    modRoutes: [
      {
        id: "route-lfo-cutoff",
        source: "lfo1",
        target: "filterCutoff",
        amount: 0.6,
        smoothing: 0.2,
        invert: false,
        enabled: true,
      },
      {
        id: "route-env-drive",
        source: "env1",
        target: "drive",
        amount: 0.25,
        smoothing: 0.15,
        invert: false,
        enabled: true,
      },
      {
        id: "route-macro1-oscmix",
        source: "macro1",
        target: "oscMix",
        amount: 0.5,
        smoothing: 0.2,
        invert: false,
        enabled: true,
      },
    ],
  };
}

/**
 * Starter preset bank for bass patches.
 */
export const STARTER_PATCH_PRESETS: PatchPreset[] = [
  {
    id: "preset-growl-classic",
    name: "Classic Growl",
    description: "Balanced wobble with mid-focused harmonics.",
    patch: createDefaultBassPatch(),
  },
  {
    id: "preset-tearout",
    name: "Tearout Lead",
    description: "Sharper distortion and wider movement.",
    patch: {
      ...createDefaultBassPatch(),
      filter: { cutoff: 900, resonance: 3.1, envelopeAmount: 380 },
      fx: {
        drive: 0.4,
        chorusMix: 0.35,
        stereoWidth: 0.45,
        lowCut: 35,
        highCut: 12000,
      },
      macros: [
        { id: "macro1", label: "Rage", value: 0.55 },
        { id: "macro2", label: "Edge", value: 0.45 },
        { id: "macro3", label: "Lurch", value: 0.6 },
        { id: "macro4", label: "Body", value: 0.5 },
      ],
    },
  },
  {
    id: "preset-sub-weight",
    name: "Sub Weight",
    description: "Heavier low-end with restrained upper harmonics.",
    patch: {
      ...createDefaultBassPatch(),
      oscillators: createDefaultBassPatch().oscillators.map((osc) =>
        osc.id === "mid" ? { ...osc, gain: 0.45 } : osc,
      ),
      filter: { cutoff: 420, resonance: 1.8, envelopeAmount: 220 },
    },
  },
];

/**
 * Creates a default device chain for a given instrument id.
 */
export function makeDefaultDeviceChain(
  instrumentPluginId: InstrumentPluginId,
): DeviceChain {
  if (instrumentPluginId === "sampler-drum-rack") {
    return {
      instrumentPluginId,
      instrumentParams: { tune: 0, snap: 0.7 },
      effects: [
        { id: "drum-eq", pluginId: "eq3", bypass: false, wet: 1, params: { low: 0, mid: 0, high: 0 } },
        { id: "drum-comp", pluginId: "compressor", bypass: false, wet: 0.8, params: { threshold: -20, ratio: 3.5 } },
      ],
    };
  }

  return {
    instrumentPluginId,
    instrumentParams: { gain: 0.8, brightness: 0.5 },
    effects: [
      { id: "fx-sat", pluginId: "saturator", bypass: false, wet: 0.3, params: { drive: 0.25 } },
      { id: "fx-chorus", pluginId: "chorus-phaser", bypass: false, wet: 0.25, params: { rate: 1.2, depth: 0.35 } },
      { id: "fx-delay", pluginId: "delay", bypass: true, wet: 0.2, params: { time: 0.25, feedback: 0.2 } },
    ],
  };
}

/**
 * Starter instrument presets for pluginized workflows.
 */
export const STARTER_INSTRUMENT_PRESETS: InstrumentPreset[] = [
  {
    id: "inst-subtractive-classic",
    name: "Subtractive Classic",
    tags: ["bass", "subtractive", "warm"],
    schemaVersion: 1,
    instrumentPluginId: "subtractive-bass",
    synthPatch: createDefaultBassPatch(),
  },
  {
    id: "inst-fm-metal",
    name: "FM Metal Growl",
    tags: ["bass", "fm", "aggressive"],
    schemaVersion: 1,
    instrumentPluginId: "fm-synth",
    synthPatch: {
      ...createDefaultBassPatch(),
      filter: { cutoff: 780, resonance: 3.3, envelopeAmount: 440 },
      fx: { ...createDefaultBassPatch().fx, drive: 0.45 },
    },
  },
  {
    id: "inst-wave-neon",
    name: "Neon Wavetable",
    tags: ["lead", "wavetable", "bright"],
    schemaVersion: 1,
    instrumentPluginId: "wavetable-synth",
    synthPatch: {
      ...createDefaultBassPatch(),
      filter: { cutoff: 2200, resonance: 1.6, envelopeAmount: 180 },
      fx: { ...createDefaultBassPatch().fx, chorusMix: 0.5, stereoWidth: 0.55 },
    },
  },
  {
    id: "inst-granular-mist",
    name: "Granular Mist",
    tags: ["texture", "granular", "ambient"],
    schemaVersion: 1,
    instrumentPluginId: "granular-texture",
    synthPatch: {
      ...createDefaultBassPatch(),
      ampEnvelope: { attack: 0.04, decay: 0.35, sustain: 0.5, release: 1.1 },
      filter: { cutoff: 980, resonance: 1.4, envelopeAmount: 120 },
    },
  },
  {
    id: "inst-sub-deep",
    name: "Deep Sub Driver",
    tags: ["bass", "sub", "clean"],
    schemaVersion: 1,
    instrumentPluginId: "subtractive-bass",
    synthPatch: {
      ...createDefaultBassPatch(),
      oscillators: createDefaultBassPatch().oscillators.map((osc) =>
        osc.id === "sub" ? { ...osc, gain: 0.95 } : { ...osc, gain: 0.35 },
      ),
      filter: { cutoff: 320, resonance: 1.2, envelopeAmount: 90 },
    },
  },
  {
    id: "inst-fm-glass-pluck",
    name: "FM Glass Pluck",
    tags: ["fm", "pluck", "sharp"],
    schemaVersion: 1,
    instrumentPluginId: "fm-synth",
    synthPatch: {
      ...createDefaultBassPatch(),
      ampEnvelope: { attack: 0.002, decay: 0.09, sustain: 0.22, release: 0.12 },
      filter: { cutoff: 3200, resonance: 2.1, envelopeAmount: 420 },
      fx: { ...createDefaultBassPatch().fx, drive: 0.18, chorusMix: 0.15 },
    },
  },
  {
    id: "inst-drum-rack-snap",
    name: "Drum Rack Snap",
    tags: ["drum", "rack", "punch"],
    schemaVersion: 1,
    instrumentPluginId: "sampler-drum-rack",
    synthPatch: createDefaultBassPatch(),
  },
  {
    id: "inst-additive-halo",
    name: "Additive Halo",
    tags: ["additive", "pad", "airy"],
    schemaVersion: 1,
    instrumentPluginId: "additive-synth",
    synthPatch: {
      ...createDefaultBassPatch(),
      ampEnvelope: { attack: 0.06, decay: 0.4, sustain: 0.62, release: 1.25 },
      filter: { cutoff: 2600, resonance: 1.2, envelopeAmount: 110 },
      fx: { ...createDefaultBassPatch().fx, chorusMix: 0.52, stereoWidth: 0.62, drive: 0.08 },
    },
  },
  {
    id: "inst-phase-ripper",
    name: "Phase Ripper",
    tags: ["phase", "lead", "aggressive"],
    schemaVersion: 1,
    instrumentPluginId: "phase-distortion-synth",
    synthPatch: {
      ...createDefaultBassPatch(),
      filter: { cutoff: 1850, resonance: 3.4, envelopeAmount: 360 },
      fx: { ...createDefaultBassPatch().fx, drive: 0.42, chorusMix: 0.22 },
      macros: [
        { id: "macro1", label: "Rip", value: 0.7 },
        { id: "macro2", label: "Nasal", value: 0.55 },
        { id: "macro3", label: "Sweep", value: 0.58 },
        { id: "macro4", label: "Body", value: 0.5 },
      ],
    },
  },
  {
    id: "inst-karplus-plink",
    name: "Karplus Plink",
    tags: ["pluck", "string", "karplus"],
    schemaVersion: 1,
    instrumentPluginId: "karplus-pluck",
    synthPatch: {
      ...createDefaultBassPatch(),
      ampEnvelope: { attack: 0.002, decay: 0.12, sustain: 0.18, release: 0.26 },
      filter: { cutoff: 3200, resonance: 1.8, envelopeAmount: 240 },
      fx: { ...createDefaultBassPatch().fx, drive: 0.16, chorusMix: 0.18, stereoWidth: 0.4 },
    },
  },
  {
    id: "inst-supersaw-uplift",
    name: "Supersaw Uplift",
    tags: ["supersaw", "stack", "anthem"],
    schemaVersion: 1,
    instrumentPluginId: "supersaw-stack",
    synthPatch: {
      ...createDefaultBassPatch(),
      oscillators: createDefaultBassPatch().oscillators.map((osc) =>
        osc.id === "mid" ? { ...osc, gain: 0.88 } : osc,
      ),
      filter: { cutoff: 2900, resonance: 1.5, envelopeAmount: 150 },
      fx: { ...createDefaultBassPatch().fx, chorusMix: 0.58, stereoWidth: 0.72, drive: 0.2 },
    },
  },
  {
    id: "inst-percussive-snap-noise",
    name: "Percussive Snap Noise",
    tags: ["percussive", "noise", "transient"],
    schemaVersion: 1,
    instrumentPluginId: "percussive-noise",
    synthPatch: {
      ...createDefaultBassPatch(),
      ampEnvelope: { attack: 0.001, decay: 0.08, sustain: 0.08, release: 0.07 },
      filter: { cutoff: 4200, resonance: 2.6, envelopeAmount: 420 },
      fx: { ...createDefaultBassPatch().fx, drive: 0.33, chorusMix: 0.1, stereoWidth: 0.22 },
    },
  },
  {
    id: "inst-super-bass-monarch",
    name: "Super Bass Monarch",
    tags: ["riddim", "superbass", "bass", "club"],
    schemaVersion: 1,
    instrumentPluginId: "subtractive-bass",
    synthPatch: {
      ...createDefaultBassPatch(),
      oscillators: createDefaultBassPatch().oscillators.map((osc) =>
        osc.id === "sub" ? { ...osc, gain: 1 } : { ...osc, gain: 0.52, detune: 5 },
      ),
      ampEnvelope: { attack: 0.002, decay: 0.11, sustain: 0.5, release: 0.16 },
      filter: { cutoff: 540, resonance: 2.9, envelopeAmount: 360 },
      fx: { ...createDefaultBassPatch().fx, drive: 0.46, chorusMix: 0.18, stereoWidth: 0.35 },
      macros: [
        { id: "macro1", label: "Sub Weight", value: 0.72 },
        { id: "macro2", label: "Grit", value: 0.56 },
        { id: "macro3", label: "Wob", value: 0.5 },
        { id: "macro4", label: "Air", value: 0.32 },
      ],
    },
  },
  {
    id: "inst-riddim-horn-lead",
    name: "Riddim Horn Lead",
    tags: ["riddim", "lead", "horn", "aggressive"],
    schemaVersion: 1,
    instrumentPluginId: "supersaw-stack",
    synthPatch: {
      ...createDefaultBassPatch(),
      oscillators: createDefaultBassPatch().oscillators.map((osc) =>
        osc.id === "mid"
          ? { ...osc, waveform: "square", detune: 9, gain: 0.92 }
          : { ...osc, gain: osc.id === "sub" ? 0.42 : osc.gain },
      ),
      ampEnvelope: { attack: 0.004, decay: 0.12, sustain: 0.48, release: 0.22 },
      filter: { cutoff: 1650, resonance: 2.3, envelopeAmount: 300 },
      fx: { ...createDefaultBassPatch().fx, drive: 0.38, chorusMix: 0.28, stereoWidth: 0.58 },
    },
  },
  {
    id: "inst-laser-call-lead",
    name: "Laser Call Lead",
    tags: ["riddim", "lead", "laser", "call-response"],
    schemaVersion: 1,
    instrumentPluginId: "phase-distortion-synth",
    synthPatch: {
      ...createDefaultBassPatch(),
      ampEnvelope: { attack: 0.001, decay: 0.08, sustain: 0.35, release: 0.1 },
      filter: { cutoff: 2450, resonance: 3.1, envelopeAmount: 420 },
      fx: { ...createDefaultBassPatch().fx, drive: 0.5, chorusMix: 0.2, stereoWidth: 0.4 },
    },
  },
  {
    id: "inst-stab-chord-rack",
    name: "Stab Chord Rack",
    tags: ["riddim", "chords", "stab", "syncopated"],
    schemaVersion: 1,
    instrumentPluginId: "wavetable-synth",
    synthPatch: {
      ...createDefaultBassPatch(),
      ampEnvelope: { attack: 0.006, decay: 0.22, sustain: 0.34, release: 0.36 },
      filter: { cutoff: 1800, resonance: 1.5, envelopeAmount: 190 },
      fx: { ...createDefaultBassPatch().fx, drive: 0.24, chorusMix: 0.42, stereoWidth: 0.68 },
    },
  },
  {
    id: "inst-future-color-chords",
    name: "Future Color Chords",
    tags: ["riddim-adjacent", "chords", "future", "lush"],
    schemaVersion: 1,
    instrumentPluginId: "additive-synth",
    synthPatch: {
      ...createDefaultBassPatch(),
      ampEnvelope: { attack: 0.03, decay: 0.4, sustain: 0.62, release: 1.1 },
      filter: { cutoff: 2100, resonance: 1.3, envelopeAmount: 110 },
      fx: { ...createDefaultBassPatch().fx, drive: 0.12, chorusMix: 0.58, stereoWidth: 0.76 },
    },
  },
  {
    id: "inst-void-choir-chords",
    name: "Void Choir Chords",
    tags: ["riddim-adjacent", "chords", "atmospheric", "dark"],
    schemaVersion: 1,
    instrumentPluginId: "granular-texture",
    synthPatch: {
      ...createDefaultBassPatch(),
      ampEnvelope: { attack: 0.05, decay: 0.5, sustain: 0.66, release: 1.4 },
      filter: { cutoff: 1300, resonance: 1.7, envelopeAmount: 90 },
      fx: { ...createDefaultBassPatch().fx, drive: 0.1, chorusMix: 0.46, stereoWidth: 0.8 },
    },
  },
  {
    id: "inst-sub-pocket-dub",
    name: "Sub Pocket Dub",
    tags: ["bass", "sub", "minimal", "deep", "pocket"],
    schemaVersion: 1,
    instrumentPluginId: "subtractive-bass",
    synthPatch: {
      ...createDefaultBassPatch(),
      oscillators: createDefaultBassPatch().oscillators.map((osc) =>
        osc.id === "sub" ? { ...osc, gain: 1 } : { ...osc, gain: 0.28 },
      ),
      ampEnvelope: { attack: 0.003, decay: 0.16, sustain: 0.62, release: 0.18 },
      filter: { cutoff: 260, resonance: 1.4, envelopeAmount: 80 },
      fx: { ...createDefaultBassPatch().fx, drive: 0.16, chorusMix: 0.08, stereoWidth: 0.16 },
    },
  },
  {
    id: "inst-fm-yoi-growl",
    name: "FM Yoi Growl",
    tags: ["bass", "fm", "growl", "riddim", "yoi"],
    schemaVersion: 1,
    instrumentPluginId: "fm-synth",
    synthPatch: {
      ...createDefaultBassPatch(),
      oscillators: createDefaultBassPatch().oscillators.map((osc) =>
        osc.id === "mid" ? { ...osc, waveform: "square", gain: 0.78 } : osc,
      ),
      ampEnvelope: { attack: 0.002, decay: 0.1, sustain: 0.48, release: 0.13 },
      filter: { cutoff: 720, resonance: 3.7, envelopeAmount: 520 },
      fx: { ...createDefaultBassPatch().fx, drive: 0.58, chorusMix: 0.16, stereoWidth: 0.34 },
    },
  },
  {
    id: "inst-wavetable-vowel-bass",
    name: "Wavetable Vowel Bass",
    tags: ["bass", "wavetable", "vocal", "growl", "call-response"],
    schemaVersion: 1,
    instrumentPluginId: "wavetable-synth",
    synthPatch: {
      ...createDefaultBassPatch(),
      filter: { cutoff: 1050, resonance: 4.1, envelopeAmount: 480 },
      fx: { ...createDefaultBassPatch().fx, drive: 0.5, chorusMix: 0.24, stereoWidth: 0.44 },
      macros: [
        { id: "macro1", label: "Vowel", value: 0.78 },
        { id: "macro2", label: "Bite", value: 0.64 },
        { id: "macro3", label: "Wob", value: 0.55 },
        { id: "macro4", label: "Body", value: 0.5 },
      ],
    },
  },
  {
    id: "inst-granular-foley-bed",
    name: "Granular Foley Bed",
    tags: ["fx", "texture", "granular", "foley", "dark"],
    schemaVersion: 1,
    instrumentPluginId: "granular-texture",
    synthPatch: {
      ...createDefaultBassPatch(),
      ampEnvelope: { attack: 0.08, decay: 0.6, sustain: 0.58, release: 1.7 },
      filter: { cutoff: 860, resonance: 2.2, envelopeAmount: 70 },
      fx: { ...createDefaultBassPatch().fx, drive: 0.14, chorusMix: 0.62, stereoWidth: 0.88 },
    },
  },
  {
    id: "inst-additive-crystal-pad",
    name: "Additive Crystal Pad",
    tags: ["harmony", "pad", "additive", "wide", "bright"],
    schemaVersion: 1,
    instrumentPluginId: "additive-synth",
    synthPatch: {
      ...createDefaultBassPatch(),
      ampEnvelope: { attack: 0.12, decay: 0.5, sustain: 0.7, release: 1.6 },
      filter: { cutoff: 3400, resonance: 1.1, envelopeAmount: 80 },
      fx: { ...createDefaultBassPatch().fx, drive: 0.06, chorusMix: 0.64, stereoWidth: 0.82 },
    },
  },
  {
    id: "inst-phase-siren-stab",
    name: "Phase Siren Stab",
    tags: ["lead", "phase", "siren", "stab", "aggressive"],
    schemaVersion: 1,
    instrumentPluginId: "phase-distortion-synth",
    synthPatch: {
      ...createDefaultBassPatch(),
      ampEnvelope: { attack: 0.001, decay: 0.07, sustain: 0.28, release: 0.11 },
      filter: { cutoff: 3100, resonance: 3.8, envelopeAmount: 520 },
      fx: { ...createDefaultBassPatch().fx, drive: 0.55, chorusMix: 0.18, stereoWidth: 0.38 },
    },
  },
  {
    id: "inst-karplus-rim-pluck",
    name: "Karplus Rim Pluck",
    tags: ["lead", "pluck", "karplus", "rim", "syncopated"],
    schemaVersion: 1,
    instrumentPluginId: "karplus-pluck",
    synthPatch: {
      ...createDefaultBassPatch(),
      ampEnvelope: { attack: 0.001, decay: 0.08, sustain: 0.12, release: 0.18 },
      filter: { cutoff: 4100, resonance: 2.4, envelopeAmount: 260 },
      fx: { ...createDefaultBassPatch().fx, drive: 0.2, chorusMix: 0.1, stereoWidth: 0.28 },
    },
  },
  {
    id: "inst-supersaw-alarm-hook",
    name: "Supersaw Alarm Hook",
    tags: ["lead", "supersaw", "hook", "festival", "alarm"],
    schemaVersion: 1,
    instrumentPluginId: "supersaw-stack",
    synthPatch: {
      ...createDefaultBassPatch(),
      oscillators: createDefaultBassPatch().oscillators.map((osc) =>
        osc.id === "mid" ? { ...osc, gain: 0.96, detune: 12 } : osc,
      ),
      ampEnvelope: { attack: 0.006, decay: 0.18, sustain: 0.5, release: 0.28 },
      filter: { cutoff: 3600, resonance: 1.9, envelopeAmount: 240 },
      fx: { ...createDefaultBassPatch().fx, drive: 0.26, chorusMix: 0.6, stereoWidth: 0.78 },
    },
  },
  {
    id: "inst-noise-impact-hit",
    name: "Noise Impact Hit",
    tags: ["fx", "percussive", "noise", "impact", "transition"],
    schemaVersion: 1,
    instrumentPluginId: "percussive-noise",
    synthPatch: {
      ...createDefaultBassPatch(),
      ampEnvelope: { attack: 0.001, decay: 0.18, sustain: 0.05, release: 0.22 },
      filter: { cutoff: 5200, resonance: 2.9, envelopeAmount: 560 },
      fx: { ...createDefaultBassPatch().fx, drive: 0.44, chorusMix: 0.08, stereoWidth: 0.36 },
    },
  },
  {
    id: "inst-drum-rack-half-time",
    name: "Drum Rack Half-Time",
    tags: ["rhythm", "drum", "half-time", "riddim", "punch"],
    schemaVersion: 1,
    instrumentPluginId: "sampler-drum-rack",
    synthPatch: {
      ...createDefaultBassPatch(),
      ampEnvelope: { attack: 0.001, decay: 0.08, sustain: 0.18, release: 0.08 },
      filter: { cutoff: 2600, resonance: 1.8, envelopeAmount: 160 },
      fx: { ...createDefaultBassPatch().fx, drive: 0.28, chorusMix: 0.08, stereoWidth: 0.18 },
    },
  },
];

/**
 * Starter effect chain presets.
 */
export const STARTER_EFFECT_CHAIN_PRESETS: EffectChainPreset[] = [
  {
    id: "fx-clean-punch",
    name: "Clean Punch",
    tags: ["mix", "clean"],
    schemaVersion: 1,
    effects: [
      { id: "eq", pluginId: "eq3", bypass: false, wet: 1, params: { low: -0.5, mid: 0.4, high: 0.6 } },
      { id: "comp", pluginId: "compressor", bypass: false, wet: 0.75, params: { threshold: -18, ratio: 2.8 } },
      { id: "limit", pluginId: "limiter", bypass: false, wet: 1, params: { threshold: -0.3 } },
    ],
  },
  {
    id: "fx-wide-dirty",
    name: "Wide Dirty",
    tags: ["wide", "dirty"],
    schemaVersion: 1,
    effects: [
      { id: "sat", pluginId: "saturator", bypass: false, wet: 0.45, params: { drive: 0.5 } },
      { id: "width", pluginId: "stereo-widener", bypass: false, wet: 0.35, params: { width: 0.65 } },
      { id: "verb", pluginId: "reverb", bypass: false, wet: 0.2, params: { decay: 2.8 } },
    ],
  },
  {
    id: "fx-crushed-motion",
    name: "Crushed Motion",
    tags: ["lofi", "motion"],
    schemaVersion: 1,
    effects: [
      { id: "crusher", pluginId: "bitcrusher", bypass: false, wet: 0.5, params: { bits: 4 } },
      { id: "autopan", pluginId: "auto-pan", bypass: false, wet: 0.35, params: { frequency: 0.8, depth: 0.55 } },
      { id: "verb", pluginId: "reverb", bypass: false, wet: 0.12, params: { decay: 2.1 } },
    ],
  },
  {
    id: "fx-ring-space",
    name: "Ring Space",
    tags: ["experimental", "ringmod"],
    schemaVersion: 1,
    effects: [
      { id: "ring", pluginId: "ring-mod", bypass: false, wet: 0.35, params: { frequency: 38, depth: 0.45 } },
      { id: "delay", pluginId: "delay", bypass: false, wet: 0.25, params: { time: 0.33, feedback: 0.4 } },
      { id: "width", pluginId: "stereo-widener", bypass: false, wet: 0.4, params: { width: 0.7 } },
    ],
  },
  {
    id: "fx-cabinet-tight",
    name: "Cabinet Tight",
    tags: ["cabinet", "tight"],
    schemaVersion: 1,
    effects: [
      { id: "cab", pluginId: "cabinet", bypass: false, wet: 0.45, params: { tone: 1450, resonance: 2.9 } },
      { id: "comp", pluginId: "compressor", bypass: false, wet: 0.6, params: { threshold: -16, ratio: 4.2 } },
      { id: "eq", pluginId: "eq3", bypass: false, wet: 1, params: { low: 0.8, mid: 0.2, high: -0.6 } },
    ],
  },
  {
    id: "fx-multiband-polish",
    name: "Multiband Polish",
    tags: ["mix", "multiband"],
    schemaVersion: 1,
    effects: [
      { id: "mb", pluginId: "multiband-split", bypass: false, wet: 1, params: { low: 0.6, mid: 0.2, high: 0.9 } },
      { id: "limit", pluginId: "limiter", bypass: false, wet: 1, params: { threshold: -0.2 } },
    ],
  },
  {
    id: "fx-rhythm-gate",
    name: "Rhythm Gate",
    tags: ["rhythmic", "gate"],
    schemaVersion: 1,
    effects: [
      { id: "gate", pluginId: "gate", bypass: false, wet: 1, params: { threshold: -24 } },
      { id: "autopan", pluginId: "auto-pan", bypass: false, wet: 0.3, params: { frequency: 1.4, depth: 0.4 } },
      { id: "sat", pluginId: "saturator", bypass: false, wet: 0.25, params: { drive: 0.22 } },
    ],
  },
];

/**
 * Starter full-chain presets.
 */
export const STARTER_PLUGIN_CHAIN_PRESETS: PluginChainPreset[] = [
  {
    id: "chain-growl-classic",
    name: "Growl Classic Chain",
    tags: ["bass", "growl"],
    schemaVersion: 1,
    chain: makeDefaultDeviceChain("subtractive-bass"),
  },
  {
    id: "chain-fm-rack",
    name: "FM Rack Chain",
    tags: ["fm", "modern"],
    schemaVersion: 1,
    chain: makeDefaultDeviceChain("fm-synth"),
  },
  {
    id: "chain-wave-neon-stack",
    name: "Wave Neon Stack",
    tags: ["lead", "wavetable", "stack"],
    schemaVersion: 1,
    chain: {
      instrumentPluginId: "wavetable-synth",
      instrumentParams: { gain: 0.78, brightness: 0.74 },
      effects: [
        { id: "chorus", pluginId: "chorus-phaser", bypass: false, wet: 0.35, params: { rate: 1.8, depth: 0.5 } },
        { id: "delay", pluginId: "delay", bypass: false, wet: 0.22, params: { time: 0.29, feedback: 0.34 } },
        { id: "width", pluginId: "stereo-widener", bypass: false, wet: 0.36, params: { width: 0.75 } },
      ],
    },
  },
  {
    id: "chain-granular-void",
    name: "Granular Void",
    tags: ["ambient", "granular"],
    schemaVersion: 1,
    chain: {
      instrumentPluginId: "granular-texture",
      instrumentParams: { gain: 0.62, brightness: 0.42 },
      effects: [
        { id: "ring", pluginId: "ring-mod", bypass: false, wet: 0.2, params: { frequency: 24, depth: 0.4 } },
        { id: "verb", pluginId: "reverb", bypass: false, wet: 0.28, params: { decay: 4.1 } },
        { id: "autopan", pluginId: "auto-pan", bypass: false, wet: 0.18, params: { frequency: 0.4, depth: 0.35 } },
      ],
    },
  },
  {
    id: "chain-sub-cab-punch",
    name: "Sub Cab Punch",
    tags: ["sub", "cabinet"],
    schemaVersion: 1,
    chain: {
      instrumentPluginId: "subtractive-bass",
      instrumentParams: { gain: 0.85, brightness: 0.36 },
      effects: [
        { id: "cab", pluginId: "cabinet", bypass: false, wet: 0.42, params: { tone: 1300, resonance: 3.2 } },
        { id: "comp", pluginId: "compressor", bypass: false, wet: 0.7, params: { threshold: -17, ratio: 4 } },
        { id: "limit", pluginId: "limiter", bypass: false, wet: 1, params: { threshold: -0.25 } },
      ],
    },
  },
  {
    id: "chain-fm-crush-motion",
    name: "FM Crush Motion",
    tags: ["fm", "lofi", "motion"],
    schemaVersion: 1,
    chain: {
      instrumentPluginId: "fm-synth",
      instrumentParams: { gain: 0.74, modDepth: 0.68 },
      effects: [
        { id: "crusher", pluginId: "bitcrusher", bypass: false, wet: 0.4, params: { bits: 3 } },
        { id: "mb", pluginId: "multiband-split", bypass: false, wet: 1, params: { low: 0.4, mid: 0.8, high: 0.5 } },
        { id: "delay", pluginId: "delay", bypass: false, wet: 0.2, params: { time: 0.22, feedback: 0.28 } },
      ],
    },
  },
  {
    id: "chain-drum-rack-drive",
    name: "Drum Rack Drive",
    tags: ["drum", "drive", "club"],
    schemaVersion: 1,
    chain: {
      instrumentPluginId: "sampler-drum-rack",
      instrumentParams: { tune: 0.4, snap: 0.8 },
      effects: [
        { id: "sat", pluginId: "saturator", bypass: false, wet: 0.33, params: { drive: 0.42 } },
        { id: "eq", pluginId: "eq3", bypass: false, wet: 1, params: { low: 1, mid: 0.2, high: 0.6 } },
        { id: "gate", pluginId: "gate", bypass: false, wet: 1, params: { threshold: -26 } },
      ],
    },
  },
];

/**
 * Returns a new default patch instance.
 */
export function makeDefaultBassPatch(): SynthPatch {
  return structuredClone(STARTER_PATCH_PRESETS[0].patch);
}

/**
 * Normalizes track patch fields for backwards compatibility.
 */
export function normalizeTrackPatch(track: Track): Track {
  const chainDefault =
    track.type === "drum"
      ? makeDefaultDeviceChain("sampler-drum-rack")
      : makeDefaultDeviceChain("subtractive-bass");

  if (track.type === "bass") {
    return {
      ...track,
      synthPatch: track.synthPatch ?? makeDefaultBassPatch(),
      deviceChain: track.deviceChain ?? chainDefault,
    };
  }

  return {
    ...track,
    synthPatch: track.synthPatch ?? null,
    deviceChain: track.deviceChain ?? chainDefault,
  };
}

/**
 * Normalizes all tracks (patch defaults + resilient step grids for AI/import payloads).
 */
export function normalizeTracks(tracks: Track[]): Track[] {
  return tracks.map((track) => coerceTrackSteps(normalizeTrackPatch(track)));
}
