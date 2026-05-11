import type {
  ArrangementSection,
  AutomationPoint,
  SongArrangement,
  Track,
} from "@/types";

const STEPS_PER_BAR = 16;

/**
 * Section-local transport resolved from the global arrangement counter.
 */
export interface ArrangementStepMap {
  sectionId: string;
  localStep: number;
  localBar: number;
}

function computeMapArrangementStep(
  arrangement: SongArrangement,
  absoluteStep: number,
): ArrangementStepMap {
  const totalSteps = Math.max(1, arrangement.totalBars * STEPS_PER_BAR);
  const normalized = ((absoluteStep % totalSteps) + totalSteps) % totalSteps;

  let cursor = 0;
  for (const sectionId of arrangement.sectionOrder) {
    const section = arrangement.sections.find((candidate) => candidate.id === sectionId);
    if (!section) {
      continue;
    }

    const sectionSteps = section.bars * STEPS_PER_BAR;
    if (normalized < cursor + sectionSteps) {
      const local = normalized - cursor;
      return {
        sectionId,
        localStep: local % STEPS_PER_BAR,
        localBar: Math.floor(local / STEPS_PER_BAR),
      };
    }
    cursor += sectionSteps;
  }

  return {
    sectionId: arrangement.sectionOrder[0] ?? "section-a",
    localStep: normalized % STEPS_PER_BAR,
    localBar: 0,
  };
}

let mapArrangementStepCache: {
  arrangement: SongArrangement;
  absoluteStep: number;
  result: ArrangementStepMap;
} | null = null;

/**
 * Resolves section + local step from absolute arrangement step.
 * Reuses the last result when `(arrangement, absoluteStep)` matches — hot path for transport.
 * Assumes immutable `SongArrangement` snapshots from the store (new object on edit); do not mutate a cached arrangement reference in-place.
 */
export function mapArrangementStep(
  arrangement: SongArrangement,
  absoluteStep: number,
): ArrangementStepMap {
  if (
    mapArrangementStepCache !== null &&
    mapArrangementStepCache.arrangement === arrangement &&
    mapArrangementStepCache.absoluteStep === absoluteStep
  ) {
    return mapArrangementStepCache.result;
  }

  const result = computeMapArrangementStep(arrangement, absoluteStep);
  mapArrangementStepCache = { arrangement, absoluteStep, result };
  return result;
}

function sectionById(
  arrangement: SongArrangement,
  sectionId: string,
): ArrangementSection | null {
  return arrangement.sections.find((section) => section.id === sectionId) ?? null;
}

/**
 * Creates section-scoped track view by selecting clip variants.
 */
export function buildSectionTrackView(
  tracks: Track[],
  arrangement: SongArrangement,
  sectionId: string,
  localBar = 0,
): Track[] {
  const section = sectionById(arrangement, sectionId);
  if (!section) {
    return tracks;
  }

  return tracks.map((track) => {
    const trackClips = section.clips.filter(
      (candidate) => candidate.trackId === track.id,
    );
    const clip = trackClips.find(
      (candidate) =>
        localBar >= candidate.startBar &&
        localBar < candidate.startBar + candidate.bars,
    );
    if (!clip) {
      if (trackClips.length === 0) {
        return track;
      }

      // Explicit section clips exist for this track, so silence uncovered bars.
      return {
        ...track,
        steps: track.steps.map((step) => ({ ...step, active: false })),
        mute: true,
      };
    }

    const variant = track.clipVariants?.[clip.variantId] ?? track.steps;
    return {
      ...track,
      steps: variant,
      mute: clip.muted ? true : track.mute,
    };
  });
}

/**
 * Resolves a normalized automation value for the requested bar.
 */
export function resolveAutomationValueAtBar(
  points: AutomationPoint[],
  bar: number,
): number | null {
  if (points.length === 0) {
    return null;
  }

  const ordered = [...points].sort((a, b) => a.bar - b.bar);
  const clampedBar = Math.max(0, bar);
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  if (!first || !last) {
    return null;
  }
  if (clampedBar <= first.bar) {
    return first.value;
  }
  if (clampedBar >= last.bar) {
    return last.value;
  }

  for (let index = 0; index < ordered.length - 1; index += 1) {
    const left = ordered[index];
    const right = ordered[index + 1];
    if (!left || !right) {
      continue;
    }
    if (clampedBar < left.bar || clampedBar > right.bar) {
      continue;
    }

    const span = right.bar - left.bar;
    if (span <= 0) {
      return right.value;
    }
    const ratio = (clampedBar - left.bar) / span;
    return left.value + (right.value - left.value) * ratio;
  }

  return last.value;
}

/**
 * Recomputes total bars from section order.
 */
export function computeArrangementTotalBars(arrangement: SongArrangement): number {
  return arrangement.sectionOrder
    .map((sectionId) => arrangement.sections.find((section) => section.id === sectionId))
    .filter((section): section is ArrangementSection => Boolean(section))
    .reduce((acc, section) => acc + section.bars, 0);
}

/**
 * Sections in playback order (skips unknown ids).
 */
export function orderedArrangementSections(
  sections: ArrangementSection[],
  sectionOrder: string[],
): ArrangementSection[] {
  return sectionOrder
    .map((sectionId) => sections.find((section) => section.id === sectionId))
    .filter((section): section is ArrangementSection => Boolean(section));
}

/**
 * Starting global bar index per section id for ordered playback.
 */
export function getArrangementSectionBarOffsets(
  sections: ArrangementSection[],
  sectionOrder: string[],
): Map<string, number> {
  const offsets = new Map<string, number>();
  let cursor = 0;
  for (const sectionId of sectionOrder) {
    const section = sections.find((item) => item.id === sectionId);
    if (!section) {
      continue;
    }
    offsets.set(sectionId, cursor);
    cursor += section.bars;
  }
  return offsets;
}

/**
 * Result of mapping a timeline-wide bar index into a section clip coordinate space.
 */
export interface GlobalBarResolution {
  sectionId: string;
  localBar: number;
}

/**
 * Maps a zero-based global bar (full song) to section id + section-local bar for drops and edits.
 */
export function resolveGlobalBarToSectionLocal(
  sections: ArrangementSection[],
  sectionOrder: string[],
  globalBarIndex: number,
): GlobalBarResolution | null {
  let cursor = 0;
  for (const sectionId of sectionOrder) {
    const section = sections.find((item) => item.id === sectionId);
    if (!section) {
      continue;
    }
    const next = cursor + section.bars;
    if (globalBarIndex >= cursor && globalBarIndex < next) {
      return { sectionId, localBar: globalBarIndex - cursor };
    }
    cursor = next;
  }
  return null;
}
