import assert from "node:assert/strict";
import test from "node:test";

import { createDefaultTracks } from "../../lib/loop/defaults";
import { useArrangementStore } from "../../stores/arrangementStore";

test("arrangement store supports pattern clips, assets, and automation points", () => {
  const tracks = createDefaultTracks();
  useArrangementStore.getState().seedDefaultArrangement(tracks, 140);
  const arrangement = useArrangementStore.getState().arrangement;
  assert.ok(arrangement);

  const sectionId = arrangement?.sectionOrder[0] ?? "section-a";
  const trackId = tracks[0]?.id ?? "kick";

  useArrangementStore
    .getState()
    .placePatternClip(sectionId, trackId, "generated-fill", 2, 1);
  useArrangementStore.getState().addSectionAsset(sectionId, {
    kind: "midi",
    label: "stab.mid",
    startBar: 1,
    bars: 1,
    trackId,
  });
  useArrangementStore
    .getState()
    .setAutomationPoint(sectionId, { trackId, target: "filter.cutoff" }, 0, 0.82);

  const updated = useArrangementStore
    .getState()
    .arrangement?.sections.find((section) => section.id === sectionId);
  assert.ok(updated);
  assert.ok(updated?.clips.some((clip) => clip.variantId === "generated-fill"));
  assert.equal(updated?.assets[0]?.kind, "midi");
  assert.equal(updated?.automationLanes[0]?.target, "filter.cutoff");
});

test("placePatternClip replaces overlapping clip on same track", () => {
  const tracks = createDefaultTracks();
  useArrangementStore.setState({
    arrangement: null,
    selectedSectionId: null,
    absoluteStep: 0,
  });
  useArrangementStore.getState().seedDefaultArrangement(tracks, 140);
  const arrangement = useArrangementStore.getState().arrangement;
  assert.ok(arrangement);

  const sectionId = arrangement.sectionOrder[0] ?? "section-a";
  const trackId = tracks[0]?.id ?? "kick";

  useArrangementStore.getState().placePatternClip(sectionId, trackId, "base", 1, 2);
  useArrangementStore.getState().placePatternClip(sectionId, trackId, "variation-a", 2, 1);

  const section = useArrangementStore
    .getState()
    .arrangement?.sections.find((candidate) => candidate.id === sectionId);
  assert.ok(section);
  const kickClips = section.clips.filter((clip) => clip.trackId === trackId);
  assert.equal(kickClips.length, 1);
  assert.equal(kickClips[0]?.variantId, "variation-a");
  assert.equal(kickClips[0]?.startBar, 2);
});

test("upsertAutomationLanes preserves clip-scoped pattern automation", () => {
  const tracks = createDefaultTracks();
  useArrangementStore.setState({
    arrangement: null,
    selectedSectionId: null,
    absoluteStep: 0,
  });
  useArrangementStore.getState().seedDefaultArrangement(tracks, 140);
  const arrangement = useArrangementStore.getState().arrangement;
  assert.ok(arrangement);

  const sectionId = arrangement.sectionOrder[0] ?? "section-a";
  const bassId = tracks.find((track) => track.type === "bass")?.id ?? "bass";
  useArrangementStore.getState().upsertAutomationLanes(sectionId, [
    {
      id: "ai-bass-call-filter",
      trackId: bassId,
      clipId: "drop-bass-call-1",
      variantId: "bass-call",
      target: "filter.cutoff",
      points: [
        { bar: 0, value: 0.2 },
        { bar: 0.25, value: 0.9 },
        { bar: 99, value: 2 },
      ],
    },
  ]);

  const section = useArrangementStore
    .getState()
    .arrangement?.sections.find((candidate) => candidate.id === sectionId);
  const lane = section?.automationLanes.find((candidate) => candidate.id === "ai-bass-call-filter");
  assert.equal(lane?.clipId, "drop-bass-call-1");
  assert.equal(lane?.variantId, "bass-call");
  assert.equal(lane?.points[2]?.bar, section?.bars);
  assert.equal(lane?.points[2]?.value, 1);
});

test("placePatternClip does not remove clips on other tracks", () => {
  const tracks = createDefaultTracks();
  useArrangementStore.setState({
    arrangement: null,
    selectedSectionId: null,
    absoluteStep: 0,
  });
  useArrangementStore.getState().seedDefaultArrangement(tracks, 140);
  const arrangement = useArrangementStore.getState().arrangement;
  assert.ok(arrangement);
  const sectionId = arrangement.sectionOrder[0] ?? "section-a";
  const kickId = tracks[0]?.id ?? "kick";
  const bassId = tracks.find((track) => track.type === "bass")?.id ?? "bass";

  useArrangementStore.getState().placePatternClip(sectionId, kickId, "base", 0, 1);
  useArrangementStore.getState().placePatternClip(sectionId, bassId, "base", 0, 1);
  useArrangementStore.getState().placePatternClip(sectionId, kickId, "fill", 0, 1);

  const section = useArrangementStore
    .getState()
    .arrangement?.sections.find((candidate) => candidate.id === sectionId);
  assert.ok(section);
  const kickClips = section.clips.filter((c) => c.trackId === kickId);
  const bassClips = section.clips.filter((c) => c.trackId === bassId);
  assert.equal(kickClips.length, 1);
  assert.equal(bassClips.length, 1);
  assert.equal(kickClips[0]?.variantId, "fill");
  assert.equal(bassClips[0]?.variantId, "base");
});
