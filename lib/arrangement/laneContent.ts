import type { ArrangementAssetClip, ArrangementClip, ArrangementSection } from "@/types";

/**
 * Finds the arrangement pattern clip occupying a lane cell (track row × bar column).
 */
export function patternClipAtBar(
  section: ArrangementSection,
  trackId: string,
  barIndex: number,
): ArrangementClip | undefined {
  return section.clips.find(
    (clip) =>
      clip.trackId === trackId &&
      barIndex >= clip.startBar &&
      barIndex < clip.startBar + clip.bars,
  );
}

/**
 * External assets overlapping a lane cell for the given track row.
 */
export function assetClipsAtBar(
  section: ArrangementSection,
  trackId: string,
  barIndex: number,
): ArrangementAssetClip[] {
  return section.assets.filter((asset) => {
    const rowMatch = asset.trackId === undefined || asset.trackId === trackId;
    const barOverlap =
      barIndex >= asset.startBar && barIndex < asset.startBar + asset.bars;
    return rowMatch && barOverlap;
  });
}
