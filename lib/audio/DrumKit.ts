import * as Tone from "tone";

/**
 * Minimal synthesized drum kit.
 */
export class DrumKit {
  private readonly kick: Tone.MembraneSynth;
  private readonly snare: Tone.NoiseSynth;
  private readonly hat: Tone.MetalSynth;
  private readonly output: Tone.Gain;

  constructor() {
    if (typeof window === "undefined") {
      // SSR guard — Tone.js requires browser
      throw new Error("DrumKit can only be created in the browser.");
    }

    this.output = new Tone.Gain(0.85).toDestination();
    this.kick = new Tone.MembraneSynth().connect(this.output);
    this.snare = new Tone.NoiseSynth({
      envelope: { attack: 0.001, decay: 0.14, sustain: 0 },
    }).connect(this.output);
    this.hat = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.08, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 3000,
      octaves: 1.5,
    }).connect(this.output);
  }

  /**
   * Triggers a named drum voice.
   */
  public trigger(trackId: string, time: Tone.Unit.Time, velocity: number): void {
    if (trackId.includes("kick")) {
      this.kick.triggerAttackRelease("C1", "16n", time, velocity);
      return;
    }

    if (trackId.includes("snare")) {
      this.snare.triggerAttackRelease("16n", time, velocity);
      return;
    }

    // MetalSynth: triggerAttackRelease(note, duration, time?, velocity?) — not duration-first like NoiseSynth.
    this.hat.triggerAttackRelease("G5", "32n", time, velocity);
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
    this.kick.dispose();
    this.snare.dispose();
    this.hat.dispose();
    this.output.dispose();
  }
}
