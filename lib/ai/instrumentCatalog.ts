import { getPresetLibrary } from "@/lib/audio/presetLibrary";
import { getInstrumentPresetRoles } from "@/lib/audio/instrumentPresetRoles";
import type { InstrumentPluginId, InstrumentPreset, Track } from "@/types";

type TrackRole = NonNullable<Track["role"]>;

/**
 * Compact instrument option passed to AI agents.
 */
export interface AIInstrumentOption {
  presetId: string;
  name: string;
  instrumentPluginId: InstrumentPluginId;
  roles: TrackRole[];
  tags: string[];
}

/**
 * Returns the curated preset catalog in the smallest shape useful to AI agents.
 */
export function getAIInstrumentOptions(): AIInstrumentOption[] {
  return getPresetLibrary().instrumentPresets.map((preset) => ({
    presetId: preset.id,
    name: preset.name,
    instrumentPluginId: preset.instrumentPluginId,
    roles: getInstrumentPresetRoles(preset),
    tags: preset.tags,
  }));
}

/**
 * Finds a preset if an AI response selected a known preset id.
 */
export function findInstrumentPresetById(presetId: string | undefined): InstrumentPreset | null {
  if (!presetId) {
    return null;
  }
  return getPresetLibrary().instrumentPresets.find((preset) => preset.id === presetId) ?? null;
}

/**
 * Resolves a preset id only if it matches the selected plugin, avoiding mismatched AI choices.
 */
export function resolveInstrumentPreset(
  presetId: string | undefined,
  instrumentPluginId: InstrumentPluginId,
): InstrumentPreset | null {
  const preset = findInstrumentPresetById(presetId);
  if (!preset || preset.instrumentPluginId !== instrumentPluginId) {
    return null;
  }
  return preset;
}
