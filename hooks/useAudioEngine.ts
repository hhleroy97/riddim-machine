"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  mapArrangementStep,
  resolveAutomationValueAtBar,
  type ArrangementStepMap,
} from "@/lib/arrangement/timeline";
import { AudioEngine } from "@/lib/audio/AudioEngine";
import {
  deviceChainsEqual,
  hasSynthPatchChanged,
  stepsAudioEqual,
} from "@/lib/audio/trackEquality";
import { useAudioStore } from "@/stores/audioStore";
import { useArrangementStore } from "@/stores/arrangementStore";
import type { Track } from "@/types";

function hasTrackShapeChanged(previous: Track[], next: Track[]): boolean {
  if (previous.length !== next.length) {
    return true;
  }

  return previous.some((track, index) => {
    const candidate = next[index];
    return (
      track.id !== candidate.id ||
      track.steps.length !== candidate.steps.length ||
      track.deviceChain.instrumentPluginId !== candidate.deviceChain.instrumentPluginId ||
      track.deviceChain.effects.length !== candidate.deviceChain.effects.length
    );
  });
}

/**
 * Bridges UI/store events into the Tone.js engine.
 *
 * All store reads use `getState` + `subscribe` so transport ticks do **not**
 * rerender StudioApp via React hooks bound to audio/arrangement position.
 */
