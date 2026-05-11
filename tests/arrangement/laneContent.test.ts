import assert from "node:assert/strict";
import test from "node:test";

import { assetClipsAtBar, patternClipAtBar } from "../../lib/arrangement/laneContent";
import type { ArrangementClip, ArrangementSection, ArrangementAssetClip } from "../../types";

function sectionWith(
  overrides: Partial<ArrangementSection> & Pick<ArrangementSection, "id" | "name" | "bars">,
): ArrangementSection {
  return {
    id: overrides.id,
    name: overrides.name,
    bars: overrides.bars,
    clips: overrides.clips ?? [],
    assets: overrides.assets ?? [],
    automationLanes: overrides.automationLanes ?? [],
    chordProgression: overrides.chordProgression ?? [{ chord: "Fm", bars: 1 }],
    locked: overrides.locked ?? false,
  };
}

test("patternClipAtBar returns clip spanning bar column", () => {
  const clip: ArrangementClip = {
    id: "c1",
    trackId: "kick",
    variantId: "base",
    startBar: 2,
    bars: 2,
    muted: false,
  };
  const section = sectionWith({
    id: "s",
    name: "A",
    bars: 8,
    clips: [clip],
  });

  assert.equal(patternClipAtBar(section, "kick", 1), undefined);
  assert.equal(patternClipAtBar(section, "kick", 2)?.variantId, "base");
  assert.equal(patternClipAtBar(section, "kick", 3)?.variantId, "base");
  assert.equal(patternClipAtBar(section, "kick", 4), undefined);
});

test("assetClipsAtBar respects row and bar span", () => {
  const asset: ArrangementAssetClip = {
    id: "a1",
    kind: "midi",
    label: "loop.mid",
    startBar: 0,
    bars: 1,
    trackId: "kick",
  };
  const section = sectionWith({ id: "s", name: "A", bars: 8, assets: [asset] });

  assert.equal(assetClipsAtBar(section, "kick", 0).length, 1);
  assert.equal(assetClipsAtBar(section, "snare", 0).length, 0);
});
