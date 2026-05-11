import { create } from "zustand";

import { makeDefaultArrangement } from "@/lib/arrangement/defaults";
import {
  buildSectionTrackView,
  computeArrangementTotalBars,
  mapArrangementStep,
} from "@/lib/arrangement/timeline";
import type {
  ArrangementClip,
  ArrangementAssetClip,
  AutomationLane,
  ChordEvent,
  SongArrangement,
  Track,
} from "@/types";

/**
 * Whether two bar ranges intersect (half-open style: start inclusive, start+bars exclusive).
 */
function clipsBarRangesOverlap(a: ArrangementClip, startBar: number, bars: number): boolean {
  const aEnd = a.startBar + a.bars;
  const bEnd = startBar + bars;
  return !(bEnd <= a.startBar || startBar >= aEnd);
}

function automationLaneKey(lane: Pick<AutomationLane, "trackId" | "target" | "clipId" | "variantId">): string {
  return [lane.trackId, lane.target, lane.clipId ?? "", lane.variantId ?? ""].join(":");
}

function normalizeAutomationLane(lane: AutomationLane, sectionBars: number): AutomationLane {
  const safeBars = Math.max(1, sectionBars);
  const points = lane.points
    .map((point) => ({
      bar: Math.max(0, Math.min(safeBars, point.bar)),
      value: Math.max(0, Math.min(1, point.value)),
    }))
    .sort((a, b) => a.bar - b.bar);

  return {
    ...lane,
    id: lane.id || `${automationLaneKey(lane)}-${crypto.randomUUID().slice(0, 6)}`,
    points,
  };
}

interface ArrangementStoreState {
  arrangement: SongArrangement | null;
  selectedSectionId: string | null;
  absoluteStep: number;
  setArrangement: (arrangement: SongArrangement) => void;
  seedDefaultArrangement: (tracks: Track[], bpm: number) => void;
  setSelectedSection: (sectionId: string) => void;
  setSectionBars: (sectionId: string, bars: number) => void;
  setSectionChords: (sectionId: string, chords: ChordEvent[]) => void;
  duplicateSection: (sectionId: string) => void;
  moveSection: (sectionId: string, direction: "left" | "right") => void;
  placePatternClip: (
    sectionId: string,
    trackId: string,
    variantId: string,
    startBar: number,
    bars: number,
  ) => void;
  addSectionAsset: (
    sectionId: string,
    asset: Omit<ArrangementAssetClip, "id">,
  ) => void;
  setAutomationPoint: (
    sectionId: string,
    lane: Omit<AutomationLane, "id" | "points">,
    bar: number,
    value: number,
  ) => void;
  upsertAutomationLanes: (sectionId: string, lanes: AutomationLane[]) => void;
  setAbsoluteStep: (step: number) => void;
  addAbsoluteSteps: (steps: number) => void;
  advanceAbsoluteStep: () => void;
  resolveCurrentSection: () => string | null;
  buildPlaybackTracks: (tracks: Track[]) => Track[];
}

/**
 * Owns song arrangement timeline and section-level editing state.
 */
