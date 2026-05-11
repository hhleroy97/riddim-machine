import * as Tone from "tone";

import { PluginRegistry } from "@/lib/audio/plugins/registry";
import { resolveStepNotes } from "@/lib/music/stepNotes";
import type {
  EffectPluginDefinition,
  EffectPluginInstance,
  InstrumentPluginDefinition,
  InstrumentPluginInstance,
} from "@/lib/audio/plugins/contracts";
import { makeDefaultBassPatch } from "@/lib/audio/patches";
import type { Step, SynthPatch } from "@/types";

class WetDryEffectInstance implements EffectPluginInstance {
  public readonly input: Tone.Gain;
  public readonly output: Tone.Gain;
  private readonly dry: Tone.Gain;
  private readonly wet: Tone.Gain;
  private readonly processor: Tone.ToneAudioNode;
  private readonly setParamInternal: (id: string, value: number) => void;
  private wetValue: number;

  constructor(
    processor: Tone.ToneAudioNode,
    setParamInternal: (id: string, value: number) => void,
  ) {
    this.input = new Tone.Gain(1);
    this.output = new Tone.Gain(1);
    this.dry = new Tone.Gain(0.5);
    this.wet = new Tone.Gain(0.5);
    this.processor = processor;
    this.setParamInternal = setParamInternal;
    this.wetValue = 0.5;

    this.input.connect(this.dry);
    this.input.connect(this.processor);
    this.dry.connect(this.output);
    this.processor.connect(this.wet);
    this.wet.connect(this.output);
  }

  public setWet(value: number): void {
    this.wetValue = Math.max(0, Math.min(1, value));
    this.wet.gain.rampTo(this.wetValue, 0.05);
    this.dry.gain.rampTo(1 - this.wetValue, 0.05);
  }

  public setBypass(value: boolean): void {
    if (value) {
      this.wet.gain.rampTo(0, 0.05);
      this.dry.gain.rampTo(1, 0.05);
      return;
    }

    this.setWet(this.wetValue);
  }

  public setParam(paramId: string, value: number): void {
    this.setParamInternal(paramId, value);
  }

  public dispose(): void {
    this.input.dispose();
    this.output.dispose();
    this.dry.dispose();
    this.wet.dispose();
    this.processor.dispose();
  }
}

class DrumRackInstrument implements InstrumentPluginInstance {
  private readonly kick: Tone.MembraneSynth;
  private readonly snare: Tone.NoiseSynth;
  private readonly hat: Tone.MetalSynth;
  private readonly output: Tone.Gain;

  constructor() {
    this.output = new Tone.Gain(0.9);
    this.kick = new Tone.MembraneSynth().connect(this.output);
    this.snare = new Tone.NoiseSynth().connect(this.output);
    this.hat = new Tone.MetalSynth().connect(this.output);
  }

  public trigger(step: Step, time: Tone.Unit.Time, trackId: string): void {
    if (trackId.includes("kick")) {
      this.kick.triggerAttackRelease("C1", "16n", time, step.velocity);
      return;
    }
    if (trackId.includes("snare")) {
      this.snare.triggerAttackRelease("16n", time, step.velocity);
      return;
    }
    // MetalSynth uses Instrument signature: note, duration, time, velocity (not NoiseSynth's duration-first).
    const hatNote = step.note.trim().length > 0 ? step.note : "G5";
    this.hat.triggerAttackRelease(hatNote, "32n", time, step.velocity);
  }

  public setVolume(value: number): void {
    this.output.gain.rampTo(value, 0.05);
  }

  public applyPatch(): void {}

  public setParam(paramId: string, value: number): void {
    if (paramId === "tune") {
      this.kick.octaves = Math.max(1, Math.min(10, value + 5));
    }
  }

  public connect(input: Tone.ToneAudioNode): void {
    this.output.disconnect();
    this.output.connect(input);
  }

  public disconnect(): void {
    this.output.disconnect();
  }

