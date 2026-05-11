export const ARRANGEMENT_STEPS_PER_BAR = 16;

/**
 * Pixel-independent placement data for a bar-spanning arrangement item.
 */
export interface ArrangementGridSpan {
  startBar: number;
  bars: number;
  leftPercent: number;
  widthPercent: number;
}

/**
 * Clamps a clip or asset bar range to the visible selected-section grid.
 */
export function getArrangementGridSpan(
  startBar: number,
  bars: number,
  totalBars: number,
): ArrangementGridSpan | null {
  const visibleBars = Math.max(1, totalBars);
  const start = Math.max(0, startBar);
  const end = Math.min(visibleBars, Math.max(start, startBar + Math.max(0, bars)));
  const width = end - start;

  if (width <= 0 || start >= visibleBars) {
    return null;
  }

  return {
    startBar: start,
    bars: width,
    leftPercent: (start / visibleBars) * 100,
    widthPercent: (width / visibleBars) * 100,
  };
}

/**
 * Converts section-local transport coordinates into a left percentage.
 */
export function getArrangementPlayheadPercent(
  localBar: number,
  localStep: number,
  totalBars: number,
): number | null {
  const visibleBars = Math.max(1, totalBars);
  if (localBar < 0 || localBar >= visibleBars) {
    return null;
  }

  const step = Math.max(0, Math.min(ARRANGEMENT_STEPS_PER_BAR - 1, localStep));
  return ((localBar + step / ARRANGEMENT_STEPS_PER_BAR) / visibleBars) * 100;
}
