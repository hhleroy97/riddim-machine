"use client";

import { ArrangementPanel } from "@/components/studio/ArrangementPanel";
import { ArrangementTimeline } from "@/components/studio/ArrangementTimeline";
import type { ArrangementSection, Track } from "@/types";

interface ArrangementWorkspaceProps {
  sections: ArrangementSection[];
  sectionOrder: string[];
  tracks: Track[];
  selectedSectionId: string | null;
  selectedClipId: string | null;
  onSelectSection: (sectionId: string) => void;
  onSelectClip: (clipId: string) => void;
  onSetSectionBars: (sectionId: string, bars: number) => void;
  onSetSectionChords: (sectionId: string, chords: string[]) => void;
  onDuplicateSection: (sectionId: string) => void;
  onMoveSection: (sectionId: string, direction: "left" | "right") => void;
  onGenerateSectionVariation: (sectionId: string) => void;
  onRegenerateSelectedFromAI: (prompt: string, songIdeaJson: string) => Promise<void>;
  onGenerateAutomation: (prompt: string) => Promise<void>;
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
  onSetAutomationPoint: (
    sectionId: string,
    trackId: string,
    target:
      | "amp.attack"
      | "amp.decay"
      | "amp.sustain"
      | "amp.release"
      | "filter.cutoff"
      | "filter.resonance"
      | "fx.drive"
      | "fx.chorusMix"
      | "fx.stereoWidth",
    bar: number,
    value: number,
  ) => void;
  loadingSongIdea: boolean;
  loadingAutomation: boolean;
}

/**
 * Arrangement workspace with a visual timeline above detailed section controls.
 */
export function ArrangementWorkspace({
  sections,
  sectionOrder,
  tracks,
  selectedSectionId,
  selectedClipId,
  onSelectSection,
  onSelectClip,
  onSetSectionBars,
  onSetSectionChords,
  onDuplicateSection,
  onMoveSection,
  onGenerateSectionVariation,
  onRegenerateSelectedFromAI,
  onGenerateAutomation,
  onPlacePatternClip,
  onAddAsset,
  onSetAutomationPoint,
  loadingSongIdea,
  loadingAutomation,
}: ArrangementWorkspaceProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-lime-300">
          Arrangement
        </p>
        <h2 className="text-2xl font-black tracking-tight text-zinc-100">
          Timeline lanes
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Pattern clips, audio/SFX assets, and automation clips live together by section.
        </p>
      </div>
      <ArrangementTimeline
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
      <ArrangementPanel
        sections={sections}
        sectionOrder={sectionOrder}
        tracks={tracks}
        selectedSectionId={selectedSectionId}
        onSelectSection={onSelectSection}
        onSetSectionBars={onSetSectionBars}
        onSetSectionChords={onSetSectionChords}
        onDuplicateSection={onDuplicateSection}
        onMoveSection={onMoveSection}
        onGenerateSectionVariation={onGenerateSectionVariation}
        onRegenerateSelectedFromAI={onRegenerateSelectedFromAI}
        onGenerateAutomation={onGenerateAutomation}
        onSetAutomationPoint={onSetAutomationPoint}
        loadingSongIdea={loadingSongIdea}
        loadingAutomation={loadingAutomation}
      />
    </div>
  );
}
