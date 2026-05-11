import {
  STARTER_EFFECT_CHAIN_PRESETS,
  STARTER_INSTRUMENT_PRESETS,
  STARTER_PLUGIN_CHAIN_PRESETS,
} from "@/lib/audio/patches";
import { withInstrumentRoleTags } from "@/lib/audio/instrumentPresetRoles";
import type {
  EffectChainPreset,
  InstrumentPreset,
  PluginChainPreset,
  Track,
} from "@/types";

const PRESET_SCHEMA_VERSION = 1;

/**
 * Preset library container.
 */
export interface PresetLibrary {
  instrumentPresets: InstrumentPreset[];
  effectChainPresets: EffectChainPreset[];
  pluginChainPresets: PluginChainPreset[];
}

/**
 * Returns built-in preset library.
 */
export function getPresetLibrary(): PresetLibrary {
  return {
    instrumentPresets: withInstrumentRoleTags(STARTER_INSTRUMENT_PRESETS),
    effectChainPresets: STARTER_EFFECT_CHAIN_PRESETS,
    pluginChainPresets: STARTER_PLUGIN_CHAIN_PRESETS,
  };
}

/**
 * Ensures preset compatibility with current schema.
 */
export function migratePresetLibrary(library: PresetLibrary): PresetLibrary {
  return {
    instrumentPresets: withInstrumentRoleTags(
      library.instrumentPresets.map((preset) => ({
        ...preset,
        schemaVersion: PRESET_SCHEMA_VERSION,
      })),
    ),
    effectChainPresets: library.effectChainPresets.map((preset) => ({
      ...preset,
      schemaVersion: PRESET_SCHEMA_VERSION,
    })),
    pluginChainPresets: library.pluginChainPresets.map((preset) => ({
      ...preset,
      schemaVersion: PRESET_SCHEMA_VERSION,
    })),
  };
}

/**
 * Filters presets by tag.
 */
export function filterPresetsByTag<T extends { tags: string[] }>(
  presets: T[],
  tag: string,
): T[] {
  if (!tag.trim()) {
    return presets;
  }
  return presets.filter((preset) =>
    preset.tags.some((presetTag) => presetTag.toLowerCase().includes(tag.toLowerCase())),
  );
}

/**
 * Applies instrument preset to a track.
 */
export function applyInstrumentPreset(
  track: Track,
  preset: InstrumentPreset,
): Track {
  return {
    ...track,
    synthPatch: structuredClone(preset.synthPatch),
    deviceChain: {
      ...track.deviceChain,
      instrumentPluginId: preset.instrumentPluginId,
    },
  };
}

/**
 * Applies effects preset to a track.
 */
export function applyEffectChainPreset(
  track: Track,
  preset: EffectChainPreset,
): Track {
  return {
    ...track,
    deviceChain: {
      ...track.deviceChain,
      effects: structuredClone(preset.effects),
    },
  };
}

/**
 * Applies a full plugin chain preset.
 */
export function applyPluginChainPreset(
  track: Track,
  preset: PluginChainPreset,
): Track {
  return {
    ...track,
    deviceChain: structuredClone(preset.chain),
  };
}
