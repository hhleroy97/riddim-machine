"use client";

import type { StudioWorkspace } from "@/stores/uiStore";
import type { Track } from "@/types";

interface TrackRailProps {
  tracks: Track[];
  selectedTrackId: string | null;
  onSelectTrack: (trackId: string) => void;
  onOpenTrack: (trackId: string) => void;
  onSelectWorkspace: (workspace: StudioWorkspace) => void;
}

/**
 * Left-side browser for project tracks, instruments, and clip sources.
 */
export function TrackRail({
  tracks,
  selectedTrackId,
  onSelectTrack,
  onOpenTrack,
  onSelectWorkspace,
}: TrackRailProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
          Project
        </p>
        <h2 className="mt-1 text-lg font-black tracking-tight text-zinc-100">RIDDIM Deck</h2>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Tracks</p>
          <button
            type="button"
            className="rounded bg-zinc-900 px-2 py-1 text-[10px] text-zinc-300"
            onClick={() => onSelectWorkspace("arrangement")}
          >
            lanes
          </button>
        </div>
        {tracks.map((track) => {
          const selected = track.id === selectedTrackId;
          return (
            <div
              key={track.id}
              className={[
                "rounded-lg border p-2 transition-colors",
                selected
                  ? "border-lime-400 bg-lime-400/10"
                  : "border-zinc-800 bg-zinc-900/60",
              ].join(" ")}
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() => onSelectTrack(track.id)}
              >
                <span className="block text-sm font-semibold text-zinc-100">{track.name}</span>
                <span className="block text-[10px] uppercase tracking-wide text-zinc-500">
                  {track.role ?? track.type} · {track.deviceChain.instrumentPluginId}
                </span>
              </button>
              <button
                type="button"
                className="mt-2 w-full rounded bg-zinc-950 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-lime-200 hover:bg-zinc-900"
                onClick={() => onOpenTrack(track.id)}
              >
                Open instrument
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
