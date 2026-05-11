import type {
  ArrangementSection,
  Loop,
  RenderPlan,
  SongArrangement,
  Track
} from "@/types";

const DEFAULT_SECTION_BARS = 4;

/**
 * Creates a baseline single-section arrangement from current tracks.
 */
export function makeDefaultArrangement(tracks: Track[], bpm: number): SongArrangement {
  void tracks;
  const section: ArrangementSection = {
    id: "section-a",
    name: "Section A",
    bars: DEFAULT_SECTION_BARS,
    clips: [],
    assets: [],
    automationLanes: [],
    chordProgression: [{ chord: "Fm", bars: 4 }],
    locked: false,
  };

  return {
    id: "arrangement-default",
    bpm,
    totalBars: DEFAULT_SECTION_BARS,
    sectionOrder: [section.id],
    sections: [section],
    scenes: [{ id: "scene-1", name: "Scene 1", sectionIds: [section.id] }],
  };
}

/**
 * Creates render plan metadata from arrangement.
 */
export function makeRenderPlan(
  arrangement: SongArrangement,
  tracks: Track[],
): RenderPlan {
  let cursor = 0;
  const markers = arrangement.sectionOrder
    .map((sectionId) => arrangement.sections.find((section) => section.id === sectionId))
    .filter((section): section is ArrangementSection => Boolean(section))
    .map((section) => {
      const marker = {
        sectionId: section.id,
        startBar: cursor,
        endBar: cursor + section.bars,
      };
      cursor += section.bars;
      return marker;
    });

  return {
    stemMap: tracks.map((track) => ({
      trackId: track.id,
      stemName: `${track.name.toLowerCase().replace(/\s+/g, "-")}.wav`,
    })),
    sectionMarkers: markers,
    tempoMap: [{ bar: 0, bpm: arrangement.bpm }],
  };
}

/**
 * Ensures a loop has arrangement and render metadata.
 */
export function normalizeLoopArrangement(loop: Loop): Loop {
  const arrangement = loop.arrangement ?? makeDefaultArrangement(loop.tracks, loop.bpm);
  const normalizedArrangement: SongArrangement = {
    ...arrangement,
    sections: arrangement.sections.map((section) => ({
      ...section,
      assets: section.assets ?? [],
      automationLanes: section.automationLanes ?? [],
    })),
  };
  const renderPlan = loop.renderPlan ?? makeRenderPlan(normalizedArrangement, loop.tracks);
  return {
    ...loop,
    arrangement: normalizedArrangement,
    renderPlan,
  };
}
