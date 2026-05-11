"use client";

interface TransportControlsProps {
  bpm: number;
  isPlaying: boolean;
  onBpmChange: (value: number) => void;
  onPlay: () => Promise<void>;
  onStop: () => void;
}

/**
 * Transport controls for playback and tempo.
 */
export function TransportControls({
  bpm,
  isPlaying,
  onBpmChange,
  onPlay,
  onStop,
}: TransportControlsProps) {
  return (
    <section className="flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <button
        type="button"
        className="rounded bg-lime-400 px-3 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-70"
        onClick={() => void onPlay()}
        disabled={isPlaying}
      >
        Play
      </button>
      <button
        type="button"
        className="rounded bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-100 disabled:opacity-70"
        onClick={onStop}
        disabled={!isPlaying}
      >
        Stop
      </button>
      <label className="flex items-center gap-2 text-sm text-zinc-300">
        BPM
        <input
          className="w-20 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100"
          type="number"
          min={60}
          max={200}
          value={bpm}
          onChange={(event) => onBpmChange(Number(event.target.value))}
        />
      </label>
    </section>
  );
}
