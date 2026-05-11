import assert from "node:assert/strict";
import test from "node:test";

import { makeDefaultArrangement } from "../../lib/arrangement/defaults";
import {
  buildSectionTrackView,
  getArrangementSectionBarOffsets,
  mapArrangementStep,
  orderedArrangementSections,
  resolveAutomationValueAtBar,
  resolveGlobalBarToSectionLocal,
} from "../../lib/arrangement/timeline";
import { createDefaultTracks } from "../../lib/loop/defaults";

test("mapArrangementStep maps absolute transport position to section-local step", () => {
  const arrangement = makeDefaultArrangement(createDefaultTracks(), 140);
  arrangement.sections.push({
    id: "section-b",
    name: "Section B",
    bars: 2,
    clips: arrangement.sections[0]?.clips ?? [],
    assets: [],
    automationLanes: [],
    chordProgression: [{ chord: "Db", bars: 2 }],
    locked: false,
  });
  arrangement.sectionOrder = ["section-a", "section-b"];
  arrangement.totalBars = 6;

  const first = mapArrangementStep(arrangement, 0);
  const second = mapArrangementStep(arrangement, 64);
  assert.equal(first.sectionId, "section-a");
  assert.equal(second.sectionId, "section-b");
  assert.equal(second.localStep, 0);
});

test("mapArrangementStep reuses mapping result for identical inputs (hot transport path)", () => {
  const arrangement = makeDefaultArrangement(createDefaultTracks(), 140);
  const a = mapArrangementStep(arrangement, 7);
  const b = mapArrangementStep(arrangement, 7);
  assert.strictEqual(a, b);

  const c = mapArrangementStep(arrangement, 8);
  assert.notStrictEqual(a, c);

  const arrangement2 = makeDefaultArrangement(createDefaultTracks(), 120);
  const d = mapArrangementStep(arrangement2, 7);
  assert.notStrictEqual(a, d);
});

test("buildSectionTrackView selects bar-specific clip variants", () => {
  const tracks = createDefaultTracks();
  const arrangement = makeDefaultArrangement(tracks, 140);
  const bass = tracks.find((track) => track.id === "bass");
  assert.ok(bass);
  if (!bass) {
    return;
  }
  const bar0 = bass.steps.map((step) => ({ ...step, note: "F1" }));
  const bar1 = bass.steps.map((step) => ({ ...step, note: "G1" }));
  bass.clipVariants = {
    ...(bass.clipVariants ?? {}),
    "section-a-bass-bar-1": bar0,
    "section-a-bass-bar-2": bar1,
  };
  arrangement.sections[0]!.clips = [
    {
      id: "section-a-bass-1",
      trackId: "bass",
      variantId: "section-a-bass-bar-1",
      bars: 1,
      startBar: 0,
      muted: false,
    },
    {
      id: "section-a-bass-2",
      trackId: "bass",
      variantId: "section-a-bass-bar-2",
      bars: 1,
      startBar: 1,
      muted: false,
    },
  ];

  const viewBar0 = buildSectionTrackView(tracks, arrangement, "section-a", 0);
  const viewBar1 = buildSectionTrackView(tracks, arrangement, "section-a", 1);
  const bassBar0 = viewBar0.find((track) => track.id === "bass");
  const bassBar1 = viewBar1.find((track) => track.id === "bass");
  assert.equal(bassBar0?.steps[0]?.note, "F1");
  assert.equal(bassBar1?.steps[0]?.note, "G1");
});

test("buildSectionTrackView silences bars not covered by explicit clips", () => {
  const tracks = createDefaultTracks();
  const arrangement = makeDefaultArrangement(tracks, 140);
  arrangement.sections[0]!.clips = [
    {
      id: "section-a-kick-1",
      trackId: "kick",
      variantId: "base",
      bars: 1,
      startBar: 0,
      muted: false,
    },
  ];

  const viewBar1 = buildSectionTrackView(tracks, arrangement, "section-a", 1);
  const kick = viewBar1.find((track) => track.id === "kick");
  assert.ok(kick);
  assert.equal(kick?.mute, true);
  assert.ok(kick?.steps.every((step) => !step.active));
});

test("orderedArrangementSections and bar offsets match song order", () => {
  const arrangement = makeDefaultArrangement(createDefaultTracks(), 140);
  arrangement.sections.push({
    id: "section-b",
    name: "Section B",
    bars: 2,
    clips: arrangement.sections[0]?.clips ?? [],
    assets: [],
    automationLanes: [],
    chordProgression: [{ chord: "Db", bars: 2 }],
    locked: false,
  });
  arrangement.sectionOrder = ["section-a", "section-b"];

  const ordered = orderedArrangementSections(arrangement.sections, arrangement.sectionOrder);
  assert.equal(ordered.length, 2);
  assert.equal(ordered[0]?.id, "section-a");
  assert.equal(ordered[1]?.id, "section-b");

  const offsets = getArrangementSectionBarOffsets(arrangement.sections, arrangement.sectionOrder);
  assert.equal(offsets.get("section-a"), 0);
  assert.equal(offsets.get("section-b"), 4);

  assert.deepEqual(
    resolveGlobalBarToSectionLocal(arrangement.sections, arrangement.sectionOrder, 0),
    { sectionId: "section-a", localBar: 0 },
  );
  assert.deepEqual(
    resolveGlobalBarToSectionLocal(arrangement.sections, arrangement.sectionOrder, 4),
    { sectionId: "section-b", localBar: 0 },
  );
  assert.deepEqual(
    resolveGlobalBarToSectionLocal(arrangement.sections, arrangement.sectionOrder, 5),
    { sectionId: "section-b", localBar: 1 },
  );
  assert.equal(resolveGlobalBarToSectionLocal(arrangement.sections, arrangement.sectionOrder, 99), null);
});

test("resolveAutomationValueAtBar interpolates between points", () => {
  const points = [
    { bar: 0, value: 0.2 },
    { bar: 4, value: 0.6 },
  ];

  assert.equal(resolveAutomationValueAtBar(points, 0), 0.2);
  assert.ok(Math.abs((resolveAutomationValueAtBar(points, 2) ?? 0) - 0.4) < 0.000001);
  assert.equal(resolveAutomationValueAtBar(points, 8), 0.6);
});
