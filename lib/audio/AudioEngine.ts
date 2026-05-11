import * as Tone from "tone";

import { createDefaultPluginRegistry } from "@/lib/audio/plugins/defaultRegistry";
import type {
  EffectPluginInstance,
  InstrumentPluginInstance,
} from "@/lib/audio/plugins/contracts";
import { PluginRegistry } from "@/lib/audio/plugins/registry";
import {
  cloneStepForSequence,
  copyStepAudioFields,
  type SequencedStepCell,
} from "@/lib/audio/sequencerStepSync";
import type { Step, Track } from "@/types";

/**
 * Encapsulates transport and sequence scheduling.
 */
export class AudioEngine {
  private readonly registry: PluginRegistry;
  private sequences: Map<string, Tone.Sequence<SequencedStepCell>>;
  private trackSnapshots: Map<string, Track>;
  private voiceInstances: Map<string, InstrumentPluginInstance>;
  private effectInstances: Map<string, EffectPluginInstance[]>;
  private readonly onStepTick: (stepIndex: number) => void;

  constructor(
    onStepTick: (stepIndex: number) => void,
    registry: PluginRegistry = createDefaultPluginRegistry(),
  ) {
    if (typeof window === "undefined") {
      // SSR guard — Tone.js requires browser
      throw new Error("AudioEngine can only be created in the browser.");
    }

    this.registry = registry;
    this.sequences = new Map<string, Tone.Sequence<SequencedStepCell>>();
    this.trackSnapshots = new Map<string, Track>();
    this.voiceInstances = new Map<string, InstrumentPluginInstance>();
    this.effectInstances = new Map<string, EffectPluginInstance[]>();
    this.onStepTick = onStepTick;
    Tone.Transport.loop = true;
    Tone.Transport.loopEnd = "1m";
  }

  /**
   * Rebuilds track sequences from state.
   */
  public syncTracks(tracks: Track[]): void {
    this.disposeSequences();
    this.disposeGraphs();

    tracks.forEach((track, trackIndex) => {
      this.trackSnapshots.set(track.id, track);
      this.buildProcessingGraph(track);

      const sequencedEvents: SequencedStepCell[] = track.steps.map((step, idx) => ({
        idx,
        step: cloneStepForSequence(step),
      }));

      const sequence = new Tone.Sequence<SequencedStepCell>(
        (time, cell) => {
          const stepIndex = cell.idx;
          const step = cell.step;
          // Single store write per subdivision — avoid N tracks × identical setCurrentStep.
          if (trackIndex === 0) {
            this.onStepTick(stepIndex);
          }

          if (!step.active) {
            return;
          }

          const voice = this.voiceInstances.get(track.id);
          voice?.trigger(step, time, track.id);
        },
        sequencedEvents,
        "16n",
      );

      sequence.start(0);
      this.sequences.set(track.id, sequence);
      this.setTrackVolume(track.id, track.volume, track.type);
      this.setTrackPatch(track.id, track.synthPatch, track.type);
      this.applyTrackDeviceChain(track.id, track.deviceChain);
    });
  }

  /**
   * Mutates existing sequence events in-place for a single step.
   */
  public updateStep(trackId: string, stepIndex: number, step: Step): void {
    const sequence = this.sequences.get(trackId);
    if (!sequence) {
      return;
    }

    const cell = sequence.events[stepIndex] as SequencedStepCell | undefined;
    if (!cell) {
      return;
    }

    copyStepAudioFields(cell.step, step);
  }

  /**
   * Applies volume to the relevant voice path.
   */
  public setTrackVolume(trackId: string, value: number, type: Track["type"]): void {
    void type;
    this.voiceInstances.get(trackId)?.setVolume(value);
  }

  /**
   * Applies patch changes to the relevant voice.
   */
  public setTrackPatch(
    trackId: string,
    patch: Track["synthPatch"],
    type: Track["type"],
  ): void {
    void type;
    this.voiceInstances.get(trackId)?.applyPatch(patch);
  }

  /**
   * Applies chain updates without rebuilding transport sequences.
   */
  public applyTrackDeviceChain(trackId: string, chain: Track["deviceChain"]): void {
    const track = this.trackSnapshots.get(trackId);
    if (!track) {
      return;
    }

    const nextTrack: Track = { ...track, deviceChain: chain };
    this.trackSnapshots.set(trackId, nextTrack);
    this.rebuildGraph(trackId, nextTrack);
  }

