"use client";

import { useMemo } from "react";

import { summarizeAutomationLaneValues } from "@/lib/studio/automationDisplay";
import type { ArrangementSection, Track } from "@/types";

interface InspectorPanelProps {
  tracks: Track[];
  sections: ArrangementSection[];
  selectedTrackId: string | null;
  selectedClipId: string | null;
}

/**
 * Compact bottom inspector for selected track or arrangement clip context.
 */
export function InspectorPanel({
  tracks,
  sections,
  selectedTrackId,
  selectedClipId,
}: InspectorPanelProps) {
  const selectedTrack = tracks.find((track) => track.id === selectedTrackId);
  const flatClips = useMemo(() => {
    return sections.flatMap((section) => [
      ...section.clips.map((clip) => ({
        id: clip.id,
        type: "pattern" as const,
        label: `${clip.trackId}/${clip.variantId}`,
        valueReadout: null as string | null,
      })),
      ...section.assets.map((asset) => ({
        id: asset.id,
        type: asset.kind,
        label: asset.label,
        valueReadout: null as string | null,
      })),
      ...section.automationLanes.map((lane) => ({
        id: lane.id,
        type: "automation" as const,
        label: `${lane.trackId}/${lane.target}`,
        valueReadout: summarizeAutomationLaneValues(lane),
      })),
    ]);
  }, [sections]);

  const selectedClip = flatClips.find((clip) => clip.id === selectedClipId);

  return (
    <div className="grid gap-3 text-xs text-zinc-400 md:grid-cols-3">
      <div>
        <p className="font-bold uppercase tracking-wide text-zinc-500">Track Focus</p>
        <p className="mt-1 text-zinc-100">
          {selectedTrack ? selectedTrack.name : "No track selected"}
        </p>
      </div>
      <div>
        <p className="font-bold uppercase tracking-wide text-zinc-500">Clip Focus</p>
        <p className="mt-1 text-zinc-100">
          {selectedClip ? `${selectedClip.type}: ${selectedClip.label}` : "No clip selected"}
        </p>
        {selectedClip?.valueReadout ? (
          <p className="mt-1 font-mono text-[11px] tabular-nums text-lime-200">
            {selectedClip.valueReadout}
          </p>
        ) : null}
      </div>
      <div>
        <p className="font-bold uppercase tracking-wide text-zinc-500">Hint</p>
        <p className="mt-1">
          Click track names to focus, or use <span className="text-lime-200">Open instrument</span>{" "}
          to jump into sound design.
        </p>
      </div>
    </div>
  );
}
