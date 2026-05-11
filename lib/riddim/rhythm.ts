import type { Step } from "@/types";

/**
 * Create an empty multi-bar step buffer.
 */
export function makeEmptySteps(bars: number): Step[] {
  return Array.from({ length: bars * 16 }, () => ({ active: false, note: "C2", velocity: 0 }));
}

/**
 * Keep rhythmic material inside the rendered bar span.
 */
export function wrapStep(step: number, bars: number): number {
  const totalSteps = Math.max(16, bars * 16);
  return ((Math.round(step) % totalSteps) + totalSteps) % totalSteps;
}

/**
 * Render half-time drum grammar with section energy shaping.
 */
export function renderDrumSteps(
  bars: number,
  note: string,
  requestedSteps: number[],
  energy: number,
): Step[] {
  const steps = makeEmptySteps(bars);
  const totalSteps = bars * 16;
  const defaults = note === "D2" ? [4, 12] : note === "F#2" ? [2, 6, 10, 14] : [0, 10];
  const source = requestedSteps.length > 0 ? requestedSteps : defaults;
  source.forEach((step) => {
    const index = wrapStep(step, bars);
    steps[index] = { active: true, note, velocity: Math.min(1, 0.55 + energy * 0.4) };
  });
  if (note === "F#2" && energy > 0.65) {
    for (let index = 0; index < totalSteps; index += 4) {
      if (!steps[index]?.active) {
        steps[index] = { active: true, note, velocity: 0.35 + energy * 0.25 };
      }
    }
  }
  return steps;
}
