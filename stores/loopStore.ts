import { create } from "zustand";
import { persist } from "zustand/middleware";

import { normalizeLoopArrangement } from "@/lib/arrangement/defaults";
import type { RenderPlan, SongArrangement, Loop, Track } from "@/types";

interface LoopStoreState {
  savedLoops: Loop[];
  saveLoop: (
    name: string,
    bpm: number,
    tracks: Track[],
    arrangement?: SongArrangement,
    renderPlan?: RenderPlan,
  ) => void;
  deleteLoop: (id: string) => void;
}

/**
 * Owns persisted loop snapshots only.
 */
export const useLoopStore = create<LoopStoreState>()(
  persist(
    (set) => ({
      savedLoops: [],
      saveLoop: (name, bpm, tracks, arrangement, renderPlan) =>
        set((state) => ({
          savedLoops: [
            ...state.savedLoops,
            normalizeLoopArrangement({
              id: crypto.randomUUID(),
              name,
              bpm,
              tracks,
              arrangement,
              renderPlan,
              createdAt: new Date().toISOString(),
            }),
          ],
        })),
      deleteLoop: (id) =>
        set((state) => ({
          savedLoops: state.savedLoops.filter((loop) => loop.id !== id),
        })),
    }),
    {
      name: "riddim-loop-store",
      merge: (persisted, current) => {
        const persistedState = persisted as LoopStoreState | undefined;
        if (!persistedState) {
          return current;
        }

        return {
          ...current,
          ...persistedState,
          savedLoops: (persistedState.savedLoops ?? []).map((loop) =>
            normalizeLoopArrangement(loop),
          ),
        };
      },
    },
  ),
);
