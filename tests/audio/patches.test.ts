import assert from "node:assert/strict";
import test from "node:test";

import {
  makeDefaultBassPatch,
  normalizeTrackPatch,
  STARTER_INSTRUMENT_PRESETS,
  STARTER_PATCH_PRESETS,
} from "../../lib/audio/patches";
import type { Track } from "../../types";

test("default patch contains expected structural fields", () => {
  const patch = makeDefaultBassPatch();
  assert.equal(patch.version, 1);
  assert.equal(patch.macros.length, 4);
  assert.ok(patch.modRoutes.length > 0);
});

test("starter presets serialize and rehydrate", () => {
  const serialized = JSON.stringify(STARTER_PATCH_PRESETS[0]);
  const parsed = JSON.parse(serialized) as (typeof STARTER_PATCH_PRESETS)[number];
  assert.equal(parsed.name, STARTER_PATCH_PRESETS[0].name);
  assert.equal(parsed.patch.oscillators.length, STARTER_PATCH_PRESETS[0].patch.oscillators.length);
});

test("normalizeTrackPatch upgrades legacy bass track without synthPatch", () => {
  const legacyTrack = {
    id: "bass",
    name: "Legacy Bass",
    type: "bass",
    mute: false,
    solo: false,
    volume: 0.8,
    steps: [{ active: true, note: "F1", velocity: 0.8 }],
    synthPatch: null,
  } as Track;

  const normalized = normalizeTrackPatch(legacyTrack);
  assert.ok(normalized.synthPatch);
});

test("starter instrument presets include lead/chord riddim banks", () => {
  const presetIds = STARTER_INSTRUMENT_PRESETS.map((preset) => preset.id);
  assert.ok(presetIds.includes("inst-riddim-horn-lead"));
  assert.ok(presetIds.includes("inst-laser-call-lead"));
  assert.ok(presetIds.includes("inst-stab-chord-rack"));
  assert.ok(presetIds.includes("inst-future-color-chords"));
  assert.ok(presetIds.includes("inst-super-bass-monarch"));
});
