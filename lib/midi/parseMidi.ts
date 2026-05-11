import { makeDefaultBassPatch, makeDefaultDeviceChain } from "@/lib/audio/patches";
import { Midi } from "@tonejs/midi";

import type { Step, Track } from "@/types";

const DEFAULT_STEP_COUNT = 16;

function emptyStep(note: string): Step {
  return { active: false, note, velocity: 0.7 };
}

/**
 * Converts MIDI bytes into sequencer tracks and optional bpm.
 */
export function parseMidiToTracks(data: ArrayBuffer): { tracks: Track[]; bpm: number | null } {
  const midi = new Midi(data);
  const bpm = midi.header.tempos[0]?.bpm ?? null;

  const tracks = midi.tracks
    .filter((track) => track.notes.length > 0)
    .map((track, trackIndex) => {
      const steps = Array.from({ length: DEFAULT_STEP_COUNT }, () => emptyStep("C2"));
      track.notes.forEach((note) => {
        const slot = Math.floor((note.ticks / Math.max(1, midi.durationTicks)) * DEFAULT_STEP_COUNT);
        const index = Math.max(0, Math.min(DEFAULT_STEP_COUNT - 1, slot));
        steps[index] = {
          active: true,
          note: note.name,
          velocity: note.velocity,
        };
      });

      return {
        id: `midi-track-${trackIndex + 1}`,
        name: track.name || `MIDI Track ${trackIndex + 1}`,
        type: track.instrument.family === "drums" ? ("drum" as const) : ("bass" as const),
        mute: false,
        solo: false,
        volume: 0.8,
        deviceChain:
          track.instrument.family === "drums"
            ? makeDefaultDeviceChain("sampler-drum-rack")
            : makeDefaultDeviceChain("subtractive-bass"),
        synthPatch: track.instrument.family === "drums" ? null : makeDefaultBassPatch(),
        steps,
      };
    });

  return { tracks, bpm };
}
