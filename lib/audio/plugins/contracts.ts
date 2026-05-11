import type * as Tone from "tone";

import type {
  EffectPluginId,
  EffectSlot,
  InstrumentPluginId,
  ModTarget,
  Step,
  SynthPatch,
} from "@/types";

/**
 * Numeric parameter descriptor for plugin UI and validation.
 */
export interface PluginParameterDescriptor {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

/**
 * Runtime instance contract for instrument plugins.
 */
export interface InstrumentPluginInstance {
  trigger: (step: Step, time: Tone.Unit.Time, trackId: string) => void;
  setVolume: (value: number) => void;
  applyPatch: (patch: SynthPatch | null) => void;
  setParam: (paramId: string, value: number) => void;
  connect: (input: Tone.ToneAudioNode) => void;
  disconnect: () => void;
  dispose: () => void;
}

/**
 * Runtime instance contract for effect plugins.
 */
export interface EffectPluginInstance {
  readonly input: Tone.ToneAudioNode;
  readonly output: Tone.ToneAudioNode;
  setWet: (value: number) => void;
  setBypass: (value: boolean) => void;
  setParam: (paramId: string, value: number) => void;
  dispose: () => void;
}

/**
 * Factory contract for instrument plugins.
 */
export interface InstrumentPluginDefinition {
  id: InstrumentPluginId;
  label: string;
  parameters: PluginParameterDescriptor[];
  modulationTargets: ModTarget[];
  create: () => InstrumentPluginInstance;
}

/**
 * Factory contract for effect plugins.
 */
export interface EffectPluginDefinition {
  id: EffectPluginId;
  label: string;
  parameters: PluginParameterDescriptor[];
  modulationTargets: ModTarget[];
  create: () => EffectPluginInstance;
}

/**
 * Convenience helper for effect slot defaults.
 */
export function makeEffectSlot(id: string, pluginId: EffectPluginId): EffectSlot {
  return {
    id,
    pluginId,
    bypass: false,
    wet: 1,
    params: {},
  };
}
