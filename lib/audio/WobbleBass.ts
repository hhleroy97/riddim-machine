import * as Tone from "tone";

import { evaluateModTargets } from "@/lib/audio/modMatrix";
import type { SynthPatch } from "@/types";

/**
 * Wobble bass voice chain.
 */
export class WobbleBass {
  private readonly subOsc: Tone.Oscillator;
  private readonly midOsc: Tone.Oscillator;
  private readonly noise: Tone.Noise;
  private readonly ampEnvelope: Tone.AmplitudeEnvelope;
  private readonly modEnvelope: Tone.Envelope;
  private readonly subGain: Tone.Gain;
  private readonly midGain: Tone.Gain;
  private readonly noiseGain: Tone.Gain;
  private readonly filter: Tone.Filter;
  private readonly lowCut: Tone.Filter;
  private readonly highCut: Tone.Filter;
  private readonly drive: Tone.Distortion;
  private readonly chorus: Tone.Chorus;
  private readonly stereo: Tone.StereoWidener;
  private readonly lfo: Tone.LFO;
  private readonly output: Tone.Gain;
  private patch: SynthPatch | null;
  private lfoDepth: number;

  constructor() {
    if (typeof window === "undefined") {
      // SSR guard — Tone.js requires browser
      throw new Error("WobbleBass can only be created in the browser.");
    }

    this.subOsc = new Tone.Oscillator("F1", "sine");
    this.midOsc = new Tone.Oscillator("F1", "sawtooth");
    this.noise = new Tone.Noise("pink");
    this.ampEnvelope = new Tone.AmplitudeEnvelope({
      attack: 0.005,
      decay: 0.14,
      sustain: 0.5,
      release: 0.2,
    });
    this.modEnvelope = new Tone.Envelope({
      attack: 0.001,
      decay: 0.2,
      sustain: 0.1,
      release: 0.12,
    });
    this.subGain = new Tone.Gain(0.8);
    this.midGain = new Tone.Gain(0.65);
    this.noiseGain = new Tone.Gain(0);
    this.filter = new Tone.Filter(600, "lowpass");
    this.lowCut = new Tone.Filter(28, "highpass");
    this.highCut = new Tone.Filter(14500, "lowpass");
    this.drive = new Tone.Distortion(0.2);
    this.chorus = new Tone.Chorus(4, 2.5, 0.25);
    this.stereo = new Tone.StereoWidener(0.3);
    this.lfo = new Tone.LFO("4n", -1, 1);
    this.output = new Tone.Gain(0.8);
    this.patch = null;
    this.lfoDepth = 1;

    this.subOsc.chain(this.subGain, this.ampEnvelope);
    this.midOsc.chain(this.midGain, this.ampEnvelope);
    this.noise.chain(this.noiseGain, this.ampEnvelope);
    this.ampEnvelope.chain(
      this.filter,
      this.lowCut,
      this.highCut,
      this.drive,
      this.chorus,
      this.stereo,
      this.output,
      Tone.Destination,
    );
    this.chorus.start();
    this.lfo.start();
    this.subOsc.start();
    this.midOsc.start();
    this.noise.start();
  }

  /**
   * Triggers a bass note.
   */
  public trigger(note: string, time: Tone.Unit.Time, velocity: number): void {
    this.subOsc.frequency.setValueAtTime(Tone.Frequency(note).transpose(-12).toFrequency(), time);
    this.midOsc.frequency.setValueAtTime(Tone.Frequency(note).toFrequency(), time);
    this.noiseGain.gain.setValueAtTime(velocity * 0.15, time);
    this.ampEnvelope.triggerAttackRelease("16n", time, velocity);
    this.modEnvelope.triggerAttackRelease("16n", time);

    if (this.patch) {
      this.applyModulation(this.patch);
    }
  }

  /**
   * Applies full patch to synth and effect chain.
   */
  public applyPatch(patch: SynthPatch): void {
    this.patch = patch;
    const [sub, mid, noise] = patch.oscillators;

    this.subOsc.type = sub.waveform;
    this.midOsc.type = mid.waveform;
    this.noise.type = noise.waveform === "square" ? "white" : "pink";

    this.subOsc.detune.rampTo(sub.detune + sub.octave * 1200, 0.1);
    this.midOsc.detune.rampTo(mid.detune + mid.octave * 1200, 0.1);

    this.subGain.gain.rampTo(sub.enabled ? sub.gain : 0, 0.1);
    this.midGain.gain.rampTo(mid.enabled ? mid.gain : 0, 0.1);
    this.noiseGain.gain.rampTo(noise.enabled ? noise.gain : 0, 0.1);

    this.ampEnvelope.attack = patch.ampEnvelope.attack;
    this.ampEnvelope.decay = patch.ampEnvelope.decay;
    this.ampEnvelope.sustain = patch.ampEnvelope.sustain;
    this.ampEnvelope.release = patch.ampEnvelope.release;

    this.modEnvelope.attack = patch.modEnvelope.attack;
    this.modEnvelope.decay = patch.modEnvelope.decay;
    this.modEnvelope.sustain = patch.modEnvelope.sustain;
    this.modEnvelope.release = patch.modEnvelope.release;

    this.filter.frequency.rampTo(patch.filter.cutoff, 0.1);
    this.filter.Q.rampTo(patch.filter.resonance, 0.1);

    this.drive.distortion = patch.fx.drive;
    this.chorus.wet.rampTo(patch.fx.chorusMix, 0.1);
    this.stereo.width.rampTo(patch.fx.stereoWidth, 0.1);
    this.lowCut.frequency.rampTo(patch.fx.lowCut, 0.1);
    this.highCut.frequency.rampTo(patch.fx.highCut, 0.1);

    this.applyModulation(patch);
  }

  /**
   * Smoothly updates cutoff target.
   */
  public setCutoff(target: number): void {
    this.filter.frequency.rampTo(target, 0.2);
  }

  /**
   * Smoothly updates resonance target.
   */
  public setResonance(target: number): void {
    this.filter.Q.rampTo(target, 0.2);
  }

  /**
   * Applies external modulation values.
   */
  public setModulation(depth: number): void {
    this.lfoDepth = Math.max(0, Math.min(1, depth));
    if (this.patch) {
      this.applyModulation(this.patch);
    }
  }

  /**
   * Updates output level.
   */
  public setVolume(value: number): void {
    this.output.gain.rampTo(value, 0.1);
  }

  /**
   * Disposes all Tone nodes.
   */
  public dispose(): void {
    this.subOsc.dispose();
    this.midOsc.dispose();
    this.noise.dispose();
    this.ampEnvelope.dispose();
    this.modEnvelope.dispose();
    this.subGain.dispose();
    this.midGain.dispose();
    this.noiseGain.dispose();
    this.lfo.dispose();
    this.filter.dispose();
    this.lowCut.dispose();
    this.highCut.dispose();
    this.drive.dispose();
    this.chorus.dispose();
    this.stereo.dispose();
    this.output.dispose();
  }

  private applyModulation(patch: SynthPatch): void {
    const lfoNow = Math.sin(Tone.now() * Math.PI * 2) * this.lfoDepth;
    const mod = evaluateModTargets(patch, lfoNow);
    this.filter.frequency.rampTo(mod.filterCutoff, 0.1);
    this.filter.Q.rampTo(mod.filterResonance, 0.1);
    this.midGain.gain.rampTo(mod.oscMix, 0.1);
    this.drive.distortion = mod.drive;
    this.chorus.wet.rampTo(mod.chorusMix, 0.1);
    this.stereo.width.rampTo(mod.stereoWidth, 0.1);
  }
}
