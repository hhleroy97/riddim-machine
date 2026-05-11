import type {
  DeviceChain,
  EffectSlot,
  EnvelopePatch,
  FilterPatch,
  FxPatch,
  MacroControl,
  ModRoute,
  OscillatorLayer,
  Step,
  SynthPatch,
  Track,
} from "@/types";

function oscillatorLayersEqual(
  layersA: OscillatorLayer[],
  layersB: OscillatorLayer[],
): boolean {
  if (layersA.length !== layersB.length) {
    return false;
  }
  for (let i = 0; i < layersA.length; i += 1) {
    const a = layersA[i];
    const b = layersB[i];
    if (!a || !b) {
      return false;
    }
    if (
      a.id !== b.id ||
      a.enabled !== b.enabled ||
      a.waveform !== b.waveform ||
      a.octave !== b.octave ||
      a.detune !== b.detune ||
      a.gain !== b.gain
    ) {
      return false;
    }
  }
  return true;
}

function envelopesEqual(patchA: EnvelopePatch, patchB: EnvelopePatch): boolean {
  return (
    patchA.attack === patchB.attack &&
    patchA.decay === patchB.decay &&
    patchA.sustain === patchB.sustain &&
    patchA.release === patchB.release
  );
}

function filtersEqual(patchA: FilterPatch, patchB: FilterPatch): boolean {
  return (
    patchA.cutoff === patchB.cutoff &&
    patchA.resonance === patchB.resonance &&
    patchA.envelopeAmount === patchB.envelopeAmount
  );
}

function fxPatchesEqual(patchA: FxPatch, patchB: FxPatch): boolean {
  return (
    patchA.drive === patchB.drive &&
    patchA.chorusMix === patchB.chorusMix &&
    patchA.stereoWidth === patchB.stereoWidth &&
    patchA.lowCut === patchB.lowCut &&
    patchA.highCut === patchB.highCut
  );
}

function macrosEqual(macrosA: MacroControl[], macrosB: MacroControl[]): boolean {
  if (macrosA.length !== macrosB.length) {
    return false;
  }
  for (let i = 0; i < macrosA.length; i += 1) {
    const a = macrosA[i];
    const b = macrosB[i];
    if (!a || !b) {
      return false;
    }
    if (a.id !== b.id || a.label !== b.label || a.value !== b.value) {
      return false;
    }
  }
  return true;
}

function modRoutesEqual(routesA: ModRoute[], routesB: ModRoute[]): boolean {
  if (routesA.length !== routesB.length) {
    return false;
  }
  for (let i = 0; i < routesA.length; i += 1) {
    const a = routesA[i];
    const b = routesB[i];
    if (
      !a ||
      !b ||
      a.id !== b.id ||
      a.source !== b.source ||
      a.target !== b.target ||
      a.amount !== b.amount ||
      a.smoothing !== b.smoothing ||
      a.invert !== b.invert ||
      a.enabled !== b.enabled
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Structural equality for {@link SynthPatch} without serialization.
 */
export function synthPatchesEqual(
  previous: SynthPatch | null | undefined,
  next: SynthPatch | null | undefined,
): boolean {
  if (!previous && !next) {
    return true;
  }
  if (!previous || !next) {
    return false;
  }
  if (
    previous.version !== next.version ||
    !oscillatorLayersEqual(previous.oscillators, next.oscillators) ||
    !envelopesEqual(previous.ampEnvelope, next.ampEnvelope) ||
    !envelopesEqual(previous.modEnvelope, next.modEnvelope) ||
    !filtersEqual(previous.filter, next.filter) ||
    !fxPatchesEqual(previous.fx, next.fx) ||
    !macrosEqual(previous.macros, next.macros) ||
    !modRoutesEqual(previous.modRoutes, next.modRoutes)
  ) {
    return false;
  }
  return true;
}

function numberRecordEqual(a: Record<string, number>, b: Record<string, number>): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) {
    return false;
  }
  for (const key of keysA) {
    if (a[key] !== b[key]) {
      return false;
    }
  }
  return true;
}

function effectSlotsEqual(previous: EffectSlot, next: EffectSlot): boolean {
  return (
    previous.id === next.id &&
    previous.pluginId === next.pluginId &&
    previous.bypass === next.bypass &&
    previous.wet === next.wet &&
    numberRecordEqual(previous.params, next.params)
  );
}

/**
 * Structural equality for {@link DeviceChain} without serialization.
 */
export function deviceChainsEqual(previous: DeviceChain, next: DeviceChain): boolean {
  if (previous.effects.length !== next.effects.length) {
    return false;
  }

  return (
    previous.instrumentPluginId === next.instrumentPluginId &&
    numberRecordEqual(previous.instrumentParams, next.instrumentParams) &&
    previous.effects.every((slot, index) => {
      const candidate = next.effects[index];
      return candidate !== undefined && effectSlotsEqual(slot, candidate);
    })
  );
}

/**
 * Whether two steps differ in sequencer-audio relevant fields (no referential semantics).
 */
export function stepsAudioEqual(previous: Step, next: Step): boolean {
  if (
    previous.active !== next.active ||
    previous.note !== next.note ||
    previous.velocity !== next.velocity
  ) {
    return false;
  }
  const notesA = previous.notes ?? null;
  const notesB = next.notes ?? null;
  if (notesA === null && notesB === null) {
    return true;
  }
  if (notesA === null || notesB === null || notesA.length !== notesB.length) {
    return false;
  }
  return notesA.every((note, index) => note === notesB[index]);
}

/**
 * Cheap patch-change probe for playback sync (references first).
 */
export function hasSynthPatchChanged(previous: Track, next: Track): boolean {
  if (previous.synthPatch === next.synthPatch) {
    return false;
  }
  if (!previous.synthPatch || !next.synthPatch) {
    return true;
  }
  return !synthPatchesEqual(previous.synthPatch, next.synthPatch);
}
