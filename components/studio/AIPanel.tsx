"use client";

import { useEffect, useState } from "react";

import type { AIChordResult } from "@/types";

interface AIPanelProps {
  loadingPattern: boolean;
  loadingChord: boolean;
  loadingSongIdea?: boolean;
  chords: AIChordResult | null;
  patternBurstCount: number;
  onGeneratePattern: (prompt: string) => Promise<void>;
  onGenerateChords: (prompt: string) => Promise<void>;
  /** Full arrangement + clips via riddim composer (same as Arrangement workspace). */
  onGenerateSongArrangement?: (prompt: string) => Promise<void>;
  applyDespiteRiddimCritic?: boolean;
  onApplyDespiteRiddimCriticChange?: (value: boolean) => void;
  onApplyChord: (chord: string) => void;
}

/**
 * AI generation: pattern + chord agents, riddim composer (song arrangement).
 */
export function AIPanel({
  loadingPattern,
  loadingChord,
  loadingSongIdea = false,
  chords,
  patternBurstCount,
  onGeneratePattern,
  onGenerateChords,
  onGenerateSongArrangement,
  applyDespiteRiddimCritic = false,
  onApplyDespiteRiddimCriticChange,
  onApplyChord,
}: AIPanelProps) {
  const [prompt, setPrompt] = useState("heavy halftime drop");
  const [showBurst, setShowBurst] = useState(false);

  useEffect(() => {
    if (!patternBurstCount) {
      return;
    }

    const startTimer = window.setTimeout(() => setShowBurst(true), 0);
    const endTimer = window.setTimeout(() => setShowBurst(false), 500);
    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(endTimer);
    };
  }, [patternBurstCount]);

  return (
    <section className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">AI Panel</h2>
      <textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        className="h-20 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
      />
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded bg-purple-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-70"
          onClick={() => void onGeneratePattern(prompt)}
          disabled={loadingPattern}
        >
          {loadingPattern ? "Generating..." : "Generate Pattern"}
        </button>
        <button
          type="button"
          className="rounded bg-fuchsia-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-70"
          onClick={() => void onGenerateChords(prompt)}
          disabled={loadingChord}
        >
          {loadingChord ? "Generating..." : "Suggest Chords"}
        </button>
      </div>

      {onGenerateSongArrangement ? (
        <div className="border-t border-zinc-800 pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Song / arrangement
          </p>
          <p className="mb-2 text-[11px] text-zinc-500">
            Uses the riddim composer to replace the loop timeline with a multi-section arrangement
            (also available under the Arrangement tab).
          </p>
          {onApplyDespiteRiddimCriticChange ? (
            <label className="mb-3 flex cursor-pointer items-start gap-2 text-[11px] text-zinc-400">
              <input
                type="checkbox"
                className="mt-0.5 accent-indigo-500"
                checked={applyDespiteRiddimCritic}
                onChange={(event) => onApplyDespiteRiddimCriticChange(event.target.checked)}
              />
              <span>
                Apply even if critic rejects (testing). Default gate requires pass and score ≥ 0.7.
              </span>
            </label>
          ) : null}
          <button
            type="button"
            className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-70"
            onClick={() => void onGenerateSongArrangement(prompt)}
            disabled={loadingSongIdea}
          >
            {loadingSongIdea ? "Generating song…" : "Generate Song Arrangement"}
          </button>
        </div>
      ) : null}

      {showBurst ? (
        <div className="flex gap-1" aria-hidden>
          {Array.from({ length: 12 }).map((_, index) => (
            <span
              key={`burst-${index}`}
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime-300"
            />
          ))}
        </div>
      ) : null}

      {chords ? (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-zinc-400">Chord Chips</h3>
          <div className="flex flex-wrap gap-2">
            {chords.chords.map((chord) => (
              <button
                key={chord}
                type="button"
                className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-100 hover:bg-zinc-700"
                onClick={() => onApplyChord(chord)}
              >
                {chord}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
