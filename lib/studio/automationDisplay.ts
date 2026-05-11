import { formatKnobDisplay } from "./knobFormat";
import type { AutomationLane, AutomationPoint } from "@/types";

/**
 * Normalized arrangement automation (0–1) mapped to readable units
 * (matches studio preview scaling: Hz / Q / seconds / %).
 */
function formatAutomationAtNormalized(
  target: AutomationLane["target"],
  normalized: number,
): string {
  const n = Math.max(0, Math.min(1, normalized));

  switch (target) {
    case "fx.drive":
    case "fx.chorusMix":
    case "fx.stereoWidth":
    case "amp.sustain":
      return formatKnobDisplay(n, 0, 1, 0.01);
    case "amp.attack":
    case "amp.decay":
    case "amp.release": {
      const seconds = n * 2;
      return `${seconds.toFixed(2)}s`;
    }
    case "filter.cutoff": {
      const hz = 80 + n * 12000;
      return formatKnobDisplay(hz, 40, 18000, 20);
    }
    case "filter.resonance": {
      const q = 0.1 + n * 12;
      return formatKnobDisplay(q, 0.1, 16, 0.1);
    }
  }
}

/**
 * Compact label for automation target (shown beside numeric readouts).
 */
export function automationTargetShortLabel(target: AutomationLane["target"]): string {
  const parts = target.split(".");
  return parts[parts.length - 1] ?? target;
}

/**
 * Formats one automation lane’s point values as a single readout line
 * (single value or `lo–hi` range), using the same semantics as rotary readouts.
 */
export function summarizeAutomationLaneValues(lane: Pick<AutomationLane, "target" | "points">): string {
  if (lane.points.length === 0) {
    return "—";
  }
  const values = lane.points.map((point: AutomationPoint) => point.value);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  if (Math.abs(lo - hi) < 1e-9) {
    return formatAutomationAtNormalized(lane.target, lo);
  }
  return `${formatAutomationAtNormalized(lane.target, lo)}–${formatAutomationAtNormalized(lane.target, hi)}`;
}
