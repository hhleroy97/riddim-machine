import { create } from "zustand";

import type {
  AIChordResult,
  AIAutomationResult,
  AIMixCoachResult,
  AIModulationResult,
  AIPatternResult,
  AISongIdeaResult,
} from "@/types";

interface AIStoreState {
  loadingPattern: boolean;
  loadingChord: boolean;
  loadingMixCoach: boolean;
  loadingSongIdea: boolean;
  loadingAutomation: boolean;
  lastPattern: AIPatternResult | null;
  lastChords: AIChordResult | null;
  lastModulation: AIModulationResult | null;
  lastAutomation: AIAutomationResult | null;
  lastMixCoach: AIMixCoachResult | null;
  lastSongIdea: AISongIdeaResult | null;
  patternBurstCount: number;
  error: string | null;
  setLoadingPattern: (value: boolean) => void;
  setLoadingChord: (value: boolean) => void;
  setLoadingMixCoach: (value: boolean) => void;
  setLoadingSongIdea: (value: boolean) => void;
  setLoadingAutomation: (value: boolean) => void;
  setPattern: (value: AIPatternResult | null) => void;
  setChords: (value: AIChordResult | null) => void;
  setModulation: (value: AIModulationResult | null) => void;
  setAutomation: (value: AIAutomationResult | null) => void;
  setMixCoach: (value: AIMixCoachResult | null) => void;
  setSongIdea: (value: AISongIdeaResult | null) => void;
  setError: (value: string | null) => void;
}

/**
 * Owns AI request lifecycle state and results.
 */
export const useAIStore = create<AIStoreState>((set) => ({
  loadingPattern: false,
  loadingChord: false,
  loadingMixCoach: false,
  loadingSongIdea: false,
  loadingAutomation: false,
  lastPattern: null,
  lastChords: null,
  lastModulation: null,
  lastAutomation: null,
  lastMixCoach: null,
  lastSongIdea: null,
  patternBurstCount: 0,
  error: null,
  setLoadingPattern: (value) => set({ loadingPattern: value }),
  setLoadingChord: (value) => set({ loadingChord: value }),
  setLoadingMixCoach: (value) => set({ loadingMixCoach: value }),
  setLoadingSongIdea: (value) => set({ loadingSongIdea: value }),
  setLoadingAutomation: (value) => set({ loadingAutomation: value }),
  setPattern: (value) =>
    set((state) => ({
      lastPattern: value,
      patternBurstCount: value ? state.patternBurstCount + 1 : state.patternBurstCount,
    })),
  setChords: (value) => set({ lastChords: value }),
  setModulation: (value) => set({ lastModulation: value }),
  setAutomation: (value) => set({ lastAutomation: value }),
  setMixCoach: (value) => set({ lastMixCoach: value }),
  setSongIdea: (value) => set({ lastSongIdea: value }),
  setError: (value) => set({ error: value }),
}));
