/**
 * Readable value line for rotary knobs (hz, percent, bipolar %, seconds, etc.).
 */
export function formatKnobDisplay(value: number, min: number, max: number, step: number): string {
  const clamped = Math.min(max, Math.max(min, value));

  if (min === -1 && max === 1) {
    const p = Math.round(clamped * 100);
    if (p === 0) return "0%";
    return `${p > 0 ? "+" : ""}${p}%`;
  }

  if (min === 0 && max === 1) {
    return `${Math.round(clamped * 100)}%`;
  }

  if (max >= 2000 && min <= 200) {
    const v = Math.round(clamped);
    if (v >= 10000) return `${(v / 1000).toFixed(1)}k`;
    return `${v}`;
  }

  if (step >= 1 && max >= 100) {
    return `${Math.round(clamped)}`;
  }

  if (max <= 2.5 && min > 0 && min < 0.1) {
    return `${clamped.toFixed(3)}s`;
  }

  if (max <= 2.5 && min >= 0.01 && !(min === 0 && max === 1)) {
    return `${clamped.toFixed(min < 0.05 ? 3 : 2)}s`;
  }

  if (step >= 0.1 && step < 1) {
    return clamped.toFixed(1);
  }

  if (step >= 0.01 && step < 0.1) {
    return clamped.toFixed(2);
  }

  return `${Math.round(clamped * 1000) / 1000}`;
}