  public dispose(): void {
    this.kick.dispose();
    this.snare.dispose();
    this.hat.dispose();
    this.output.dispose();
  }
}

class PatchDrivenSynthInstrument implements InstrumentPluginInstance {
  private readonly poly: InstanceType<typeof Tone.PolySynth> | null;
  /** Karplus-Strong voice is not pooled by `Tone.PolySynth`; single line plays the resolved root pitch. */
  private readonly karplusSynth: Tone.PluckSynth | null;
  private readonly filter: Tone.Filter;
  private readonly drive: Tone.Distortion;
  private readonly output: Tone.Gain;
  private readonly kind:
    | "subtractive"
    | "fm"
    | "wavetable"
    | "granular"
    | "additive"
    | "phase"
    | "karplus"
    | "supersaw"
    | "percussive";
  private patch: SynthPatch;

  constructor(
    kind:
      | "subtractive"
      | "fm"
      | "wavetable"
      | "granular"
      | "additive"
      | "phase"
      | "karplus"
      | "supersaw"
      | "percussive",
  ) {
    this.kind = kind;
    this.filter = new Tone.Filter(600, "lowpass");
    this.drive = new Tone.Distortion(0.2);
    this.output = new Tone.Gain(0.8);
    this.patch = makeDefaultBassPatch();
    this.poly = null;
    this.karplusSynth = null;

    if (kind === "karplus") {
      this.karplusSynth = new Tone.PluckSynth();
      this.karplusSynth.chain(this.filter, this.drive, this.output);
      return;
    }

    if (kind === "fm") {
      this.poly = new Tone.PolySynth(Tone.FMSynth);
    } else if (kind === "wavetable") {
      this.poly = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "fatsawtooth", spread: 30, count: 3 },
      });
    } else if (kind === "granular") {
      this.poly = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle8" },
        envelope: { attack: 0.02, decay: 0.2, sustain: 0.55, release: 0.8 },
      });
    } else if (kind === "additive") {
      this.poly = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle4" },
      });
    } else if (kind === "phase") {
      this.poly = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "square" },
      });
    } else if (kind === "supersaw") {
      this.poly = new Tone.PolySynth(Tone.MonoSynth, {
        oscillator: { type: "fatsawtooth", spread: 48, count: 5 },
      });
    } else if (kind === "percussive") {
      this.poly = new Tone.PolySynth(Tone.MembraneSynth, {
        pitchDecay: 0.02,
        octaves: 2,
      });
    } else {
      this.poly = new Tone.PolySynth(Tone.MonoSynth, {
        oscillator: { type: "sawtooth" },
      });
    }

    this.poly.chain(this.filter, this.drive, this.output);
  }

  public trigger(step: Step, time: Tone.Unit.Time, _trackId: string): void {
    void _trackId;
    const notes = resolveStepNotes(step);
    if (!step.active || notes.length === 0) {
      return;
    }

    if (this.kind === "karplus") {
      this.karplusSynth?.triggerAttack(notes[0] ?? step.note, time);
      return;
    }

    if (!this.poly) {
      return;
    }

    this.poly.triggerAttackRelease(notes, "16n", time, step.velocity);
  }

  public setVolume(value: number): void {
    this.output.gain.rampTo(value, 0.05);
  }

  public applyPatch(patch: SynthPatch | null): void {
    this.patch = patch ?? makeDefaultBassPatch();
    this.filter.frequency.rampTo(this.patch.filter.cutoff, 0.05);
    this.filter.Q.rampTo(this.patch.filter.resonance, 0.05);
    this.drive.distortion = this.patch.fx.drive;
  }

  public setParam(paramId: string, value: number): void {
    if (paramId === "brightness") {
      this.filter.frequency.rampTo(120 + value * 16000, 0.05);
      return;
    }
    if (paramId === "gain") {
      this.setVolume(value);
      return;
    }
    if (paramId === "modDepth" && this.kind === "fm") {
      this.poly?.set({ modulationIndex: 2 + value * 15 });
    }
  }

  public connect(input: Tone.ToneAudioNode): void {
    this.output.disconnect();
    this.output.connect(input);
  }

  public disconnect(): void {
    this.output.disconnect();
  }

  public dispose(): void {
    this.poly?.dispose();
    this.karplusSynth?.dispose();
    this.filter.dispose();
    this.drive.dispose();
    this.output.dispose();
  }
}

