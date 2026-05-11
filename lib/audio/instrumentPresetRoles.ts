import type { InstrumentPreset, Track } from "@/types";

type TrackRole = NonNullable<Track["role"]>;

/**
 * Returns a de-duplicated array while preserving original order.
 */
export function uniqueValues<T>(values: T[]): T[] {
  return [...new Set(values)];
}

/**
 * Derives canonical track roles from preset tags and plugin identity.
 */
export function getInstrumentPresetRoles(
  preset: Pick<InstrumentPreset, "instrumentPluginId" | "tags">,
): TrackRole[] {
  const tagText = preset.tags.join(" ").toLowerCase();
  const roles: TrackRole[] = [];

  if (preset.instrumentPluginId === "sampler-drum-rack" || tagText.includes("drum")) {
    roles.push("rhythm");
  }
  if (tagText.includes("bass") || tagText.includes("sub") || tagText.includes("growl")) {
    roles.push("bass");
  }
  if (
    tagText.includes("chord") ||
    tagText.includes("pad") ||
    tagText.includes("harmony") ||
    tagText.includes("atmospheric")
  ) {
    roles.push("harmony");
  }
  if (tagText.includes("lead") || tagText.includes("pluck") || tagText.includes("hook")) {
    roles.push("lead");
  }
  if (tagText.includes("fx") || tagText.includes("noise") || tagText.includes("texture")) {
    roles.push("fx");
  }

  if (roles.length > 0) {
    return uniqueValues(roles);
  }

  if (preset.instrumentPluginId === "granular-texture" || preset.instrumentPluginId === "percussive-noise") {
    return ["fx"];
  }
  if (preset.instrumentPluginId === "karplus-pluck" || preset.instrumentPluginId === "supersaw-stack") {
    return ["lead"];
  }
  if (preset.instrumentPluginId === "additive-synth") {
    return ["harmony"];
  }
  return ["bass"];
}

/**
 * Adds canonical role tags consumed by both the UI filter and AI catalog.
 */
export function withInstrumentRoleTags(presets: InstrumentPreset[]): InstrumentPreset[] {
  return presets.map((preset) => {
    const roles = getInstrumentPresetRoles(preset);
    return {
      ...preset,
      tags: uniqueValues([
        ...preset.tags,
        ...roles.map((role) => `role:${role}`),
        `instrument:${preset.instrumentPluginId}`,
      ]),
    };
  });
}
