import { makeDefaultBassPatch, makeDefaultDeviceChain } from "@/lib/audio/patches";
import type { DeviceChain, PatchIntent, SynthPatch } from "@/types";

/**
 * Apply sound-design intent to a synth patch.
 */
export function applyPatchIntent(base: SynthPatch | null, intent: PatchIntent | undefined): SynthPatch | null {
  if (!base || !intent) {
    return base;
  }
  const macros = base.macros.map((macro) => ({
    ...macro,
    value: intent.macroTargets[macro.id] ?? macro.value,
  }));
  const gritty = intent.character === "gritty" || intent.character === "metallic" || intent.character === "vocal";
  const wide = intent.character === "wide" || intent.character === "vocal";
  return {
    ...base,
    filter: {
      ...base.filter,
      cutoff: gritty ? Math.max(420, base.filter.cutoff * 0.85) : base.filter.cutoff,
      resonance: gritty ? Math.min(4, base.filter.resonance + 0.6) : base.filter.resonance,
    },
    fx: {
      ...base.fx,
      drive: gritty ? Math.min(1, base.fx.drive + 0.22) : base.fx.drive,
      chorusMix: wide ? Math.min(1, base.fx.chorusMix + 0.2) : base.fx.chorusMix,
      stereoWidth: wide ? Math.min(1, base.fx.stereoWidth + 0.25) : base.fx.stereoWidth,
    },
    macros,
  };
}

/**
 * Apply instrument/effect intent to the existing device chain shape.
 */
export function applyDeviceIntent(chain: DeviceChain, intent: PatchIntent | undefined): DeviceChain {
  if (!intent) {
    return chain;
  }
  const biasEffects = intent.effectBias
    .filter((pluginId) => !chain.effects.some((effect) => effect.pluginId === pluginId))
    .map((pluginId, index) => ({
      id: `${intent.trackId}-${pluginId}-${index}`,
      pluginId,
      bypass: false,
      wet: pluginId === "limiter" ? 1 : 0.35,
      params: {},
    }));
  return {
    ...chain,
    effects: [...chain.effects, ...biasEffects],
  };
}

/**
 * Build a default synth patch for composer-assigned tracks.
 */
export function makeIntentPatch(): SynthPatch {
  return makeDefaultBassPatch();
}

/**
 * Build a default device chain for composer-assigned instruments.
 */
export function makeIntentDeviceChain(instrumentPluginId: DeviceChain["instrumentPluginId"]): DeviceChain {
  return makeDefaultDeviceChain(instrumentPluginId);
}
