import assert from "node:assert/strict";
import test from "node:test";

import { buildChordPattern } from "../../lib/midi/chordPatterns";

test("buildChordPattern creates deterministic 16-step chord-driven pattern", () => {
  const pattern = buildChordPattern([
    { chord: "Fm", bars: 2 },
    { chord: "Db", bars: 2 },
  ]);

  assert.equal(pattern.length, 16);
  assert.equal(pattern[0]?.active, true);
  assert.equal(pattern[1]?.active, false);
  assert.equal(pattern[4]?.active, true);
  assert.equal(pattern[12]?.active, true);
  assert.match(pattern[0]?.note ?? "", /^[A-G]#?\d$/);
  assert.equal(pattern[0]?.notes?.length, 3);

  const chordsOnBeats = [0, 4, 8, 12];
  chordsOnBeats.forEach((index) => {
    assert.ok(pattern[index]?.notes && pattern[index]!.notes!.length >= 3);
  });
});
