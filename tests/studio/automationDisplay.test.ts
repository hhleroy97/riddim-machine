import assert from "node:assert/strict";
import test from "node:test";

import {
  automationTargetShortLabel,
  summarizeAutomationLaneValues,
} from "../../lib/studio/automationDisplay";

test("summarizeAutomationLaneValues formats fx.drive like knob percent readout", () => {
  assert.equal(
    summarizeAutomationLaneValues({
      target: "fx.drive",
      points: [{ bar: 0, value: 0.72 }],
    }),
    "72%",
  );
});

test("summarizeAutomationLaneValues shows range when points differ", () => {
  const text = summarizeAutomationLaneValues({
    target: "fx.chorusMix",
    points: [
      { bar: 0, value: 0 },
      { bar: 2, value: 0.15 },
    ],
  });
  assert.ok(text.includes("–"));
});

test("automationTargetShortLabel uses last segment of target path", () => {
  assert.equal(automationTargetShortLabel("fx.drive"), "drive");
  assert.equal(automationTargetShortLabel("filter.cutoff"), "cutoff");
});
