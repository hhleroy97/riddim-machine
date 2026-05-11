import assert from "node:assert/strict";
import test from "node:test";

import {
  applyEffectChainPreset,
  applyInstrumentPreset,
  applyPluginChainPreset,
  filterPresetsByTag,
  getPresetLibrary,
  migratePresetLibrary,
} from "../../lib/audio/presetLibrary";
import { createDefaultTracks } from "../../lib/loop/defaults";

test("preset library migration normalizes schema version", () => {
  const migrated = migratePresetLibrary(getPresetLibrary());
  assert.ok(migrated.instrumentPresets.every((preset) => preset.schemaVersion === 1));
  assert.ok(migrated.effectChainPresets.every((preset) => preset.schemaVersion === 1));
  assert.ok(migrated.pluginChainPresets.every((preset) => preset.schemaVersion === 1));
});

test("filterPresetsByTag returns matching presets", () => {
  const library = getPresetLibrary();
  const filtered = filterPresetsByTag(library.instrumentPresets, "fm");
  assert.ok(filtered.length > 0);
  assert.ok(filtered.every((preset) => preset.tags.some((tag) => tag.includes("fm"))));
});

test("instrument preset bank covers every built-in instrument with role tags", () => {
  const library = getPresetLibrary();
  const grouped = library.instrumentPresets.reduce<Map<string, number>>((acc, preset) => {
    acc.set(preset.instrumentPluginId, (acc.get(preset.instrumentPluginId) ?? 0) + 1);
    return acc;
  }, new Map());

  [
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
  ].forEach((pluginId) => {
    assert.ok((grouped.get(pluginId) ?? 0) >= 2, `${pluginId} needs multiple preset options`);
  });

  assert.ok(library.instrumentPresets.every((preset) => preset.tags.some((tag) => tag.startsWith("role:"))));
});

test("apply preset helpers mutate track chain targets", () => {
  const [track] = createDefaultTracks().filter((item) => item.type === "bass");
  const library = getPresetLibrary();
  const afterInstrument = applyInstrumentPreset(track, library.instrumentPresets[0]);
  assert.equal(
    afterInstrument.deviceChain.instrumentPluginId,
    library.instrumentPresets[0].instrumentPluginId,
  );

  const afterEffects = applyEffectChainPreset(afterInstrument, library.effectChainPresets[0]);
  assert.equal(afterEffects.deviceChain.effects.length, library.effectChainPresets[0].effects.length);

  const afterChain = applyPluginChainPreset(afterEffects, library.pluginChainPresets[0]);
  assert.equal(
    afterChain.deviceChain.instrumentPluginId,
    library.pluginChainPresets[0].chain.instrumentPluginId,
  );
});
