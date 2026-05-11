"use client";

import { ArrangementGrid } from "@/components/studio/ArrangementGrid";
import type { ArrangementSection, Track } from "@/types";

interface ArrangementTimelineProps {
  sections: ArrangementSection[];
  sectionOrder: string[];
  tracks: Track[];
  selectedSectionId: string | null;
  selectedClipId: string | null;
  onSelectSection: (sectionId: string) => void;
  onSelectClip: (clipId: string) => void;
  onPlacePatternClip: (
    sectionId: string,
    trackId: string,
    variantId: string,
    startBar: number,
    bars: number,
  ) => void;
  onAddAsset: (
    sectionId: string,
    asset: {
      kind: "audio" | "midi";
      label: string;
      startBar: number;
      bars: number;
      trackId?: string;
    },
  ) => void;
}

/**
 * DAW-style timeline lanes for pattern clips, automation clips, and audio assets.
 */
export function ArrangementTimeline({
  sections,
  sectionOrder,
  tracks,
  selectedSectionId,
  selectedClipId,
  onSelectSection,
  onSelectClip,
  onPlacePatternClip,
  onAddAsset,
}: ArrangementTimelineProps) {
  if (sections.length === 0) {
    return null;
  }

  return (
    <ArrangementGrid
      sections={sections}
      sectionOrder={sectionOrder}
      tracks={tracks}
      selectedSectionId={selectedSectionId}
      selectedClipId={selectedClipId}
      onSelectSection={onSelectSection}
      onSelectClip={onSelectClip}
      onPlacePatternClip={onPlacePatternClip}
      onAddAsset={onAddAsset}
    />
  );
}
