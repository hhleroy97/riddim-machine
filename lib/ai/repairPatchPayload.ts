import { getAIInstrumentOptions } from "@/lib/ai/instrumentCatalog";
import type { EffectPluginId, InstrumentIntent, InstrumentPluginId, PatchIntent } from "@/types";

type PatchResponse = {
  instrumentIntents: InstrumentIntent[];
  patchIntents: PatchIntent[];
};

const ROLES: Array<InstrumentIntent["role"]> = ["rhythm", "bass", "harmony", "lead", "fx"];
const INSTRUMENT_PLUGINS: InstrumentPluginId[] = [
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
];
const EFFECT_PLUGINS: EffectPluginId[] = [
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
];
const CHARACTERS: Array<PatchIntent["character"]> = ["clean", "gritty", "metallic", "wide", "dark", "vocal"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function textFrom(...values: unknown[]): string {
  return values
    .map((value) => {
      if (Array.isArray(value)) {
        return value.join(" ");
      }
      return typeof value === "string" ? value : "";
    })
    .join(" ")
    .toLowerCase();
}

function normalizeRole(value: unknown, trackId: string, context: string): InstrumentIntent["role"] {
  if (typeof value === "string" && ROLES.includes(value as InstrumentIntent["role"])) {
    return value as InstrumentIntent["role"];
  }

  const text = `${trackId} ${context} ${typeof value === "string" ? value : ""}`.toLowerCase();
  if (text.includes("drum") || text.includes("kick") || text.includes("snare") || text.includes("rhythm")) {
    return "rhythm";
  }
  if (text.includes("bass") || text.includes("wobble") || text.includes("reese") || text.includes("growl")) {
    return "bass";
  }
  if (text.includes("lead") || text.includes("hook") || text.includes("stab")) {
    return "lead";
  }
  if (text.includes("chord") || text.includes("pad") || text.includes("harmony")) {
    return "harmony";
  }
  return "fx";
}

function pluginForRole(role: InstrumentIntent["role"], value: unknown, context: string): InstrumentPluginId {
  if (typeof value === "string" && INSTRUMENT_PLUGINS.includes(value as InstrumentPluginId)) {
    return value as InstrumentPluginId;
  }

  const text = `${context} ${typeof value === "string" ? value : ""}`.toLowerCase();
  if (role === "rhythm") {
    return "sampler-drum-rack";
  }
  if (text.includes("supersaw")) {
    return "supersaw-stack";
  }
  if (text.includes("fm")) {
    return "fm-synth";
  }
  if (text.includes("wavetable") || text.includes("neuro") || text.includes("reese") || text.includes("growl")) {
    return "wavetable-synth";
  }
  if (role === "harmony") {
    return "fm-synth";
  }
  if (role === "lead") {
    return "supersaw-stack";
  }
  return "subtractive-bass";
}

function normalizeCharacter(value: unknown, context: string): PatchIntent["character"] {
  if (typeof value === "string" && CHARACTERS.includes(value as PatchIntent["character"])) {
    return value as PatchIntent["character"];
  }

  const text = `${context} ${typeof value === "string" ? value : ""}`.toLowerCase();
  if (text.includes("vocal")) {
    return "vocal";
  }
  if (text.includes("wide") || text.includes("stereo") || text.includes("pad")) {
    return "wide";
  }
  if (text.includes("metal") || text.includes("fm")) {
    return "metallic";
  }
  if (text.includes("dark") || text.includes("atmos")) {
    return "dark";
  }
  if (text.includes("clean") || text.includes("soft")) {
    return "clean";
  }
  return "gritty";
}

function effectBiasFromContext(context: string): EffectPluginId[] {
  const effects = new Set<EffectPluginId>();
  if (context.includes("distortion") || context.includes("aggressive") || context.includes("growl")) {
    effects.add("saturator");
  }
  if (context.includes("filter") || context.includes("wobble") || context.includes("modulated")) {
    effects.add("state-filter");
  }
  if (context.includes("wide") || context.includes("stereo")) {
    effects.add("stereo-widener");
  }
  if (context.includes("pad") || context.includes("atmospheric") || context.includes("release")) {
    effects.add("reverb");
  }
  if (context.includes("bright") || context.includes("sharp") || context.includes("midrange")) {
    effects.add("eq3");
  }
  effects.add("limiter");
  return [...effects].filter((effect) => EFFECT_PLUGINS.includes(effect));
}

function macroTargetsFromContext(context: string): PatchIntent["macroTargets"] {
  return {
    macro1: context.includes("filter") || context.includes("wobble") ? 0.82 : 0.55,
    macro2: context.includes("distortion") || context.includes("aggressive") ? 0.76 : 0.35,
    macro3: context.includes("wide") || context.includes("stereo") ? 0.7 : 0.4,
    macro4: context.includes("release") || context.includes("pad") || context.includes("atmospheric") ? 0.68 : 0.3,
  };
}

function sanitizeMacroTargets(value: unknown, fallbackContext: string): PatchIntent["macroTargets"] {
  const fallback = macroTargetsFromContext(fallbackContext);
  if (!isRecord(value)) {
    return fallback;
  }

  return {
    macro1: typeof value.macro1 === "number" && Number.isFinite(value.macro1) ? Math.max(0, Math.min(1, value.macro1)) : fallback.macro1,
    macro2: typeof value.macro2 === "number" && Number.isFinite(value.macro2) ? Math.max(0, Math.min(1, value.macro2)) : fallback.macro2,
    macro3: typeof value.macro3 === "number" && Number.isFinite(value.macro3) ? Math.max(0, Math.min(1, value.macro3)) : fallback.macro3,
    macro4: typeof value.macro4 === "number" && Number.isFinite(value.macro4) ? Math.max(0, Math.min(1, value.macro4)) : fallback.macro4,
  };
}

/**
 * Normalize external patch vocabulary into internal role, instrument, and effect enums.
 */
export function repairPatchPayload(payload: unknown): unknown {
  if (!isRecord(payload)) {
    return payload;
  }

  const rawInstrumentIntents = Array.isArray(payload.instrumentIntents) ? payload.instrumentIntents.filter(isRecord) : [];
  const rawPatchIntents = Array.isArray(payload.patchIntents) ? payload.patchIntents.filter(isRecord) : [];
  const presetOptions = getAIInstrumentOptions();
  const instrumentIntents = rawInstrumentIntents.map((intent, index): InstrumentIntent => {
    const trackId = typeof intent.trackId === "string" && intent.trackId.length > 0 ? intent.trackId : `track-${index + 1}`;
    const context = textFrom(intent.description, intent.instrumentPluginId, intent.role);
    const role = normalizeRole(intent.role, trackId, context);
    const instrumentPluginId = pluginForRole(role, intent.instrumentPluginId, context);
    const instrumentPresetId =
      typeof intent.instrumentPresetId === "string" &&
      presetOptions.some(
        (option) =>
          option.presetId === intent.instrumentPresetId &&
          option.instrumentPluginId === instrumentPluginId,
      )
        ? intent.instrumentPresetId
        : undefined;
    return {
      trackId,
      role,
      instrumentPluginId,
      ...(instrumentPresetId ? { instrumentPresetId } : {}),
    };
  });

  const patchIntents = rawPatchIntents.map((intent, index): PatchIntent => {
    const trackId = typeof intent.trackId === "string" && intent.trackId.length > 0
      ? intent.trackId
      : instrumentIntents[index]?.trackId ?? `track-${index + 1}`;
    const context = textFrom(intent.patchType, intent.characteristics, intent.description, intent.modulationRate);
    return {
      trackId,
      character: normalizeCharacter(intent.character, context),
      macroTargets: sanitizeMacroTargets(intent.macroTargets, context),
      effectBias: Array.isArray(intent.effectBias)
        ? intent.effectBias.filter((effect): effect is EffectPluginId =>
            typeof effect === "string" && EFFECT_PLUGINS.includes(effect as EffectPluginId),
          )
        : effectBiasFromContext(context),
    };
  });

  const repaired: PatchResponse = {
    instrumentIntents:
      instrumentIntents.length > 0
        ? instrumentIntents
        : [{ trackId: "bass", role: "bass", instrumentPluginId: "subtractive-bass" }],
    patchIntents:
      patchIntents.length > 0
        ? patchIntents
        : [{ trackId: "bass", character: "gritty", macroTargets: { macro1: 0.7 }, effectBias: ["saturator"] }],
  };

  return repaired;
}
