import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { createDefaultPluginRegistry } from "../../lib/audio/plugins/defaultRegistry";

/**
 * MetalSynth extends Instrument: triggerAttackRelease(note, duration, time?, velocity?).
 * NoiseSynth uses duration-first — swapping args silences hats.
 */
test("DrumRack hi-hat triggers MetalSynth with note then duration", async () => {
  const registryPath = fileURLToPath(new URL("../../lib/audio/plugins/defaultRegistry.ts", import.meta.url));
  const src = await readFile(registryPath, "utf8");
  assert.match(
    src,
    /hat\.triggerAttackRelease\(\s*hatNote\s*,\s*["']32n["']/,
    "Regressions here made hi-hats inaudible",
  );
});

test("default plugin registry exposes core instrument suite", () => {
  const registry = createDefaultPluginRegistry();
  const instrumentIds = registry.listInstrumentIds();
  assert.ok(instrumentIds.includes("subtractive-bass"));
  assert.ok(instrumentIds.includes("fm-synth"));
  assert.ok(instrumentIds.includes("wavetable-synth"));
  assert.ok(instrumentIds.includes("granular-texture"));
  assert.ok(instrumentIds.includes("sampler-drum-rack"));
  assert.ok(instrumentIds.includes("additive-synth"));
  assert.ok(instrumentIds.includes("phase-distortion-synth"));
  assert.ok(instrumentIds.includes("karplus-pluck"));
  assert.ok(instrumentIds.includes("supersaw-stack"));
  assert.ok(instrumentIds.includes("percussive-noise"));
});

test("default plugin registry exposes effect suite", () => {
  const registry = createDefaultPluginRegistry();
  const effectIds = registry.listEffectIds();
  assert.ok(effectIds.includes("eq3"));
  assert.ok(effectIds.includes("compressor"));
  assert.ok(effectIds.includes("saturator"));
  assert.ok(effectIds.includes("delay"));
  assert.ok(effectIds.includes("reverb"));
  assert.ok(effectIds.includes("limiter"));
  assert.ok(effectIds.includes("utility"));
  assert.ok(effectIds.includes("gate"));
});
