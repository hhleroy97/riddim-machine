"use client";

import { memo } from "react";

import { useCurrentStepRaf } from "@/hooks/useCurrentStepRaf";
import type { Step, Track } from "@/types";

interface StepSequencerProps {
  tracks: Track[];
  onToggleStep: (trackId: string, stepIndex: number) => void;
  selectedTrackId?: string | null;
  onSelectTrack?: (trackId: string) => void;
  onOpenTrack?: (trackId: string) => void;
}

interface StepCellProps {
  trackId: string;
  trackName: string;
  step: Step;
  stepIndex: number;
  isCurrent: boolean;
  onToggleStep: (trackId: string, stepIndex: number) => void;
}

const StepCell = memo(function StepCell({
  trackId,
  trackName,
  step,
  stepIndex,
  isCurrent,
  onToggleStep,
}: StepCellProps) {
  const className = [
    "h-8 rounded border text-xs transition-colors",
    step.active
      ? "border-lime-400 bg-lime-500/25 text-lime-200"
      : "border-zinc-800 bg-zinc-900 text-zinc-500",
    isCurrent ? "ring-1 ring-blue-400" : "",
  ].join(" ");

  return (
    <button
      type="button"
      onClick={() => onToggleStep(trackId, stepIndex)}
      className={className}
      aria-label={`Toggle ${trackName} step ${stepIndex + 1}`}
    >
      {stepIndex + 1}
    </button>
  );
});

interface StepRowProps {
  track: Track;
  currentStep: number;
  isSelected: boolean;
  onToggleStep: (trackId: string, stepIndex: number) => void;
  onSelectTrack?: (trackId: string) => void;
  onOpenTrack?: (trackId: string) => void;
}

/**
 * Re-renders only when its `track`, `currentStep`, or selection identity changes.
 * Combined with the memoized {@link StepCell}, only the two cells whose `isCurrent`
 * flipped during a transport tick actually reconcile — the other 14 are bailed out
 * by referential equality of `step` plus same `isCurrent` value.
 */
const StepRow = memo(function StepRow({
  track,
  currentStep,
  isSelected,
  onToggleStep,
  onSelectTrack,
  onOpenTrack,
}: StepRowProps) {
  return (
    <div
      className={[
        "grid grid-cols-[160px_repeat(16,minmax(0,1fr))] gap-2 rounded-lg p-1",
        isSelected ? "bg-lime-400/5" : "",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
        <button
          type="button"
          className="truncate text-left hover:text-lime-100"
          onClick={() => onSelectTrack?.(track.id)}
        >
          {track.name}
        </button>
        {onOpenTrack ? (
          <button
            type="button"
            className="rounded bg-zinc-900 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-lime-200"
            onClick={() => onOpenTrack(track.id)}
          >
            synth
          </button>
        ) : null}
      </div>
      {track.steps.map((step, stepIndex) => (
        <StepCell
          key={`${track.id}-${stepIndex}`}
          trackId={track.id}
          trackName={track.name}
          step={step}
          stepIndex={stepIndex}
          isCurrent={stepIndex === currentStep}
          onToggleStep={onToggleStep}
        />
      ))}
    </div>
  );
});

/**
 * Multi-track 16-step sequencer grid.
 *
 * Subscribes to the playhead via {@link useCurrentStepRaf} so transport ticks do **not**
 * propagate render churn into the parent tree. Per-row + per-cell memoization keeps
 * reconciliation cost flat regardless of track count.
 */
export function StepSequencer({
  tracks,
  onToggleStep,
  selectedTrackId,
  onSelectTrack,
  onOpenTrack,
}: StepSequencerProps) {
  const currentStep = useCurrentStepRaf();

  return (
    <section className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      {tracks.map((track) => (
        <StepRow
          key={track.id}
          track={track}
          currentStep={currentStep}
          isSelected={selectedTrackId === track.id}
          onToggleStep={onToggleStep}
          onSelectTrack={onSelectTrack}
          onOpenTrack={onOpenTrack}
        />
      ))}
    </section>
  );
}
