"use client";

import type { Loop } from "@/types";

interface LoopLibraryProps {
  loops: Loop[];
  onSave: () => void;
  onLoad: (loop: Loop) => void;
  onDelete: (id: string) => void;
}

/**
 * Save/load management for persisted loops.
 */
export function LoopLibrary({ loops, onSave, onLoad, onDelete }: LoopLibraryProps) {
  return (
    <section className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Loop Library</h2>
        <button
          type="button"
          className="rounded bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-100"
          onClick={onSave}
        >
          Save Current Loop
        </button>
      </div>

      <div className="space-y-2">
        {loops.length === 0 ? (
          <p className="text-xs text-zinc-500">No saved loops yet.</p>
        ) : (
          loops.map((loop) => (
            <article
              key={loop.id}
              className="flex items-center justify-between rounded border border-zinc-800 px-3 py-2"
            >
              <div>
                <p className="text-sm text-zinc-100">{loop.name}</p>
                <p className="text-xs text-zinc-500">{loop.bpm} BPM</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded bg-lime-500 px-2 py-1 text-xs font-semibold text-zinc-950"
                  onClick={() => onLoad(loop)}
                >
                  Load
                </button>
                <button
                  type="button"
                  className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white"
                  onClick={() => onDelete(loop.id)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
