import assert from "node:assert/strict";
import test from "node:test";

import { evaluateModTargets } from "../../lib/audio/modMatrix";
import { makeDefaultBassPatch } from "../../lib/audio/patches";

test("evaluateModTargets returns clamped values", () => {
  const patch = makeDefaultBassPatch();
  patch.modRoutes.push({
    id: "stress",
    source: "macro1",
    target: "filterCutoff",
    amount: 50000,
    smoothing: 0.1,
    invert: false,
    enabled: true,
  });

  const result = evaluateModTargets(patch, 1);
  assert.ok(result.filterCutoff <= 18000);
  assert.ok(result.filterResonance >= 0.1);
  assert.ok(result.drive >= 0 && result.drive <= 1);
});
