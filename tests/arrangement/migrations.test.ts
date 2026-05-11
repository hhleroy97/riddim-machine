import assert from "node:assert/strict";
import test from "node:test";

import { normalizeLoopArrangement } from "../../lib/arrangement/defaults";
import { createDefaultTracks } from "../../lib/loop/defaults";

test("normalizeLoopArrangement wraps legacy loop with default arrangement", () => {
  const loop = {
    id: "legacy-loop",
    name: "Legacy",
    bpm: 140,
    tracks: createDefaultTracks(),
    createdAt: new Date().toISOString(),
  };

  const normalized = normalizeLoopArrangement(loop);
  assert.ok(normalized.arrangement);
  assert.equal(normalized.arrangement?.sections.length, 1);
  assert.equal(normalized.arrangement?.sectionOrder.length, 1);
  assert.ok(Array.isArray(normalized.arrangement?.sections[0]?.assets));
  assert.ok(Array.isArray(normalized.arrangement?.sections[0]?.automationLanes));
  assert.ok(normalized.renderPlan);
  assert.equal(normalized.renderPlan?.tempoMap[0]?.bpm, 140);
});
