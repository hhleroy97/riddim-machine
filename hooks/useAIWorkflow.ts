"use client";

import { useCallback, useState } from "react";

import { normalizeChordAgentProgression } from "@/lib/midi/chordPatterns";
import { useAIStore } from "@/stores/aiStore";
import { useAudioStore } from "@/stores/audioStore";
import { useArrangementStore } from "@/stores/arrangementStore";
import { useUIStore } from "@/stores/uiStore";
import type {
  AIAutomationResult,
  AIChordResult,
  AIMixCoachResult,
  AIModulationResult,
  AIPatternResult,
  AIRiddimComposerResult,
  AISongIdeaResult,
} from "@/types";

interface AgentRequestBody {
  prompt: string;
  bpm: number;
  bars: number;
  existingTracks: Array<{
    id: string;
    name: string;
    type: "drum" | "bass";
    deviceChain: {
      instrumentPluginId: string;
      instrumentParams: Record<string, number>;
      effects: Array<{
        id: string;
        pluginId: string;
        bypass: boolean;
        wet: number;
        params: Record<string, number>;
      }>;
    };
  }>;
  selectedTrackId?: string;
  selectedTrackChain?: {
    instrumentPluginId: string;
    instrumentParams: Record<string, number>;
    effects: Array<{
      id: string;
      pluginId: string;
      bypass: boolean;
      wet: number;
      params: Record<string, number>;
    }>;
  };
  selectedArrangementSection?: {
    id: string;
    name: string;
    bars: number;
    clips: Array<{
      id: string;
      trackId: string;
      variantId: string;
      bars: number;
      startBar: number;
      muted: boolean;
    }>;
    automationLanes: AIAutomationResult["automationLanes"];
  };
  arrangementGoals?: {
    desiredSections?: number;
    targetBars?: number;
    mood?: string;
    energyCurve?: number[];
  };
  composerOptions?: {
    applyDespiteLowCriticScore?: boolean;
  };
}

