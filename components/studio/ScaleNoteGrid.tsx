"use client";

import { memo } from "react";

import { useCurrentStepRaf } from "@/hooks/useCurrentStepRaf";
import type { Step, Track } from "@/types";

interface ScaleNoteGridProps {
  tracks: Track[];
  scaleNotes: string[];
  selectedTrackId: string | null;
  onSelectTrack: (trackId: string) => void;
  onSetStep: (trackId: string, stepIndex: number, note: string) => void;
  onOpenTrack: (trackId: string) => void;
}

interface ScaleHeaderCellProps {
  stepIndex: number;
  isCurrent: boolean;
}

const ScaleHeaderCell = memo(function ScaleHeaderCell({
  stepIndex,
  isCurrent,
}: ScaleHeaderCellProps) {
  return (
    <div
      className={[
        "rounded py-1 text-center text-[10px]",
        isCurrent ? "bg-blue-400/20 text-blue-100" : "bg-zinc-900 text-zinc-600",
      ].join(" ")}
    >
      {stepIndex + 1}
    </div>
  );
});

interface ScaleNoteCellProps {
  trackId: string;
  trackName: string;
  step: Step;
  stepIndex: number;
  note: string;
  onSetStep: (trackId: string, stepIndex: number, note: string) => void;
}

const ScaleNoteCell = memo(function ScaleNoteCell({
  trackId,
  trackName,
  step,
  stepIndex,
  note,
  onSetStep,
}: ScaleNoteCellProps) {
  const active = step.active && (step.note === note || step.notes?.includes(note) === true);
  return (
    <button
      type="button"
      className={[
        "h-6 rounded border text-[9px] transition-colors",
        active
          ? "border-lime-300 bg-lime-400/30 text-lime-100"
          : "border-zinc-800 bg-zinc-900/80 text-transparent hover:border-zinc-700",
      ].join(" ")}
      onClick={() => onSetStep(trackId, stepIndex, note)}
      aria-label={`Set ${trackName} step ${stepIndex + 1} to ${note}`}
    >
      {active ? "●" : note}
    </button>
  );
});

interface ScaleTrackSectionProps {
  track: Track;
  scaleNotes: string[];
  isSelected: boolean;
  currentStep: number;
  onSelectTrack: (trackId: string) => void;
  onSetStep: (trackId: string, stepIndex: number, note: string) => void;
  onOpenTrack: (trackId: string) => void;
}

/**
 * Re-renders only when `track` (steps), `scaleNotes`, `isSelected`, or `currentStep` change.
 * Per-cell {@link ScaleNoteCell} memoization keeps reconciliation cost proportional to the
 * number of cells whose props actually changed (typically: 2 header cells per playhead tick).
 */
const ScaleTrackSection = memo(function ScaleTrackSection({
  track,
  scaleNotes,
  isSelected,
  currentStep,
  onSelectTrack,
  onSetStep,
  onOpenTrack,
}: ScaleTrackSectionProps) {
  return (
    <section
      className={[
        "rounded-xl border bg-zinc-950 p-3",
        isSelected ? "border-lime-400" : "border-zinc-800",
      ].join(" ")}
    >
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          className="text-left text-sm font-bold text-zinc-100"
          onClick={() => onSelectTrack(track.id)}
        >
          {track.name}
          <span className="ml-2 text-[10px] uppercase tracking-wide text-zinc-500">
            {track.role ?? track.type}
          </span>
        </button>
        <button
          type="button"
          className="rounded bg-zinc-800 px-2 py-1 text-xs text-lime-100"
          onClick={() => onOpenTrack(track.id)}
        >
          synth
        </button>
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[820px] grid-cols-[64px_repeat(16,minmax(0,1fr))] gap-1">
          <div />
          {track.steps.map((_, stepIndex) => (
            <ScaleHeaderCell
              key={`${track.id}-header-${stepIndex}`}
              stepIndex={stepIndex}
              isCurrent={stepIndex === currentStep}
            />
          ))}
          {scaleNotes.map((note) => (
            <div key={`${track.id}-${note}`} className="contents">
              <div
                className="rounded bg-zinc-900 px-2 py-1 text-right text-[10px] font-semibold text-zinc-400"
              >
                {note}
              </div>
              {track.steps.map((step, stepIndex) => (
                <ScaleNoteCell
                  key={`${track.id}-${note}-${stepIndex}`}
                  trackId={track.id}
                  trackName={track.name}
                  step={step}
                  stepIndex={stepIndex}
                  note={note}
                  onSetStep={onSetStep}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

/**
 * Scale-constrained piano-roll grid for bass, lead, and harmony tracks.
 *
 * Subscribes to the playhead via {@link useCurrentStepRaf} so transport ticks do **not**
 * cause the parent tree to reconcile this grid's ~1k buttons every 16th note.
 */
export function ScaleNoteGrid({
  tracks,
  scaleNotes,
  selectedTrackId,
  onSelectTrack,
  onSetStep,
  onOpenTrack,
}: ScaleNoteGridProps) {
  const currentStep = useCurrentStepRaf();

  if (tracks.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-500">
        No melodic tracks are available for scale editing.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tracks.map((track) => (
        <ScaleTrackSection
          key={track.id}
          track={track}
          scaleNotes={scaleNotes}
          isSelected={track.id === selectedTrackId}
          currentStep={currentStep}
          onSelectTrack={onSelectTrack}
          onSetStep={onSetStep}
          onOpenTrack={onOpenTrack}
        />
      ))}
    </div>
  );
}
