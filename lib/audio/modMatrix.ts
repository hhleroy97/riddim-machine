import type { ModRoute, ModSource, ModTarget, SynthPatch } from "@/types";

interface ModSourceValues {
  lfo1: number;
  env1: number;
  macro1: number;
  macro2: number;
  macro3: number;
  macro4: number;
}

const TARGET_LIMITS: Record<ModTarget, { min: number; max: number }> = {
  filterCutoff: { min: 40, max: 18000 },
  filterResonance: { min: 0.1, max: 16 },
  oscMix: { min: 0, max: 1 },
  drive: { min: 0, max: 1 },
  chorusMix: { min: 0, max: 1 },
  stereoWidth: { min: 0, max: 1 },
};

function clamp(target: ModTarget, value: number): number {
  const limits = TARGET_LIMITS[target];
  return Math.max(limits.min, Math.min(limits.max, value));
}

function sourceValue(source: ModSource, values: ModSourceValues): number {
  return values[source];
}

function routeContribution(route: ModRoute, values: ModSourceValues): number {
  if (!route.enabled) {
    return 0;
  }

  const source = sourceValue(route.source, values);
  const signed = route.invert ? -source : source;
  return signed * route.amount;
}

/**
 * Computes modulation source values from patch state.
 */
export function makeModSources(patch: SynthPatch, lfoValue: number): ModSourceValues {
  const macro = (id: "macro1" | "macro2" | "macro3" | "macro4"): number =>
    patch.macros.find((item) => item.id === id)?.value ?? 0;

  const env = patch.modEnvelope.sustain;
  return {
    lfo1: lfoValue,
    env1: env,
    macro1: macro("macro1"),
    macro2: macro("macro2"),
    macro3: macro("macro3"),
    macro4: macro("macro4"),
  };
}

/**
 * Evaluates mod routes and returns effective synth targets.
 */
export function evaluateModTargets(patch: SynthPatch, lfoValue: number): Record<ModTarget, number> {
  const base = {
    filterCutoff: patch.filter.cutoff,
    filterResonance: patch.filter.resonance,
    oscMix: patch.oscillators[1]?.gain ?? 0.5,
    drive: patch.fx.drive,
    chorusMix: patch.fx.chorusMix,
    stereoWidth: patch.fx.stereoWidth,
  };

  const sourceValues = makeModSources(patch, lfoValue);
  const next = { ...base };

  patch.modRoutes.forEach((route) => {
    next[route.target] += routeContribution(route, sourceValues);
  });

  return {
    filterCutoff: clamp("filterCutoff", next.filterCutoff),
    filterResonance: clamp("filterResonance", next.filterResonance),
    oscMix: clamp("oscMix", next.oscMix),
    drive: clamp("drive", next.drive),
    chorusMix: clamp("chorusMix", next.chorusMix),
    stereoWidth: clamp("stereoWidth", next.stereoWidth),
  };
}
