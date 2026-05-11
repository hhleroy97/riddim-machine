import { create } from "zustand";

import { normalizeTracks } from "@/lib/audio/patches";
import { buildChordPattern, normalizeChordAgentProgression, withChordVariant } from "@/lib/midi/chordPatterns";
import {
  applyEffectChainPreset,
  applyInstrumentPreset,
  applyPluginChainPreset,
} from "@/lib/audio/presetLibrary";
import { createDefaultTracks } from "@/lib/loop/defaults";
import type {
  AIChordResult,
  EffectChainPreset,
  InstrumentPreset,
  ChordEvent,
  ModRoute,
  PluginChainPreset,
  SynthPatch,
  Step,
  Track,
} from "@/types";

interface AudioStoreState {
  bpm: number;
  isPlaying: boolean;
  currentStep: number;
  tracks: Track[];
  favoritePresetIds: string[];
  setBpm: (value: number) => void;
  setPlaying: (value: boolean) => void;
  setCurrentStep: (value: number) => void;
  toggleStep: (trackId: string, stepIndex: number) => void;
  setTrackStep: (trackId: string, stepIndex: number, step: Step) => void;
  setTrackStepVelocity: (trackId: string, stepIndex: number, velocity: number) => void;
  setTrackVolume: (trackId: string, volume: number) => void;
  setTrackMute: (trackId: string, mute: boolean) => void;
  setTrackSolo: (trackId: string, solo: boolean) => void;
  replaceTracks: (tracks: Track[]) => void;
  injectPattern: (result: { tracks: Track[] }) => void;
  applyChordToBass: (chord: string) => void;
  setBassPatch: (trackId: string, patch: SynthPatch) => void;
  setMacroValue: (
    trackId: string,
    macroId: "macro1" | "macro2" | "macro3" | "macro4",
    value: number,
  ) => void;
  setModRoute: (trackId: string, routeId: string, updates: Partial<ModRoute>) => void;
  setTrackDeviceChain: (trackId: string, chain: Track["deviceChain"]) => void;
  applyInstrumentPresetToTrack: (trackId: string, preset: InstrumentPreset) => void;
  applyEffectPresetToTrack: (trackId: string, preset: EffectChainPreset) => void;
  applyPluginChainPresetToTrack: (trackId: string, preset: PluginChainPreset) => void;
  toggleFavoritePreset: (presetId: string) => void;
  moveEffectSlot: (trackId: string, effectId: string, direction: "up" | "down") => void;
  toggleEffectBypass: (trackId: string, effectId: string) => void;
  duplicateEffectSlot: (trackId: string, effectId: string) => void;
  applySceneVariation: () => void;
  applyChordGeneration: (result: AIChordResult, barBudget?: number) => void;
  applyChordVariantToTrack: (trackId: string, variantId: string, chords: ChordEvent[]) => void;
}

function updateStep(step: Step): Step {
  return {
    ...step,
    active: !step.active,
  };
}

/**
 * Owns active playback state for the sequencer.
 */
