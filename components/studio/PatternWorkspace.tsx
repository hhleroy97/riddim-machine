"use client";

import { useMemo, useState } from "react";

import { ScaleEditor } from "@/components/studio/ScaleEditor";
import { ScaleNoteGrid } from "@/components/studio/ScaleNoteGrid";
import { StepSequencer } from "@/components/studio/StepSequencer";
import {
  buildScaleNotes,
  type ChromaticNote,
  type ScaleName,
} from "@/lib/music/scale";
import { resolveStepNotes } from "@/lib/music/stepNotes";
import type { Step, Track } from "@/types";

interface PatternWorkspaceProps {
  tracks: Track[];
  selectedTrackId: string | null;
  onToggleStep: (trackId: string, stepIndex: number) => void;
  onSetTrackStep: (trackId: string, stepIndex: number, step: Step) => void;
  onSetTrackStepVelocity: (trackId: string, stepIndex: number, velocity: number) => void;
  onSelectTrack: (trackId: string) => void;
  onOpenTrack: (trackId: string) => void;
}

/**
 * Pattern editor with drum steps and scale-constrained melodic programming.
 */
export function PatternWorkspace({
  tracks,
  selectedTrackId,
  onToggleStep,
  onSetTrackStep,
  onSetTrackStepVelocity,
  onSelectTrack,
  onOpenTrack,
}: PatternWorkspaceProps) {
  const [root, setRoot] = useState<ChromaticNote>("F");
  const [scale, setScale] = useState<ScaleName>("minor");
  const [minOctave, setMinOctave] = useState(1);
  const [maxOctave, setMaxOctave] = useState(3);

  const drumTracks = tracks.filter((track) => track.type === "drum");
  const melodicTracks = tracks.filter((track) => track.type !== "drum");
  const scaleNotes = useMemo(
    () => buildScaleNotes({ root, scale, minOctave, maxOctave }),
    [maxOctave, minOctave, root, scale],
  );

  const setMelodicStep = (trackId: string, stepIndex: number, note: string): void => {
    const track = tracks.find((candidate) => candidate.id === trackId);
    const current = track?.steps[stepIndex];
    if (!current) {
      return;
    }

    const chordTrack =
      track.role === "harmony" || track.id.includes("chord") || track.id === "chords";

    if (chordTrack) {
      const selected = resolveStepNotes(current).filter(Boolean);
      const has = selected.includes(note);
      const next =
        selected.length === 0
          ? [note]
          : has
            ? selected.filter((entry) => entry !== note)
            : [...selected, note];
      const nextActive = next.length > 0;
      onSetTrackStep(trackId, stepIndex, {
        ...current,
        active: nextActive,
        note: next[0] ?? note,
        notes: next.length >= 2 ? next : undefined,
        velocity: current.velocity || 0.72,
      });
      return;
    }

    const active = !(current.active && current.note === note);
    onSetTrackStep(trackId, stepIndex, {
      ...current,
      active,
      note,
      notes: undefined,
      velocity: current.velocity || 0.72,
    });
  };

  const selectedTrack = tracks.find((track) => track.id === selectedTrackId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-lime-300">
            Pattern
          </p>
          <h2 className="text-2xl font-black tracking-tight text-zinc-100">
            Beat grid + scale editor
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Program drums on fixed steps, then write bass/lead notes inside the selected key.
          </p>
        </div>
        {selectedTrack ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400">
            Focus: <span className="font-semibold text-zinc-100">{selectedTrack.name}</span>
          </div>
        ) : null}
      </div>

      <ScaleEditor
        root={root}
        scale={scale}
        minOctave={minOctave}
        maxOctave={maxOctave}
        onRootChange={setRoot}
        onScaleChange={setScale}
        onMinOctaveChange={setMinOctave}
        onMaxOctaveChange={setMaxOctave}
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-400">Drums</h3>
          <p className="text-[10px] text-zinc-600">16-step rhythm lanes</p>
        </div>
        <StepSequencer
          tracks={drumTracks}
          onToggleStep={onToggleStep}
          selectedTrackId={selectedTrackId}
          onSelectTrack={onSelectTrack}
          onOpenTrack={onOpenTrack}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-400">
            Scale Notes
          </h3>
          <p className="text-[10px] text-zinc-600">Click a note cell to set pitch</p>
        </div>
        <ScaleNoteGrid
          tracks={melodicTracks}
          scaleNotes={scaleNotes}
          selectedTrackId={selectedTrackId}
          onSelectTrack={onSelectTrack}
          onSetStep={setMelodicStep}
          onOpenTrack={onOpenTrack}
        />
      </div>

      {selectedTrack ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
          <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-400">
            Velocity Strip
          </h3>
          <div className="mt-2 grid grid-cols-[repeat(16,minmax(0,1fr))] gap-1">
            {selectedTrack.steps.map((step, stepIndex) => (
              <input
                key={`${selectedTrack.id}-velocity-${stepIndex}`}
                aria-label={`Set ${selectedTrack.name} step ${stepIndex + 1} velocity`}
                className="h-16 w-full accent-lime-400"
                max={1}
                min={0}
                step={0.01}
                type="range"
                value={step.velocity}
                onChange={(event) =>
                  onSetTrackStepVelocity(selectedTrack.id, stepIndex, Number(event.target.value))
                }
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
