import assert from "node:assert/strict";
import test from "node:test";

import {
  getArrangementGridSpan,
  getArrangementPlayheadPercent,
} from "../../lib/arrangement/grid";

test("getArrangementGridSpan clamps bar spans to the visible section", () => {
  const span = getArrangementGridSpan(2, 3, 8);

  assert.deepEqual(span, {
    startBar: 2,
    bars: 3,
    leftPercent: 25,
    widthPercent: 37.5,
  });
  assert.equal(getArrangementGridSpan(10, 1, 8), null);
  assert.deepEqual(getArrangementGridSpan(-1, 3, 8), {
    startBar: 0,
    bars: 2,
    leftPercent: 0,
    widthPercent: 25,
  });
});

test("getArrangementPlayheadPercent maps section-local sixteenths to grid position", () => {
  assert.equal(getArrangementPlayheadPercent(0, 0, 4), 0);
  assert.equal(getArrangementPlayheadPercent(1, 8, 4), 37.5);
  assert.equal(getArrangementPlayheadPercent(4, 0, 4), null);
});