export const useArrangementStore = create<ArrangementStoreState>((set, get) => ({
  arrangement: null,
  selectedSectionId: null,
  absoluteStep: 0,
  setArrangement: (arrangement) =>
    set({
      arrangement: {
        ...arrangement,
        totalBars: computeArrangementTotalBars(arrangement),
      },
      selectedSectionId: arrangement.sectionOrder[0] ?? null,
    }),
  seedDefaultArrangement: (tracks, bpm) => {
    const arrangement = makeDefaultArrangement(tracks, bpm);
    set({ arrangement, selectedSectionId: arrangement.sectionOrder[0] ?? null });
  },
  setSelectedSection: (sectionId) =>
    set((state) =>
      state.selectedSectionId === sectionId ? state : { selectedSectionId: sectionId },
    ),
  setSectionBars: (sectionId, bars) =>
    set((state) => {
      if (!state.arrangement) {
        return state;
      }
      const arrangement = {
        ...state.arrangement,
        sections: state.arrangement.sections.map((section) =>
          section.id === sectionId ? { ...section, bars: Math.max(1, bars) } : section,
        ),
      };
      return {
        arrangement: {
          ...arrangement,
          totalBars: computeArrangementTotalBars(arrangement),
        },
      };
    }),
  setSectionChords: (sectionId, chords) =>
    set((state) => {
      if (!state.arrangement) {
        return state;
      }
      return {
        arrangement: {
          ...state.arrangement,
          sections: state.arrangement.sections.map((section) =>
            section.id === sectionId ? { ...section, chordProgression: chords } : section,
          ),
        },
      };
    }),
  duplicateSection: (sectionId) =>
    set((state) => {
      if (!state.arrangement) {
        return state;
      }
      const source = state.arrangement.sections.find((section) => section.id === sectionId);
      if (!source) {
        return state;
      }
      const duplicateId = `${source.id}-copy-${crypto.randomUUID().slice(0, 6)}`;
      const duplicate = {
        ...structuredClone(source),
        id: duplicateId,
        name: `${source.name} Copy`,
        clips: source.clips.map((clip) => ({
          ...structuredClone(clip),
          id: `${duplicateId}-${clip.trackId}-clip`,
        })),
      };
      const arrangement = {
        ...state.arrangement,
        sections: [...state.arrangement.sections, duplicate],
        sectionOrder: [...state.arrangement.sectionOrder, duplicate.id],
      };
      return {
        arrangement: {
          ...arrangement,
          totalBars: computeArrangementTotalBars(arrangement),
        },
      };
    }),
  moveSection: (sectionId, direction) =>
    set((state) => {
      if (!state.arrangement) {
        return state;
      }
      const order = [...state.arrangement.sectionOrder];
      const index = order.indexOf(sectionId);
      if (index < 0) {
        return state;
      }
      const target = direction === "left" ? index - 1 : index + 1;
      if (target < 0 || target >= order.length) {
        return state;
      }
      const [item] = order.splice(index, 1);
      order.splice(target, 0, item);
      const arrangement = { ...state.arrangement, sectionOrder: order };
      return {
        arrangement: {
          ...arrangement,
          totalBars: computeArrangementTotalBars(arrangement),
        },
      };
    }),
  placePatternClip: (sectionId, trackId, variantId, startBar, bars) =>
    set((state) => {
      if (!state.arrangement) {
        return state;
      }
      const start = Math.max(0, startBar);
      const width = Math.max(1, bars);
      return {
        arrangement: {
          ...state.arrangement,
          sections: state.arrangement.sections.map((section) => {
            if (section.id !== sectionId) {
              return section;
            }
            const withoutOverlap = section.clips.filter(
              (clip) =>
                clip.trackId !== trackId || !clipsBarRangesOverlap(clip, start, width),
            );
            const nextClip: ArrangementClip = {
              id: `${sectionId}-${trackId}-${crypto.randomUUID().slice(0, 6)}`,
              trackId,
              variantId,
              startBar: start,
              bars: width,
              muted: false,
            };
            return { ...section, clips: [...withoutOverlap, nextClip] };
          }),
        },
      };
    }),
  addSectionAsset: (sectionId, asset) =>
    set((state) => {
      if (!state.arrangement) {
        return state;
      }
      return {
        arrangement: {
          ...state.arrangement,
          sections: state.arrangement.sections.map((section) =>
            section.id === sectionId
              ? {
                  ...section,
                  assets: [
                    ...section.assets,
                    {
                      ...asset,
                      id: `${sectionId}-asset-${crypto.randomUUID().slice(0, 6)}`,
                    },
                  ],
                }
              : section,
          ),
        },
      };
    }),
  setAutomationPoint: (sectionId, lane, bar, value) =>
    set((state) => {
      if (!state.arrangement) {
        return state;
      }
      return {
        arrangement: {
          ...state.arrangement,
          sections: state.arrangement.sections.map((section) => {
            if (section.id !== sectionId) {
              return section;
            }
            const laneKey = `${lane.trackId}-${lane.target}`;
            const existingLane = section.automationLanes.find(
              (candidate) =>
                candidate.trackId === lane.trackId && candidate.target === lane.target,
            );
            if (!existingLane) {
              return {
                ...section,
                automationLanes: [
                  ...section.automationLanes,
                  {
                    id: laneKey,
                    trackId: lane.trackId,
                    target: lane.target,
                    points: [{ bar: Math.max(0, bar), value: Math.max(0, Math.min(1, value)) }],
                  },
                ],
              };
            }

            return {
              ...section,
              automationLanes: section.automationLanes.map((candidate) =>
                candidate.id === existingLane.id
                  ? {
                      ...candidate,
                      points: [
                        ...candidate.points.filter((point) => point.bar !== bar),
                        { bar: Math.max(0, bar), value: Math.max(0, Math.min(1, value)) },
                      ].sort((a, b) => a.bar - b.bar),
                    }
                  : candidate,
              ),
            };
          }),
        },
      };
    }),
  upsertAutomationLanes: (sectionId, lanes) =>
    set((state) => {
      if (!state.arrangement || lanes.length === 0) {
        return state;
      }

      return {
        arrangement: {
          ...state.arrangement,
          sections: state.arrangement.sections.map((section) => {
            if (section.id !== sectionId) {
              return section;
            }

            const normalized = lanes
              .map((lane) => normalizeAutomationLane(lane, section.bars))
              .filter((lane) => lane.points.length > 0);
            if (normalized.length === 0) {
              return section;
            }

            const replacementKeys = new Set(normalized.map(automationLaneKey));
            const replacementIds = new Set(normalized.map((lane) => lane.id));
            return {
              ...section,
              automationLanes: [
                ...section.automationLanes.filter(
                  (lane) =>
                    !replacementIds.has(lane.id) && !replacementKeys.has(automationLaneKey(lane)),
                ),
                ...normalized,
              ],
            };
          }),
        },
      };
    }),
  setAbsoluteStep: (step) => set({ absoluteStep: step }),
  addAbsoluteSteps: (steps) =>
    set((state) => ({
      absoluteStep: Math.max(0, state.absoluteStep + Math.max(0, steps)),
    })),
  advanceAbsoluteStep: () => set((state) => ({ absoluteStep: state.absoluteStep + 1 })),
  resolveCurrentSection: () => {
    const state = get();
    if (!state.arrangement) {
      return null;
    }
    return mapArrangementStep(state.arrangement, state.absoluteStep).sectionId;
  },
  buildPlaybackTracks: (tracks) => {
    const state = get();
    if (!state.arrangement) {
      return tracks;
    }
    const mapped = mapArrangementStep(state.arrangement, state.absoluteStep);
    const sectionId = mapped.sectionId ?? state.arrangement.sectionOrder[0];
    if (!sectionId) {
      return tracks;
    }
    return buildSectionTrackView(tracks, state.arrangement, sectionId, mapped.localBar);
  },
}));