  /**
   * Applies modulation values to bass filter.
   */
  public applyModulation(cutoff: number, resonance: number): void {
    this.trackSnapshots.forEach((track, trackId) => {
      if (track.type !== "bass") {
        return;
      }

      const voice = this.voiceInstances.get(trackId);
      if (!voice) {
        return;
      }

      voice.setParam("brightness", Math.max(0, Math.min(1, cutoff / 18000)));
      voice.setParam("modDepth", Math.max(0, Math.min(1, resonance / 8)));
    });
  }

  /**
   * Applies arrangement automation to a single track parameter.
   */
  public applyTrackAutomation(
    trackId: string,
    target:
      | "amp.attack"
      | "amp.decay"
      | "amp.sustain"
      | "amp.release"
      | "filter.cutoff"
      | "filter.resonance"
      | "fx.drive"
      | "fx.chorusMix"
      | "fx.stereoWidth",
    value: number,
  ): void {
    const track = this.trackSnapshots.get(trackId);
    const voice = this.voiceInstances.get(trackId);
    if (!track || !voice) {
      return;
    }

    const normalized = Math.max(0, Math.min(1, value));
    if (target === "filter.cutoff") {
      voice.setParam("brightness", normalized);
      return;
    }
    if (target === "filter.resonance") {
      voice.setParam("modDepth", normalized);
      return;
    }
    if (!track.synthPatch) {
      return;
    }

    const nextPatch = structuredClone(track.synthPatch);
    if (target === "amp.attack") nextPatch.ampEnvelope.attack = normalized * 2;
    if (target === "amp.decay") nextPatch.ampEnvelope.decay = normalized * 2;
    if (target === "amp.sustain") nextPatch.ampEnvelope.sustain = normalized;
    if (target === "amp.release") nextPatch.ampEnvelope.release = normalized * 2;
    if (target === "fx.drive") nextPatch.fx.drive = normalized;
    if (target === "fx.chorusMix") nextPatch.fx.chorusMix = normalized;
    if (target === "fx.stereoWidth") nextPatch.fx.stereoWidth = normalized;
    this.trackSnapshots.set(trackId, { ...track, synthPatch: nextPatch });
    voice.applyPatch(nextPatch);
  }

  /**
   * Updates transport BPM.
   */
  public setBpm(bpm: number): void {
    Tone.Transport.bpm.rampTo(bpm, 0.1);
  }

  /**
   * Starts transport on user gesture.
   */
  public async start(): Promise<void> {
    await Tone.start();
    Tone.Transport.start();
  }

  /**
   * Stops transport.
   */
  public stop(): void {
    Tone.Transport.stop();
    Tone.Transport.position = 0;
  }

  /**
   * Disposes Tone objects.
   */
  public dispose(): void {
    this.stop();
    this.disposeSequences();
    this.disposeGraphs();
  }

  private disposeSequences(): void {
    this.sequences.forEach((sequence) => sequence.dispose());
    this.sequences.clear();
  }

  private buildProcessingGraph(track: Track): void {
    const instrumentDefinition = this.registry.getInstrument(
      track.deviceChain.instrumentPluginId,
    );
    const voice = instrumentDefinition.create();
    voice.applyPatch(track.synthPatch);

    Object.entries(track.deviceChain.instrumentParams).forEach(([id, value]) => {
      voice.setParam(id, value);
    });

    const effects = track.deviceChain.effects.map((slot) => {
      const definition = this.registry.getEffect(slot.pluginId);
      const instance = definition.create();
      instance.setWet(slot.wet);
      instance.setBypass(slot.bypass);
      Object.entries(slot.params).forEach(([id, value]) => instance.setParam(id, value));
      return instance;
    });

    if (effects.length === 0) {
      voice.connect(Tone.Destination);
    } else {
      voice.connect(effects[0].input);
      effects.forEach((effect, index) => {
        const next = effects[index + 1];
        if (next) {
          effect.output.connect(next.input);
          return;
        }
        effect.output.connect(Tone.Destination);
      });
    }

    this.voiceInstances.set(track.id, voice);
    this.effectInstances.set(track.id, effects);
  }

  private rebuildGraph(trackId: string, track: Track): void {
    this.voiceInstances.get(trackId)?.dispose();
    this.effectInstances.get(trackId)?.forEach((effect) => effect.dispose());
    this.voiceInstances.delete(trackId);
    this.effectInstances.delete(trackId);
    this.buildProcessingGraph(track);
  }

  private disposeGraphs(): void {
    this.voiceInstances.forEach((voice) => voice.dispose());
    this.voiceInstances.clear();
    this.effectInstances.forEach((effects) =>
      effects.forEach((effect) => effect.dispose()),
    );
    this.effectInstances.clear();
    this.trackSnapshots.clear();
  }
}
