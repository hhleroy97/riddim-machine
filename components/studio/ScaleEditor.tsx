"use client";

import type { ChromaticNote, ScaleName } from "@/lib/music/scale";
import { CHROMATIC_NOTES } from "@/lib/music/scale";

interface ScaleEditorProps {
  root: ChromaticNote;
  scale: ScaleName;
  minOctave: number;
  maxOctave: number;
  onRootChange: (root: ChromaticNote) => void;
  onScaleChange: (scale: ScaleName) => void;
  onMinOctaveChange: (octave: number) => void;
  onMaxOctaveChange: (octave: number) => void;
}

const SCALES: ScaleName[] = ["minor", "major", "phrygian", "dorian", "harmonic-minor"];

/**
 * Key and scale controls for melodic pattern editing.
 */
export function ScaleEditor({
  root,
  scale,
  minOctave,
  maxOctave,
  onRootChange,
  onScaleChange,
  onMinOctaveChange,
  onMaxOctaveChange,
}: ScaleEditorProps) {
  return (
    <div className="grid gap-2 rounded-xl border border-zinc-800 bg-zinc-950/80 p-3 sm:grid-cols-4">
      <label className="space-y-1 text-xs text-zinc-400">
        <span>Key</span>
        <select
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100"
          value={root}
          onChange={(event) => onRootChange(event.target.value as ChromaticNote)}
        >
          {CHROMATIC_NOTES.map((note) => (
            <option key={note} value={note}>
              {note}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-xs text-zinc-400">
        <span>Scale</span>
        <select
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100"
          value={scale}
          onChange={(event) => onScaleChange(event.target.value as ScaleName)}
        >
          {SCALES.map((scaleName) => (
            <option key={scaleName} value={scaleName}>
              {scaleName}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-xs text-zinc-400">
        <span>Low Octave</span>
        <input
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100"
          max={6}
          min={0}
          type="number"
          value={minOctave}
          onChange={(event) => onMinOctaveChange(Number(event.target.value))}
        />
      </label>
      <label className="space-y-1 text-xs text-zinc-400">
        <span>High Octave</span>
        <input
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100"
          max={7}
          min={1}
          type="number"
          value={maxOctave}
          onChange={(event) => onMaxOctaveChange(Number(event.target.value))}
        />
      </label>
    </div>
  );
}
