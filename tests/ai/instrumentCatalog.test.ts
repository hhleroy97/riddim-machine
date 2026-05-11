import assert from "node:assert/strict";
import test from "node:test";

import {
  getAIInstrumentOptions,
  resolveInstrumentPreset,
} from "../../lib/ai/instrumentCatalog";

test("AI instrument catalog exposes role-tagged preset options", () => {
  const options = getAIInstrumentOptions();
  const roles = new Set(options.flatMap((option) => option.roles));

  assert.ok(options.length >= 20);
  assert.ok(roles.has("rhythm"));
  assert.ok(roles.has("bass"));
  assert.ok(roles.has("harmony"));
  assert.ok(roles.has("lead"));
  assert.ok(roles.has("fx"));
  assert.ok(options.some((option) => option.presetId === "inst-wavetable-vowel-bass"));
});

test("resolveInstrumentPreset rejects mismatched plugin selections", () => {
  assert.equal(
    resolveInstrumentPreset("inst-wavetable-vowel-bass", "wavetable-synth")?.id,
    "inst-wavetable-vowel-bass",
  );
  assert.equal(resolveInstrumentPreset("inst-wavetable-vowel-bass", "fm-synth"), null);
});