async function postAgent<T>(agentId: string, body: AgentRequestBody): Promise<T> {
  const response = await fetch(`/api/agents/${agentId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as T & {
    error?: string;
    critic?: { score: number; reasons: string[] };
  };
  if (!response.ok || payload.error) {
    const criticDetail = payload.critic
      ? ` Score: ${payload.critic.score}. ${payload.critic.reasons.join(" ")}`
      : "";
    throw new Error(`${payload.error ?? "Agent request failed"}${criticDetail}`);
  }

  return payload;
}

/**
 * Coordinates AI store state with audio store updates.
 */
export function useAIWorkflow(): {
  generatePattern: (prompt: string) => Promise<void>;
  generateChords: (prompt: string) => Promise<void>;
  requestModulation: (prompt: string) => Promise<AIModulationResult | null>;
  generateAutomation: (prompt: string) => Promise<void>;
  requestMixCoach: (prompt: string) => Promise<void>;
  generateSongIdea: (prompt: string) => Promise<AISongIdeaResult | null>;
  generateRiddimComposition: (prompt: string) => Promise<AIRiddimComposerResult | null>;
  applyDespiteRiddimCritic: boolean;
  setApplyDespiteRiddimCritic: (value: boolean) => void;
} {
  const bpm = useAudioStore((state) => state.bpm);
  const tracks = useAudioStore((state) => state.tracks);
  const injectPattern = useAudioStore((state) => state.injectPattern);
  const applyChordGeneration = useAudioStore((state) => state.applyChordGeneration);
  const setError = useAIStore((state) => state.setError);
  const setPattern = useAIStore((state) => state.setPattern);
  const setChords = useAIStore((state) => state.setChords);
  const setModulation = useAIStore((state) => state.setModulation);
  const setAutomation = useAIStore((state) => state.setAutomation);
  const setMixCoach = useAIStore((state) => state.setMixCoach);
  const setLoadingPattern = useAIStore((state) => state.setLoadingPattern);
  const setLoadingChord = useAIStore((state) => state.setLoadingChord);
  const setLoadingMixCoach = useAIStore((state) => state.setLoadingMixCoach);
  const setLoadingSongIdea = useAIStore((state) => state.setLoadingSongIdea);
  const setLoadingAutomation = useAIStore((state) => state.setLoadingAutomation);
  const setSongIdea = useAIStore((state) => state.setSongIdea);
  const pushToast = useUIStore((state) => state.pushToast);
  const arrangement = useArrangementStore((state) => state.arrangement);
  const selectedSectionId = useArrangementStore((state) => state.selectedSectionId);
  const setSectionChords = useArrangementStore((state) => state.setSectionChords);
  const upsertAutomationLanes = useArrangementStore((state) => state.upsertAutomationLanes);

  const [applyDespiteRiddimCritic, setApplyDespiteRiddimCritic] = useState(false);

  const selectedTrack = tracks.find((track) => track.type === "bass") ?? tracks[0];
  const selectedArrangementSection = arrangement?.sections.find(
    (section) => section.id === selectedSectionId,
  );

  const buildBody = useCallback(
    (prompt: string, bars: number): AgentRequestBody => ({
      prompt,
      bpm,
      bars,
      existingTracks: tracks.map((track) => ({
        id: track.id,
        name: track.name,
        type: track.type,
        deviceChain: track.deviceChain,
      })),
      selectedTrackId: selectedTrack?.id,
      selectedTrackChain: selectedTrack?.deviceChain,
      selectedArrangementSection: selectedArrangementSection
        ? {
            id: selectedArrangementSection.id,
            name: selectedArrangementSection.name,
            bars: selectedArrangementSection.bars,
            clips: selectedArrangementSection.clips,
            automationLanes: selectedArrangementSection.automationLanes,
          }
        : undefined,
      arrangementGoals: arrangement
        ? {
            desiredSections: arrangement.sectionOrder.length,
            targetBars: arrangement.totalBars,
          }
        : undefined,
    }),
    [arrangement, bpm, selectedArrangementSection, selectedTrack?.deviceChain, selectedTrack?.id, tracks],
  );

  const generatePattern = useCallback(
    async (prompt: string) => {
      try {
        setLoadingPattern(true);
        setError(null);
        const result = await postAgent<AIPatternResult>("pattern", buildBody(prompt, 4));
        setPattern(result);
        injectPattern(result);
        pushToast({ tone: "success", title: "Pattern generated" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Pattern request failed";
        setError(message);
        pushToast({ tone: "error", title: "Pattern generation failed", detail: message });
      } finally {
        setLoadingPattern(false);
      }
    },
    [buildBody, injectPattern, pushToast, setError, setLoadingPattern, setPattern],
  );

  const generateChords = useCallback(
    async (prompt: string) => {
      try {
        setLoadingChord(true);
        setError(null);
        const chordBars = 4;
        const result = await postAgent<AIChordResult>("chord", buildBody(prompt, chordBars));
        setChords(result);
        applyChordGeneration(result, chordBars);

        const progressionEvents = normalizeChordAgentProgression(result, chordBars);
        if (selectedSectionId && progressionEvents.length > 0) {
          setSectionChords(selectedSectionId, progressionEvents);
        }

        pushToast({ tone: "success", title: "Chord suggestions applied to chord track" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Chord request failed";
        setError(message);
        pushToast({ tone: "error", title: "Chord generation failed", detail: message });
      } finally {
        setLoadingChord(false);
      }
    },
    [
      applyChordGeneration,
      buildBody,
      pushToast,
      selectedSectionId,
      setChords,
      setError,
      setLoadingChord,
      setSectionChords,
    ],
  );

  const requestModulation = useCallback(
    async (prompt: string) => {
      try {
        const result = await postAgent<AIModulationResult>("modulation", buildBody(prompt, 1));
        setModulation(result);
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Modulation request failed";
        setError(message);
        pushToast({ tone: "error", title: "Modulation failed", detail: message });
        return null;
      }
    },
    [buildBody, pushToast, setError, setModulation],
  );

  const generateAutomation = useCallback(
    async (prompt: string) => {
      if (!selectedSectionId) {
        pushToast({ tone: "error", title: "Select an arrangement section first" });
        return;
      }

      try {
        setLoadingAutomation(true);
        setError(null);
        const result = await postAgent<AIAutomationResult>("automation", buildBody(prompt, 4));
        setAutomation(result);
        upsertAutomationLanes(selectedSectionId, result.automationLanes);
        pushToast({
          tone: "success",
          title: `Automation generated (${result.automationLanes.length} lanes)`,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Automation request failed";
        setError(message);
        pushToast({ tone: "error", title: "Automation generation failed", detail: message });
      } finally {
        setLoadingAutomation(false);
      }
    },
    [
      buildBody,
      pushToast,
      selectedSectionId,
      setAutomation,
      setError,
      setLoadingAutomation,
      upsertAutomationLanes,
    ],
  );

  const requestMixCoach = useCallback(
    async (prompt: string) => {
      try {
        setLoadingMixCoach(true);
        const result = await postAgent<AIMixCoachResult>("mix-coach", buildBody(prompt, 4));
        setMixCoach(result);
        pushToast({ tone: "success", title: "Mix coach updated" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Mix coach request failed";
        setError(message);
        pushToast({ tone: "error", title: "Mix coach failed", detail: message });
      } finally {
        setLoadingMixCoach(false);
      }
    },
    [buildBody, pushToast, setError, setLoadingMixCoach, setMixCoach],
  );

  const generateSongIdea = useCallback(
    async (prompt: string) => {
      try {
        setLoadingSongIdea(true);
        setError(null);
        const result = await postAgent<AISongIdeaResult>("song-idea", buildBody(prompt, 8));
        setSongIdea(result);
        pushToast({ tone: "success", title: "Song idea generated" });
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Song idea request failed";
        setError(message);
        pushToast({ tone: "error", title: "Song idea failed", detail: message });
        return null;
      } finally {
        setLoadingSongIdea(false);
      }
    },
    [buildBody, pushToast, setError, setLoadingSongIdea, setSongIdea],
  );

  const generateRiddimComposition = useCallback(
    async (prompt: string) => {
      try {
        setLoadingSongIdea(true);
        setError(null);
        const result = await postAgent<AIRiddimComposerResult>("riddim-composer", {
          ...buildBody(prompt, 16),
          ...(applyDespiteRiddimCritic
            ? { composerOptions: { applyDespiteLowCriticScore: true } }
            : {}),
        });
        setSongIdea({ songIdea: result.songIdea });
        pushToast({
          tone: "success",
          title: result.criticBypassed
            ? "Riddim composition applied (critic bypassed)"
            : "Theory-guided riddim composition generated",
          detail:
            `Critic score: ${result.compositionPlan.critic.score}` +
            (result.criticBypassed
              ? `. ${result.compositionPlan.critic.reasons[0] ?? "Tune prompt for half-time groove and sparser motifs."}`
              : ""),
        });
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Riddim composer request failed";
        setError(message);
        pushToast({ tone: "error", title: "Riddim composer failed", detail: message });
        return null;
      } finally {
        setLoadingSongIdea(false);
      }
    },
    [applyDespiteRiddimCritic, buildBody, pushToast, setError, setLoadingSongIdea, setSongIdea],
  );

  return {
    generatePattern,
    generateChords,
    requestModulation,
    generateAutomation,
    requestMixCoach,
    generateSongIdea,
    generateRiddimComposition,
    applyDespiteRiddimCritic,
    setApplyDespiteRiddimCritic,
  };
}
