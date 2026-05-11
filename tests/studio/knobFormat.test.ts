import assert from "node:assert/strict";
import test from "node:test";

import { formatKnobDisplay } from "../../lib/studio/knobFormat";

test("formatKnobDisplay handles 0-1 as percent", () => {
  assert.equal(formatKnobDisplay(0.72, 0, 1, 0.01), "72%");
});

test("formatKnobDisplay handles bipolar -1..1", () => {
  assert.equal(formatKnobDisplay(-0.5, -1, 1, 0.01), "-50%");
  assert.equal(formatKnobDisplay(0, -1, 1, 0.01), "0%");
  assert.equal(formatKnobDisplay(0.25, -1, 1, 0.01), "+25%");
});

test("formatKnobDisplay abbreviates cutoff-style hz", () => {
  assert.equal(formatKnobDisplay(6400, 40, 18000, 20), "6400");
  assert.equal(formatKnobDisplay(12000, 40, 18000, 20), "12.0k");
});

test("formatKnobDisplay uses seconds for short attack/decay ranges", () => {
  assert.equal(formatKnobDisplay(0.045, 0.001, 1, 0.001).endsWith("s"), true);
  assert.equal(formatKnobDisplay(0.14, 0.01, 1.2, 0.01).endsWith("s"), true);
});
