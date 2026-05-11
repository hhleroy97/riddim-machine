import assert from "node:assert/strict";
import test from "node:test";

import { createDefaultTracks } from "../../lib/loop/defaults";

test("createDefaultTracks returns expanded starter tracks", () => {
  const tracks = createDefaultTracks();
  assert.equal(tracks.length, 6);
  assert.ok(tracks.every((track) => track.steps.length === 16));
  assert.ok(tracks.some((track) => track.id === "hihat"));
  assert.ok(tracks.some((track) => track.id === "lead"));
  assert.ok(tracks.some((track) => track.id === "chords"));
});