export const useAudioStore = create<AudioStoreState>((set) => ({
  bpm: 140,
  isPlaying: false,
  currentStep: 0,
  tracks: createDefaultTracks(),
  favoritePresetIds: [],
  setBpm: (value) => set({ bpm: Math.max(60, Math.min(200, value)) }),
  setPlaying: (value) => set({ isPlaying: value }),
  setCurrentStep: (value) => set({ currentStep: value }),
  toggleStep: (trackId, stepIndex) =>
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              steps: track.steps.map((step, index) =>
                index === stepIndex ? updateStep(step) : step,
              ),
            }
          : track,
      ),
    })),
  setTrackStep: (trackId, stepIndex, step) =>
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              steps: track.steps.map((candidate, index) =>
                index === stepIndex ? { ...step } : candidate,
              ),
            }
          : track,
      ),
    })),
  setTrackStepVelocity: (trackId, stepIndex, velocity) =>
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              steps: track.steps.map((step, index) =>
                index === stepIndex
                  ? { ...step, velocity: Math.max(0, Math.min(1, velocity)) }
                  : step,
              ),
            }
          : track,
      ),
    })),
  setTrackVolume: (trackId, volume) =>
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId ? { ...track, volume } : track,
      ),
    })),
  setTrackMute: (trackId, mute) =>
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId ? { ...track, mute } : track,
      ),
    })),
  setTrackSolo: (trackId, solo) =>
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId ? { ...track, solo } : track,
      ),
    })),
  replaceTracks: (tracks) => set({ tracks: normalizeTracks(tracks) }),
  injectPattern: (result) => set({ tracks: normalizeTracks(result.tracks) }),
  applyChordToBass: (chord) =>
    set((state) => {
      const root = chord.replace(/m|maj|min|7|sus|dim|aug/gi, "").trim();
      const bassNote = `${root || "F"}1`;

      return {
        tracks: state.tracks.map((track) =>
          track.type === "bass"
            ? {
                ...track,
                steps: track.steps.map((step) =>
                  step.active ? { ...step, note: bassNote } : step,
                ),
              }
            : track,
        ),
      };
    }),
  setBassPatch: (trackId, patch) =>
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId && track.type === "bass"
          ? { ...track, synthPatch: structuredClone(patch) }
          : track,
      ),
    })),
  setMacroValue: (trackId, macroId, value) =>
    set((state) => ({
      tracks: state.tracks.map((track) => {
        if (track.id !== trackId || track.type !== "bass" || !track.synthPatch) {
          return track;
        }

        return {
          ...track,
          synthPatch: {
            ...track.synthPatch,
            macros: track.synthPatch.macros.map((macro) =>
              macro.id === macroId ? { ...macro, value } : macro,
            ),
          },
        };
      }),
    })),
  setModRoute: (trackId, routeId, updates) =>
    set((state) => ({
      tracks: state.tracks.map((track) => {
        if (track.id !== trackId || track.type !== "bass" || !track.synthPatch) {
          return track;
        }

        return {
          ...track,
          synthPatch: {
            ...track.synthPatch,
            modRoutes: track.synthPatch.modRoutes.map((route) =>
              route.id === routeId ? { ...route, ...updates } : route,
            ),
          },
        };
      }),
    })),
  setTrackDeviceChain: (trackId, chain) =>
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId ? { ...track, deviceChain: structuredClone(chain) } : track,
      ),
    })),
  applyInstrumentPresetToTrack: (trackId, preset) =>
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId ? applyInstrumentPreset(track, preset) : track,
      ),
    })),
  applyEffectPresetToTrack: (trackId, preset) =>
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId ? applyEffectChainPreset(track, preset) : track,
      ),
    })),
  applyPluginChainPresetToTrack: (trackId, preset) =>
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId ? applyPluginChainPreset(track, preset) : track,
      ),
    })),
  toggleFavoritePreset: (presetId) =>
    set((state) => ({
      favoritePresetIds: state.favoritePresetIds.includes(presetId)
        ? state.favoritePresetIds.filter((id) => id !== presetId)
        : [...state.favoritePresetIds, presetId],
    })),
  moveEffectSlot: (trackId, effectId, direction) =>
    set((state) => ({
      tracks: state.tracks.map((track) => {
        if (track.id !== trackId) {
          return track;
        }

        const effects = [...track.deviceChain.effects];
        const index = effects.findIndex((effect) => effect.id === effectId);
        if (index < 0) {
          return track;
        }
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= effects.length) {
          return track;
        }
        const [item] = effects.splice(index, 1);
        effects.splice(targetIndex, 0, item);
        return {
          ...track,
          deviceChain: { ...track.deviceChain, effects },
        };
      }),
    })),
  toggleEffectBypass: (trackId, effectId) =>
    set((state) => ({
      tracks: state.tracks.map((track) => {
        if (track.id !== trackId) {
          return track;
        }

        return {
          ...track,
          deviceChain: {
            ...track.deviceChain,
            effects: track.deviceChain.effects.map((effect) =>
              effect.id === effectId ? { ...effect, bypass: !effect.bypass } : effect,
            ),
          },
        };
      }),
    })),
  duplicateEffectSlot: (trackId, effectId) =>
    set((state) => ({
      tracks: state.tracks.map((track) => {
        if (track.id !== trackId) {
          return track;
        }
        const effects = [...track.deviceChain.effects];
        const index = effects.findIndex((effect) => effect.id === effectId);
        if (index < 0) {
          return track;
        }
        const clone = structuredClone(effects[index]);
        clone.id = `${clone.id}-copy-${crypto.randomUUID().slice(0, 6)}`;
        effects.splice(index + 1, 0, clone);
        return {
          ...track,
          deviceChain: { ...track.deviceChain, effects },
        };
      }),
    })),
  applySceneVariation: () =>
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        steps: track.steps.map((step, index) => {
          if (track.type === "drum") {
            const toggle = Math.random() < 0.18 && index % 2 === 0;
            return { ...step, active: toggle ? !step.active : step.active };
          }
          const activate = index % 2 === 0 || Math.random() < 0.12;
          return {
            ...step,
            active: activate,
            velocity: activate ? Math.max(0.45, Math.min(1, step.velocity + (Math.random() - 0.5) * 0.2)) : step.velocity,
          };
        }),
      })),
    })),
  applyChordGeneration: (result, barBudget = 4) =>
    set((state) => {
      const events = normalizeChordAgentProgression(result, barBudget);
      const harmonyId = state.tracks.find(
        (track) => track.role === "harmony" || track.id === "chords",
      )?.id;

      if (!harmonyId) {
        return state;
      }

      const steps = buildChordPattern(events, 2);

      return {
        tracks: state.tracks.map((track) =>
          track.id === harmonyId ? { ...track, steps } : track,
        ),
      };
    }),
  applyChordVariantToTrack: (trackId, variantId, chords) =>
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId ? withChordVariant(track, variantId, chords) : track,
      ),
    })),
}));
