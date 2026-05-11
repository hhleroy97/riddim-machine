"use client";

import { useState } from "react";

import { Knob } from "@/components/studio/Knob";
import type { AIMixCoachResult, Track } from "@/types";

interface MixerProps {
  tracks: Track[];
  loadingMixCoach: boolean;
  mixCoachResult: AIMixCoachResult | null;
  onVolumeChange: (trackId: string, value: number) => void;
  onMuteChange: (trackId: string, value: boolean) => void;
  onSoloChange: (trackId: string, value: boolean) => void;
  onOpenCoach: () => Promise<void>;
}

/**
 * Track level controls and mix coach panel.
 */
export function Mixer({
  tracks,
  loadingMixCoach,
  mixCoachResult,
  onVolumeChange,
  onMuteChange,
  onSoloChange,
  onOpenCoach,
}: MixerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const onCoachClick = async () => {
    await onOpenCoach();
    setDialogOpen(true);
  };

  return (
    <section className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Mixer</h2>
        <button
          type="button"
          className="rounded bg-blue-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-70"
          onClick={() => void onCoachClick()}
          disabled={loadingMixCoach}
        >
          {loadingMixCoach ? "Coach..." : "Coach"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {tracks.map((track) => (
          <article
            key={track.id}
            className="space-y-3 rounded border border-zinc-800 bg-zinc-900/50 p-3"
          >
            <h3 className="text-sm font-medium text-zinc-200">{track.name}</h3>
            <Knob
              label="Vol"
              value={track.volume}
              min={0}
              max={1}
              step={0.01}
              onChange={(value) => onVolumeChange(track.id, value)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                className={`rounded px-2 py-1 text-xs ${track.mute ? "bg-red-500 text-white" : "bg-zinc-800 text-zinc-200"}`}
                onClick={() => onMuteChange(track.id, !track.mute)}
              >
                Mute
              </button>
              <button
                type="button"
                className={`rounded px-2 py-1 text-xs ${track.solo ? "bg-lime-500 text-zinc-950" : "bg-zinc-800 text-zinc-200"}`}
                onClick={() => onSoloChange(track.id, !track.solo)}
              >
                Solo
              </button>
            </div>
          </article>
        ))}
      </div>

      {dialogOpen && mixCoachResult ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded border border-zinc-700 bg-zinc-900 p-4 text-zinc-100">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-300">Mix Coach Suggestions</h3>
              <button
                type="button"
                className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-100"
                onClick={() => setDialogOpen(false)}
              >
                Close
              </button>
            </div>
            <ul className="space-y-1 text-sm">
              {mixCoachResult.suggestions.map((tip) => (
                <li key={tip}>- {tip}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
