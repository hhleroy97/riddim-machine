import { clampOctave, degreeToNote } from "@/lib/riddim/theory";
import { makeEmptySteps, renderDrumSteps, wrapStep } from "@/lib/riddim/rhythm";
import type { HarmonicPlan, MotifPlan, PhraseEvent, Step } from "@/types";

export interface RenderedPhrases {
  bass: Step[];
  lead: Step[];
  chords: Step[];
  kick: Step[];
  snare: Step[];
  hats: Step[];
}

function eventToStep(plan: HarmonicPlan, event: PhraseEvent, minOctave: number, maxOctave: number): Step {
  if (event.articulation === "silence") {
    return { active: false, note: degreeToNote(plan, "1", minOctave), velocity: 0 };
  }
  return {
    active: true,
    note: degreeToNote(plan, event.degree, clampOctave(event.octave, minOctave, maxOctave)),
    velocity: Math.max(0.1, Math.min(1, event.velocity)),
  };
}

function renderEvents(
  plan: HarmonicPlan,
  events: PhraseEvent[],
  bars: number,
  minOctave: number,
  maxOctave: number,
): Step[] {
  const steps = makeEmptySteps(bars);
  events.forEach((event) => {
    const position = wrapStep(event.step, bars);
    const rendered = eventToStep(plan, event, minOctave, maxOctave);
    if (rendered.active) {
      steps[position] = rendered;
    }
  });
  return steps;
}

/**
 * Render AI motif intent into role-specific sequencer patterns.
 */
export function renderMotifPhrases(
  harmonicPlan: HarmonicPlan,
  motifPlan: MotifPlan,
  bars: number,
  energy: number,
): RenderedPhrases {
  return {
    bass: renderEvents(harmonicPlan, motifPlan.bass.events, bars, 1, 3),
    lead: renderEvents(harmonicPlan, motifPlan.lead.events, bars, 3, 5),
    chords: renderEvents(harmonicPlan, motifPlan.chords.events, bars, 3, 5),
    kick: renderDrumSteps(bars, "C2", motifPlan.drums.kickSteps, energy),
    snare: renderDrumSteps(bars, "D2", motifPlan.drums.snareSteps, energy),
    hats: renderDrumSteps(bars, "F#2", motifPlan.drums.hatSteps, energy),
  };
}