function makeInstrumentDefinitions(): InstrumentPluginDefinition[] {
  return [
    {
      id: "sampler-drum-rack",
      label: "Sampler Drum Rack",
      parameters: [{ id: "tune", label: "Tune", min: -5, max: 5, step: 0.1, defaultValue: 0 }],
      modulationTargets: [],
      create: () => new DrumRackInstrument(),
    },
    {
      id: "subtractive-bass",
      label: "Subtractive Bass",
      parameters: [
        { id: "gain", label: "Gain", min: 0, max: 1, step: 0.01, defaultValue: 0.8 },
        { id: "brightness", label: "Brightness", min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
      ],
      modulationTargets: ["filterCutoff", "filterResonance", "drive"],
      create: () => new PatchDrivenSynthInstrument("subtractive"),
    },
    {
      id: "fm-synth",
      label: "FM Synth",
      parameters: [
        { id: "gain", label: "Gain", min: 0, max: 1, step: 0.01, defaultValue: 0.8 },
        { id: "modDepth", label: "Mod Depth", min: 0, max: 1, step: 0.01, defaultValue: 0.4 },
      ],
      modulationTargets: ["filterCutoff", "drive"],
      create: () => new PatchDrivenSynthInstrument("fm"),
    },
    {
      id: "wavetable-synth",
      label: "Wavetable Synth",
      parameters: [
        { id: "gain", label: "Gain", min: 0, max: 1, step: 0.01, defaultValue: 0.75 },
        { id: "brightness", label: "Brightness", min: 0, max: 1, step: 0.01, defaultValue: 0.6 },
      ],
      modulationTargets: ["filterCutoff", "oscMix", "chorusMix"],
      create: () => new PatchDrivenSynthInstrument("wavetable"),
    },
    {
      id: "granular-texture",
      label: "Granular Texture",
      parameters: [
        { id: "gain", label: "Gain", min: 0, max: 1, step: 0.01, defaultValue: 0.65 },
        { id: "brightness", label: "Brightness", min: 0, max: 1, step: 0.01, defaultValue: 0.45 },
      ],
      modulationTargets: ["filterCutoff", "stereoWidth", "chorusMix"],
      create: () => new PatchDrivenSynthInstrument("granular"),
    },
    {
      id: "additive-synth",
      label: "Additive Synth",
      parameters: [
        { id: "gain", label: "Gain", min: 0, max: 1, step: 0.01, defaultValue: 0.72 },
        { id: "brightness", label: "Brightness", min: 0, max: 1, step: 0.01, defaultValue: 0.52 },
      ],
      modulationTargets: ["filterCutoff", "oscMix"],
      create: () => new PatchDrivenSynthInstrument("additive"),
    },
    {
      id: "phase-distortion-synth",
      label: "Phase Distortion Synth",
      parameters: [
        { id: "gain", label: "Gain", min: 0, max: 1, step: 0.01, defaultValue: 0.7 },
        { id: "brightness", label: "Brightness", min: 0, max: 1, step: 0.01, defaultValue: 0.6 },
      ],
      modulationTargets: ["filterCutoff", "drive"],
      create: () => new PatchDrivenSynthInstrument("phase"),
    },
    {
      id: "karplus-pluck",
      label: "Karplus Pluck",
      parameters: [
        { id: "gain", label: "Gain", min: 0, max: 1, step: 0.01, defaultValue: 0.68 },
        { id: "brightness", label: "Brightness", min: 0, max: 1, step: 0.01, defaultValue: 0.56 },
      ],
      modulationTargets: ["filterCutoff"],
      create: () => new PatchDrivenSynthInstrument("karplus"),
    },
    {
      id: "supersaw-stack",
      label: "Supersaw Stack",
      parameters: [
        { id: "gain", label: "Gain", min: 0, max: 1, step: 0.01, defaultValue: 0.75 },
        { id: "brightness", label: "Brightness", min: 0, max: 1, step: 0.01, defaultValue: 0.65 },
      ],
      modulationTargets: ["filterCutoff", "chorusMix", "stereoWidth"],
      create: () => new PatchDrivenSynthInstrument("supersaw"),
    },
    {
      id: "percussive-noise",
      label: "Percussive Noise Synth",
      parameters: [
        { id: "gain", label: "Gain", min: 0, max: 1, step: 0.01, defaultValue: 0.7 },
        { id: "brightness", label: "Brightness", min: 0, max: 1, step: 0.01, defaultValue: 0.45 },
      ],
      modulationTargets: ["filterCutoff", "drive"],
      create: () => new PatchDrivenSynthInstrument("percussive"),
    },
  ];
}

function makeEffectDefinitions(): EffectPluginDefinition[] {
  return [
    {
      id: "eq3",
      label: "EQ3",
      parameters: [
        { id: "low", label: "Low", min: -12, max: 12, step: 0.1, defaultValue: 0 },
        { id: "mid", label: "Mid", min: -12, max: 12, step: 0.1, defaultValue: 0 },
        { id: "high", label: "High", min: -12, max: 12, step: 0.1, defaultValue: 0 },
      ],
      modulationTargets: [],
      create: () => {
        const low = new Tone.Filter(200, "lowshelf");
        const mid = new Tone.Filter(1000, "peaking");
        const high = new Tone.Filter(5000, "highshelf");
        low.connect(mid);
        mid.connect(high);
        return new WetDryEffectInstance(high, (id, value) => {
          if (id === "low") low.gain.value = value;
          if (id === "mid") mid.gain.value = value;
          if (id === "high") high.gain.value = value;
        });
      },
    },
    {
      id: "state-filter",
      label: "State Filter",
      parameters: [
        { id: "cutoff", label: "Cutoff", min: 40, max: 18000, step: 10, defaultValue: 1200 },
        { id: "q", label: "Q", min: 0.1, max: 16, step: 0.1, defaultValue: 1.2 },
      ],
      modulationTargets: ["filterCutoff", "filterResonance"],
      create: () => {
        const node = new Tone.Filter(1200, "lowpass");
        return new WetDryEffectInstance(node, (id, value) => {
          if (id === "cutoff") node.frequency.value = value;
          if (id === "q") node.Q.value = value;
        });
      },
    },
    {
      id: "compressor",
      label: "Compressor",
      parameters: [
        { id: "threshold", label: "Threshold", min: -48, max: 0, step: 0.5, defaultValue: -18 },
        { id: "ratio", label: "Ratio", min: 1, max: 20, step: 0.1, defaultValue: 3 },
      ],
      modulationTargets: [],
      create: () => {
        const node = new Tone.Compressor(-18, 3);
        return new WetDryEffectInstance(node, (id, value) => {
          if (id === "threshold") node.threshold.value = value;
          if (id === "ratio") node.ratio.value = value;
        });
      },
    },
    {
      id: "saturator",
      label: "Saturator",
      parameters: [{ id: "drive", label: "Drive", min: 0, max: 1, step: 0.01, defaultValue: 0.2 }],
      modulationTargets: ["drive"],
      create: () => {
        const node = new Tone.Distortion(0.2);
        return new WetDryEffectInstance(node, (id, value) => {
          if (id === "drive") node.distortion = value;
        });
      },
    },
    {
      id: "chorus-phaser",
      label: "Chorus Phaser",
      parameters: [
        { id: "rate", label: "Rate", min: 0.1, max: 8, step: 0.1, defaultValue: 1.2 },
        { id: "depth", label: "Depth", min: 0, max: 1, step: 0.01, defaultValue: 0.4 },
      ],
      modulationTargets: ["chorusMix", "stereoWidth"],
      create: () => {
        const node = new Tone.Chorus(4, 2.5, 0.4);
        node.start();
        return new WetDryEffectInstance(node, (id, value) => {
          if (id === "rate") node.frequency.value = value;
          if (id === "depth") node.depth = value;
        });
      },
    },
    {
      id: "delay",
      label: "Delay",
      parameters: [
        { id: "time", label: "Time", min: 0.01, max: 1, step: 0.01, defaultValue: 0.25 },
        { id: "feedback", label: "Feedback", min: 0, max: 0.95, step: 0.01, defaultValue: 0.2 },
      ],
      modulationTargets: [],
      create: () => {
        const node = new Tone.FeedbackDelay(0.25, 0.2);
        return new WetDryEffectInstance(node, (id, value) => {
          if (id === "time") node.delayTime.value = value;
          if (id === "feedback") node.feedback.value = value;
        });
      },
    },
    {
      id: "reverb",
      label: "Reverb",
      parameters: [{ id: "decay", label: "Decay", min: 0.1, max: 12, step: 0.1, defaultValue: 2.4 }],
      modulationTargets: [],
      create: () => {
        const node = new Tone.Reverb({ decay: 2.4, wet: 1 });
        return new WetDryEffectInstance(node, (id, value) => {
          if (id === "decay") node.decay = value;
        });
      },
    },
    {
      id: "limiter",
      label: "Limiter",
      parameters: [{ id: "threshold", label: "Threshold", min: -20, max: 0, step: 0.1, defaultValue: -0.4 }],
      modulationTargets: [],
      create: () => {
        const node = new Tone.Limiter(-0.4);
        return new WetDryEffectInstance(node, (id, value) => {
          if (id === "threshold") node.threshold.value = value;
        });
      },
    },
    {
      id: "utility",
      label: "Utility",
      parameters: [
        { id: "gain", label: "Gain", min: 0, max: 2, step: 0.01, defaultValue: 1 },
        { id: "pan", label: "Pan", min: -1, max: 1, step: 0.01, defaultValue: 0 },
      ],
      modulationTargets: [],
      create: () => {
        const pan = new Tone.Panner(0);
        const gain = new Tone.Gain(1);
        pan.connect(gain);
        return new WetDryEffectInstance(gain, (id, value) => {
          if (id === "gain") gain.gain.value = value;
          if (id === "pan") pan.pan.value = value;
        });
      },
    },
    {
      id: "stereo-widener",
      label: "Stereo Widener",
      parameters: [{ id: "width", label: "Width", min: 0, max: 1, step: 0.01, defaultValue: 0.3 }],
      modulationTargets: ["stereoWidth"],
      create: () => {
        const node = new Tone.StereoWidener(0.3);
        return new WetDryEffectInstance(node, (id, value) => {
          if (id === "width") node.set({ width: value });
        });
      },
    },
    {
      id: "transient-shaper",
      label: "Transient Shaper",
      parameters: [{ id: "attackBoost", label: "Attack", min: 0, max: 1, step: 0.01, defaultValue: 0.25 }],
      modulationTargets: [],
      create: () => {
        const node = new Tone.Compressor(-12, 2);
        return new WetDryEffectInstance(node, (id, value) => {
          if (id === "attackBoost") {
            node.attack.value = 0.001 + (1 - value) * 0.05;
            node.release.value = 0.05 + value * 0.2;
          }
        });
      },
    },
    {
      id: "gate",
      label: "Gate",
      parameters: [{ id: "threshold", label: "Threshold", min: -60, max: 0, step: 0.5, defaultValue: -32 }],
      modulationTargets: [],
      create: () => {
        const node = new Tone.Gate(-32);
        return new WetDryEffectInstance(node, (id, value) => {
          if (id === "threshold") node.threshold = value;
        });
      },
    },
    {
      id: "bitcrusher",
      label: "Bitcrusher",
      parameters: [{ id: "bits", label: "Bits", min: 1, max: 8, step: 1, defaultValue: 4 }],
      modulationTargets: [],
      create: () => {
        const node = new Tone.BitCrusher(4);
        return new WetDryEffectInstance(node, (id, value) => {
          if (id === "bits") {
            node.bits.value = Math.max(1, Math.min(8, Math.round(value)));
          }
        });
      },
    },
    {
      id: "ring-mod",
      label: "Ring Mod",
      parameters: [
        { id: "frequency", label: "Frequency", min: 1, max: 120, step: 1, defaultValue: 30 },
        { id: "depth", label: "Depth", min: 0, max: 1, step: 0.01, defaultValue: 0.45 },
      ],
      modulationTargets: [],
      create: () => {
        const node = new Tone.Tremolo(30, 0.45);
        node.start();
        return new WetDryEffectInstance(node, (id, value) => {
          if (id === "frequency") node.frequency.value = value;
          if (id === "depth") node.depth.value = value;
        });
      },
    },
    {
      id: "auto-pan",
      label: "Auto Pan",
      parameters: [
        { id: "frequency", label: "Frequency", min: 0.05, max: 8, step: 0.05, defaultValue: 0.6 },
        { id: "depth", label: "Depth", min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
      ],
      modulationTargets: ["stereoWidth"],
      create: () => {
        const node = new Tone.AutoPanner(0.6);
        node.depth.value = 0.5;
        node.start();
        return new WetDryEffectInstance(node, (id, value) => {
          if (id === "frequency") node.frequency.value = value;
          if (id === "depth") node.depth.value = value;
        });
      },
    },
    {
      id: "multiband-split",
      label: "Multiband Split",
      parameters: [
        { id: "low", label: "Low", min: -12, max: 12, step: 0.1, defaultValue: 0 },
        { id: "mid", label: "Mid", min: -12, max: 12, step: 0.1, defaultValue: 0 },
        { id: "high", label: "High", min: -12, max: 12, step: 0.1, defaultValue: 0 },
      ],
      modulationTargets: [],
      create: () => {
        const low = new Tone.Filter(250, "lowshelf");
        const mid = new Tone.Filter(1400, "peaking");
        const high = new Tone.Filter(6000, "highshelf");
        low.connect(mid);
        mid.connect(high);
        return new WetDryEffectInstance(high, (id, value) => {
          if (id === "low") low.gain.value = value;
          if (id === "mid") mid.gain.value = value;
          if (id === "high") high.gain.value = value;
        });
      },
    },
    {
      id: "cabinet",
      label: "Cabinet",
      parameters: [
        { id: "tone", label: "Tone", min: 250, max: 6000, step: 10, defaultValue: 1600 },
        { id: "resonance", label: "Resonance", min: 0.1, max: 16, step: 0.1, defaultValue: 2.5 },
      ],
      modulationTargets: ["filterCutoff", "filterResonance"],
      create: () => {
        const node = new Tone.Filter(1600, "bandpass");
        return new WetDryEffectInstance(node, (id, value) => {
          if (id === "tone") node.frequency.value = value;
          if (id === "resonance") node.Q.value = value;
        });
      },
    },
  ];
}

/**
 * Creates the default registry with built-in instrument/effect plugins.
 */
export function createDefaultPluginRegistry(): PluginRegistry {
  const registry = new PluginRegistry();
  makeInstrumentDefinitions().forEach((definition) =>
    registry.registerInstrument(definition),
  );
  makeEffectDefinitions().forEach((definition) =>
    registry.registerEffect(definition),
  );
  return registry;
}
