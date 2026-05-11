import { buildChordProgression } from "@/lib/riddim/theory";
import type { CompositionPlan, InstrumentPluginId, SongIdea, Track } from "@/types";

function makeSectionMarkers(
  sections: SongIdea["arrangement"]["sections"],
): Array<{ sectionId: string; startBar: number; endBar: number }> {
  return sections.reduce<Array<{ sectionId: string; startBar: number; endBar: number }>>((acc, section) => {
    const startBar = acc.length === 0 ? 0 : acc[acc.length - 1]!.endBar;
    acc.push({ sectionId: section.id, startBar, endBar: startBar + section.bars });
    return acc;
  }, []);
}

/**
 * Convert a validated composition plan into the app-facing SongIdea scaffold.
 */
export function compositionPlanToSongIdea(
  compositionPlan: CompositionPlan,
  tracks: Array<Pick<Track, "id" | "name" | "role" | "type"> & { deviceChain?: { instrumentPluginId: string } }>,
  bpm: number,
): SongIdea {
  const chordProgression = buildChordProgression(compositionPlan.harmonicPlan);
  const sections = compositionPlan.arrangementIntent.sections.map((intent) => ({
    id: intent.id,
    name: intent.name,
    bars: intent.bars,
    clips: [],
    assets: [],
    automationLanes: [],
    chordProgression,
    locked: false,
  }));
  const sectionOrder = sections.map((section) => section.id);
  return {
    title: compositionPlan.title,
    mood: compositionPlan.mood,
    arrangement: {
      id: `riddim-composer-${Date.now()}`,
      bpm,
      totalBars: sections.reduce((acc, section) => acc + section.bars, 0),
      sectionOrder,
      sections,
      scenes: [{ id: "scene-riddim-composer", name: "Riddim Composer", sectionIds: sectionOrder }],
    },
    recommendedTracks: tracks.map((track) => {
      const intent = compositionPlan.instrumentIntents.find(
        (candidate) => candidate.trackId === track.id || candidate.role === track.role,
      );
      return {
        name: track.name,
        role: track.role ?? (track.type === "drum" ? "rhythm" : "bass"),
        instrumentPluginId:
          intent?.instrumentPluginId ??
          (track.deviceChain?.instrumentPluginId as InstrumentPluginId | undefined) ??
          (track.type === "drum" ? "sampler-drum-rack" : "subtractive-bass"),
        ...(intent?.instrumentPresetId ? { instrumentPresetId: intent.instrumentPresetId } : {}),
      };
    }),
    renderPlan: {
      stemMap: tracks.map((track) => ({
        trackId: track.id,
        stemName: `${track.name.toLowerCase().replace(/\s+/g, "-")}.wav`,
      })),
      sectionMarkers: makeSectionMarkers(sections),
      tempoMap: [{ bar: 0, bpm }],
    },
  };
}