export function useAudioEngine(): {
  startPlayback: () => Promise<void>;
  stopPlayback: () => void;
  applyModulation: (cutoff: number, resonance: number) => void;
} {
  const engineRef = useRef<AudioEngine | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      // SSR guard — Tone.js requires browser
      return;
    }

    const previousTracksRef: { current: Track[] } = { current: [] };
    const initialAudio = useAudioStore.getState();
    const initialArrangement = useArrangementStore.getState();
    let prevCs = initialAudio.currentStep;
    let appliedBpm = initialAudio.bpm;
    let prevTracksRef: typeof initialAudio.tracks = initialAudio.tracks;
    let prevArrangementRef = initialArrangement.arrangement;
    let prevAbsoluteStep = initialArrangement.absoluteStep;
    /** True after playback materialization ran at least once for this engine lifetime. */
    let playbackHydrated = false;
    let lastSyncedSourceTracks: Track[] | null = null;
    let lastSyncedBarKey: string | null = null;

    const engine = new AudioEngine((stepIndex: number) => {
      useAudioStore.getState().setCurrentStep(stepIndex);
    });
    engineRef.current = engine;

    playbackHydrated = false;
    lastSyncedSourceTracks = null;
    lastSyncedBarKey = null;
    previousTracksRef.current = [];
    engine.setBpm(appliedBpm);

    /**
     * @param flushMapped Precomputed coords from the same arrangement tick (avoids redundant map scans).
     */
    const applyMaterialization = (flushMapped: ArrangementStepMap | undefined): void => {
      const instance = engineRef.current;
      if (!instance) {
        return;
      }

      const { tracks } = useAudioStore.getState();
      const arrangementState = useArrangementStore.getState();
      const { arrangement, absoluteStep, buildPlaybackTracks } = arrangementState;

      let barKey: string;
      if (arrangement == null) {
        barKey = "__full__";
      } else if (flushMapped !== undefined) {
        barKey = `${flushMapped.sectionId}:${flushMapped.localBar}`;
      } else {
        const coords = mapArrangementStep(arrangement, absoluteStep);
        barKey = `${coords.sectionId}:${coords.localBar}`;
      }

      if (
        playbackHydrated &&
        lastSyncedSourceTracks === tracks &&
        lastSyncedBarKey === barKey
      ) {
        return;
      }

      const playbackTracks = buildPlaybackTracks(tracks);
      const previousTracks = previousTracksRef.current;
      if (hasTrackShapeChanged(previousTracks, playbackTracks)) {
        instance.syncTracks(playbackTracks);
        previousTracksRef.current = playbackTracks;
        lastSyncedSourceTracks = tracks;
        lastSyncedBarKey = barKey;
        playbackHydrated = true;
        return;
      }

      playbackTracks.forEach((track, trackIndex) => {
        const previousTrack = previousTracks[trackIndex];
        if (!previousTrack) {
          return;
        }

        if (track.volume !== previousTrack.volume) {
          instance.setTrackVolume(track.id, track.volume, track.type);
        }

        if (!deviceChainsEqual(previousTrack.deviceChain, track.deviceChain)) {
          instance.applyTrackDeviceChain(track.id, track.deviceChain);
        }

        if (hasSynthPatchChanged(previousTrack, track)) {
          instance.setTrackPatch(track.id, track.synthPatch, track.type);
        }

        track.steps.forEach((step, stepIndex) => {
          const previousStep = previousTrack.steps[stepIndex];
          if (!previousStep) {
            return;
          }

          if (!stepsAudioEqual(previousStep, step)) {
            instance.updateStep(track.id, stepIndex, step);
          }
        });
      });

      previousTracksRef.current = playbackTracks;
      lastSyncedSourceTracks = tracks;
      lastSyncedBarKey = barKey;
      playbackHydrated = true;
    };

    let pendingPlaybackFlush = false;

    /**
     * One mapArrangementStep + follow-playhead automation per logical tick.
     * `addAbsoluteSteps` synchronously notifies the arrangement store, which would otherwise
     * double-invoke duplicate work alongside the audio subscriber — coalesce to a microtask.
     */
    const flushPlaybackSideEffects = (): void => {
      pendingPlaybackFlush = false;

      const arrangementState = useArrangementStore.getState();
      const { arrangement, absoluteStep, selectedSectionId } = arrangementState;

      const mapped =
        arrangement === null ? undefined : mapArrangementStep(arrangement, absoluteStep);

      applyMaterialization(mapped);

      if (arrangement === null || mapped === undefined) {
        return;
      }

      if (selectedSectionId !== mapped.sectionId) {
        useArrangementStore.setState({ selectedSectionId: mapped.sectionId });
      }

      const instance = engineRef.current;
      const audio = useAudioStore.getState();

      if (!instance || !audio.isPlaying || mapped.localStep !== 0) {
        return;
      }

      const section = arrangement.sections.find(
        (candidate) => candidate.id === mapped.sectionId,
      );
      if (!section) {
        return;
      }

      section.automationLanes.forEach((lane) => {
        const value = resolveAutomationValueAtBar(lane.points, mapped.localBar);
        if (value === null) {
          return;
        }

        instance.applyTrackAutomation(lane.trackId, lane.target, value);
      });
    };

    const schedulePlaybackFlush = (): void => {
      if (pendingPlaybackFlush) {
        return;
      }
      pendingPlaybackFlush = true;
      queueMicrotask(flushPlaybackSideEffects);
    };

    /**
     * Only schedule a materialization flush when something **structural** changed:
     * tracks data, BPM, or playback toggling. A bare `currentStep` mutation is the
     * audio engine reporting the playhead position — handle the arrangement-step
     * advance inline and bail to keep the per-tick microtask off the hot path.
     */
    const onAudioMutation = (): void => {
      const audio = useAudioStore.getState();
      const cs = audio.currentStep;
      const instance = engineRef.current;

      if (cs !== prevCs) {
        if (audio.isPlaying && instance) {
          const delta = ((cs - prevCs) + 16) % 16;
          if (delta > 0) {
            useArrangementStore.getState().addAbsoluteSteps(delta);
          }
        }
        prevCs = cs;
      }

      if (instance && audio.bpm !== appliedBpm) {
        instance.setBpm(audio.bpm);
        appliedBpm = audio.bpm;
      }

      if (audio.tracks !== prevTracksRef) {
        prevTracksRef = audio.tracks;
        schedulePlaybackFlush();
      }
    };

    /**
     * Bar-boundary detector: `absoluteStep` updates every 16th note, but the
     * engine only needs to re-materialize when the bar key (sectionId:localBar)
     * actually changes — otherwise the cache check inside `applyMaterialization`
     * does redundant work every step.
     */
    const onArrangementMutation = (): void => {
      const arr = useArrangementStore.getState();

      if (arr.arrangement !== prevArrangementRef) {
        prevArrangementRef = arr.arrangement;
        prevAbsoluteStep = arr.absoluteStep;
        schedulePlaybackFlush();
        return;
      }

      if (arr.absoluteStep === prevAbsoluteStep) {
        return;
      }

      const previousStep = prevAbsoluteStep;
      prevAbsoluteStep = arr.absoluteStep;

      if (arr.arrangement === null) {
        return;
      }

      const previousCoords = mapArrangementStep(arr.arrangement, previousStep);
      const nextCoords = mapArrangementStep(arr.arrangement, arr.absoluteStep);
      if (
        previousCoords.sectionId !== nextCoords.sectionId ||
        previousCoords.localBar !== nextCoords.localBar
      ) {
        schedulePlaybackFlush();
      }
    };

    const unsubAudio = useAudioStore.subscribe(onAudioMutation);
    const unsubArrangement = useArrangementStore.subscribe(onArrangementMutation);

    // Initial hydration — `onAudioMutation` only flushes when `tracks` ref changes,
    // and on first run the ref matches the bootstrap snapshot. Force one materialization.
    schedulePlaybackFlush();

    return () => {
      unsubAudio();
      unsubArrangement();
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const startPlayback = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || useAudioStore.getState().isPlaying) {
      return;
    }

    await engine.start();
    useAudioStore.getState().setPlaying(true);
  }, []);

  const stopPlayback = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !useAudioStore.getState().isPlaying) {
      return;
    }

    engine.stop();
    useAudioStore.getState().setPlaying(false);
    useArrangementStore.getState().setAbsoluteStep(0);
    useAudioStore.getState().setCurrentStep(0);
  }, []);

  const applyModulation = useCallback((cutoff: number, resonance: number) => {
    engineRef.current?.applyModulation(cutoff, resonance);
  }, []);

  return { startPlayback, stopPlayback, applyModulation };
}
