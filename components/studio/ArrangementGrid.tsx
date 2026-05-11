"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, DragEvent } from "react";

import { AudioAssetBlock } from "@/components/studio/AudioAssetBlock";
import { AutomationClipBlock } from "@/components/studio/AutomationClipBlock";
import { PatternClipBlock } from "@/components/studio/PatternClipBlock";
import {
  getArrangementGridSpan,
  getArrangementPlayheadPercent,
} from "@/lib/arrangement/grid";
import {
  automationTargetShortLabel,
  summarizeAutomationLaneValues,
} from "@/lib/studio/automationDisplay";
import {
  getArrangementSectionBarOffsets,
  mapArrangementStep,
  orderedArrangementSections,
  resolveGlobalBarToSectionLocal,
} from "@/lib/arrangement/timeline";
import { useArrangementStore } from "@/stores/arrangementStore";
import type {
  ArrangementAssetClip,
  ArrangementClip,
  ArrangementSection,
  AutomationLane,
  SongArrangement,
  Track,
} from "@/types";

interface ArrangementGridProps {
  sections: ArrangementSection[];
  sectionOrder: string[];
  tracks: Track[];
  selectedSectionId: string | null;
  selectedClipId: string | null;
  onSelectSection: (sectionId: string) => void;
  onSelectClip: (clipId: string) => void;
  onPlacePatternClip: (
    sectionId: string,
    trackId: string,
    variantId: string,
    startBar: number,
    bars: number,
  ) => void;
  onAddAsset: (
    sectionId: string,
    asset: {
      kind: "audio" | "midi";
      label: string;
      startBar: number;
      bars: number;
      trackId?: string;
    },
  ) => void;
}

interface ArrangementGridRowProps {
  sections: ArrangementSection[];
  sectionOrder: string[];
  orderedSections: ArrangementSection[];
  sectionOffsets: Map<string, number>;
  totalBars: number;
  track: Track;
  selectedClipId: string | null;
  hoveredSlot: string | null;
  onHoverSlot: (slotKey: string | null) => void;
  onSelectClip: (clipId: string) => void;
  onPlacePatternClip: ArrangementGridProps["onPlacePatternClip"];
  onAddAsset: ArrangementGridProps["onAddAsset"];
}

interface PatternDragPayload {
  trackId: string;
  variantId: string;
}

const MIN_BAR_WIDTH = 84;
const LANE_HEADER_WIDTH = 156;
/** Pixel offset below the dual-row timeline header (section strip + bar numbers). */
const HEADER_HEIGHT = 100;

function isPatternDragPayload(value: unknown): value is PatternDragPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<PatternDragPayload>;
  return typeof candidate.trackId === "string" && typeof candidate.variantId === "string";
}

function readPatternDragPayload(event: DragEvent): PatternDragPayload | null {
  const raw =
    event.dataTransfer.getData("application/riddim-pattern") ||
    event.dataTransfer.getData("text/plain");
  if (!raw.trim().startsWith("{")) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return isPatternDragPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function clipStyle(startBar: number, bars: number, totalBars: number, top: number): CSSProperties {
  const span = getArrangementGridSpan(startBar, bars, totalBars);
  if (!span) {
    return { display: "none" };
  }

  return {
    left: `${span.leftPercent}%`,
    top,
    width: `calc(${span.widthPercent}% - 6px)`,
  };
}

function automationSpan(lane: AutomationLane): { startBar: number; bars: number } | null {
  if (lane.points.length === 0) {
    return null;
  }

  const minBar = Math.min(...lane.points.map((point) => point.bar));
  const maxBar = Math.max(...lane.points.map((point) => point.bar));
  return { startBar: Math.floor(minBar), bars: Math.max(1, Math.ceil(maxBar - minBar + 1)) };
}

const ArrangementGridRow = memo(function ArrangementGridRow({
  sections,
  sectionOrder,
  orderedSections,
  sectionOffsets,
  totalBars,
  track,
  selectedClipId,
  hoveredSlot,
  onHoverSlot,
  onSelectClip,
  onPlacePatternClip,
  onAddAsset,
}: ArrangementGridRowProps) {
  const handleDrop = (event: DragEvent<HTMLDivElement>, globalBarIndex: number): void => {
    event.preventDefault();
    onHoverSlot(null);

    const resolved = resolveGlobalBarToSectionLocal(sections, sectionOrder, globalBarIndex);
    if (!resolved) {
      return;
    }

    const payload = readPatternDragPayload(event);
    if (payload) {
      onPlacePatternClip(
        resolved.sectionId,
        payload.trackId,
        payload.variantId,
        resolved.localBar,
        1,
      );
    }

    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }

    const lower = file.name.toLowerCase();
    const kind = lower.endsWith(".mid") || lower.endsWith(".midi") ? "midi" : "audio";
    onAddAsset(resolved.sectionId, {
      kind,
      label: file.name,
      startBar: resolved.localBar,
      bars: 1,
      trackId: track.id,
    });
  };

  const rowAutomationBySection = useMemo(() => {
    return orderedSections.map((section) => ({
      section,
      lanes: section.automationLanes.filter((lane) => lane.trackId === track.id),
    }));
  }, [orderedSections, track.id]);

  const rowPatternsAndAssets = useMemo(() => {
    const patterns: Array<{ clip: ArrangementClip; globalStart: number }> = [];
    const assets: Array<{ asset: ArrangementAssetClip; globalStart: number }> = [];

    for (const section of orderedSections) {
      const offset = sectionOffsets.get(section.id) ?? 0;
      for (const clip of section.clips) {
        if (clip.trackId === track.id) {
          patterns.push({ clip, globalStart: offset + clip.startBar });
        }
      }
      for (const asset of section.assets) {
        if (asset.trackId === undefined || asset.trackId === track.id) {
          assets.push({ asset, globalStart: offset + asset.startBar });
        }
      }
    }

    return { patterns, assets };
  }, [orderedSections, sectionOffsets, track.id]);

  const automationBlocks = useMemo(() => {
    const blocks: Array<{ lane: AutomationLane; globalStart: number }> = [];
    for (const { section, lanes } of rowAutomationBySection) {
      const offset = sectionOffsets.get(section.id) ?? 0;
      for (const lane of lanes) {
        const span = automationSpan(lane);
        if (!span) {
          continue;
        }
        blocks.push({ lane, globalStart: offset + span.startBar });
      }
    }
    return blocks;
  }, [rowAutomationBySection, sectionOffsets]);

  const rowAutomationFlat = useMemo(
    () => rowAutomationBySection.flatMap((entry) => entry.lanes),
    [rowAutomationBySection],
  );

  return (
    <div className="contents">
      <div className="sticky left-0 z-20 flex min-h-[76px] items-start border-r border-zinc-800 bg-zinc-950/95 px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-bold text-zinc-100">{track.name}</div>
          <div className="mt-1 text-[9px] uppercase tracking-[0.18em] text-zinc-600">
            {track.role ?? track.type}
          </div>
          {rowAutomationFlat.length > 0 ? (
            <div className="mt-1.5 space-y-0.5 border-t border-zinc-800/80 pt-1.5">
              {rowAutomationFlat.map((lane) => (
                <div
                  key={lane.id}
                  className="flex min-w-0 items-baseline justify-between gap-1 text-[9px] leading-tight"
                >
                  <span className="shrink-0 text-zinc-500">
                    {automationTargetShortLabel(lane.target)}
                  </span>
                  <span className="truncate font-mono tabular-nums text-lime-200">
                    {summarizeAutomationLaneValues(lane)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div
        className="relative min-h-[76px] overflow-hidden border-b border-zinc-900 bg-zinc-950"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(113,113,122,0.18) 1px, transparent 1px), repeating-linear-gradient(to right, transparent 0, transparent calc(6.25% - 1px), rgba(113,113,122,0.08) calc(6.25% - 1px), rgba(113,113,122,0.08) 6.25%)",
          backgroundSize: `${MIN_BAR_WIDTH}px 100%, ${MIN_BAR_WIDTH}px 100%`,
        }}
      >
        {orderedSections.slice(0, -1).map((section) => {
          const offset = (sectionOffsets.get(section.id) ?? 0) + section.bars;
          return (
            <div
              key={`sep-${section.id}`}
              className="pointer-events-none absolute inset-y-0 z-[5] w-px bg-zinc-600"
              style={{ left: `${(offset / totalBars) * 100}%` }}
              aria-hidden
            />
          );
        })}

        {Array.from({ length: totalBars }).map((_, globalBarIndex) => {
          const slotKey = `${track.id}:${globalBarIndex}`;
          const hovered = hoveredSlot === slotKey;
          return (
            <div
              key={slotKey}
              className={[
                "absolute inset-y-1 rounded border border-transparent transition-colors",
                hovered ? "border-lime-300/70 bg-lime-300/10" : "hover:bg-zinc-800/20",
              ].join(" ")}
              style={{
                left: `${(globalBarIndex / totalBars) * 100}%`,
                width: `${100 / totalBars}%`,
              }}
              onDragEnter={() => onHoverSlot(slotKey)}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
                onHoverSlot(slotKey);
              }}
              onDragLeave={() => {
                if (hovered) {
                  onHoverSlot(null);
                }
              }}
              onDrop={(event) => handleDrop(event, globalBarIndex)}
            />
          );
        })}

        {rowPatternsAndAssets.patterns.map(({ clip, globalStart }) => (
          <PatternClipBlock
            key={clip.id}
            clip={clip}
            selected={clip.id === selectedClipId}
            onSelectClip={onSelectClip}
            className="absolute z-10 h-7 shadow-[0_8px_18px_rgba(132,204,22,0.12)]"
            style={clipStyle(globalStart, clip.bars, totalBars, 8)}
          />
        ))}

        {rowPatternsAndAssets.assets.map(({ asset, globalStart }) => (
          <AudioAssetBlock
            key={asset.id}
            asset={asset}
            selected={asset.id === selectedClipId}
            onSelectClip={onSelectClip}
            className="absolute z-10 h-6 shadow-[0_8px_18px_rgba(56,189,248,0.1)]"
            style={clipStyle(globalStart, asset.bars, totalBars, 38)}
          />
        ))}

        {automationBlocks.map(({ lane, globalStart }) => {
          const span = automationSpan(lane);
          if (!span) {
            return null;
          }
          return (
            <AutomationClipBlock
              key={lane.id}
              lane={lane}
              selected={lane.id === selectedClipId}
              onSelectClip={onSelectClip}
              className="absolute z-10 min-h-[44px] shadow-[0_8px_18px_rgba(217,70,239,0.1)]"
              style={clipStyle(globalStart, span.bars, totalBars, 58)}
            />
          );
        })}
      </div>
    </div>
  );
});

interface ArrangementGridPlayheadProps {
  totalBars: number;
}

/**
 * Limits transport-driven commits to animation frames — Tone subdivisions often exceed display refresh rate.
 */
function useArrangementStepOnRaf(arrangement: SongArrangement | null): number {
  const [absoluteStep, setAbsoluteStep] = useState(
    () => useArrangementStore.getState().absoluteStep,
  );
  const rafRef = useRef(0);

  useEffect(() => {
    queueMicrotask(() => {
      setAbsoluteStep(useArrangementStore.getState().absoluteStep);
    });
  }, [arrangement]);

  useEffect(() => {
    const pump = (): void => {
      rafRef.current = 0;
      setAbsoluteStep(useArrangementStore.getState().absoluteStep);
    };

    const schedule = (): void => {
      if (rafRef.current !== 0) {
        return;
      }
      rafRef.current = requestAnimationFrame(pump);
    };

    schedule();
    const unsub = useArrangementStore.subscribe(schedule);
    return () => {
      unsub();
      if (rafRef.current !== 0) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, []);

  return absoluteStep;
}

const ArrangementGridPlayhead = memo(function ArrangementGridPlayhead({
  totalBars,
}: ArrangementGridPlayheadProps) {
  const arrangement = useArrangementStore((state) => state.arrangement);
  const absoluteStep = useArrangementStepOnRaf(arrangement);

  const sectionOffsets = useMemo(() => {
    if (!arrangement) {
      return new Map<string, number>();
    }
    return getArrangementSectionBarOffsets(arrangement.sections, arrangement.sectionOrder);
  }, [arrangement]);

  const lineStyle = useMemo((): CSSProperties | null => {
    if (!arrangement || totalBars < 1) {
      return null;
    }

    const mapped = mapArrangementStep(arrangement, absoluteStep);
    const offset = sectionOffsets.get(mapped.sectionId) ?? 0;
    const globalBar = offset + mapped.localBar;

    const percent = getArrangementPlayheadPercent(globalBar, mapped.localStep, totalBars);
    if (percent === null) {
      return null;
    }

    const timelineWidth = totalBars * MIN_BAR_WIDTH;
    const xOffset = LANE_HEADER_WIDTH + (percent / 100) * timelineWidth;

    return {
      top: HEADER_HEIGHT,
      bottom: 0,
      left: 0,
      width: "1px",
      transform: `translate3d(${String(xOffset)}px, 0, 0)`,
      willChange: "transform",
    };
  }, [absoluteStep, arrangement, sectionOffsets, totalBars]);

  if (!lineStyle) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute z-40 bg-lime-300 shadow-[0_0_18px_rgba(190,242,100,0.7)]"
      style={lineStyle}
      aria-hidden="true"
    >
      <div className="absolute -top-2 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-lime-300" />
    </div>
  );
});

/**
 * Full-song playlist grid: every section is laid out contiguously in song order (single scroll surface).
 */
export function ArrangementGrid({
  sections,
  sectionOrder,
  tracks,
  selectedSectionId,
  selectedClipId,
  onSelectSection,
  onSelectClip,
  onPlacePatternClip,
  onAddAsset,
}: ArrangementGridProps) {
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);

  const { orderedSections, sectionOffsets, totalBars } = useMemo(() => {
    const ordered = orderedArrangementSections(sections, sectionOrder);
    const offsets = getArrangementSectionBarOffsets(sections, sectionOrder);
    const total = ordered.reduce((acc, section) => acc + section.bars, 0);
    return {
      orderedSections: ordered,
      sectionOffsets: offsets,
      totalBars: Math.max(1, total),
    };
  }, [sections, sectionOrder]);

  if (orderedSections.length === 0) {
    return null;
  }

  const headerSectionSelection =
    selectedSectionId ?? orderedSections[0]?.id ?? null;

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950">
      <div
        className="relative grid min-w-[900px]"
        style={{
          gridTemplateColumns: `${LANE_HEADER_WIDTH}px ${totalBars * MIN_BAR_WIDTH}px`,
        }}
      >
        <div className="sticky left-0 z-30 border-b border-r border-zinc-800 bg-zinc-900 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">
          Tracks
        </div>
        <div className="relative min-w-0 border-b border-zinc-800 bg-zinc-900/70">
          <div
            className="grid border-b border-zinc-800 bg-zinc-900"
            style={{
              gridTemplateColumns: `repeat(${totalBars}, minmax(${MIN_BAR_WIDTH}px, 1fr))`,
            }}
          >
            {orderedSections.map((section, index) => {
              const offset = sectionOffsets.get(section.id) ?? 0;
              const startCol = offset + 1;
              const selected = section.id === headerSectionSelection;
              const isLast = index === orderedSections.length - 1;
              return (
                <button
                  key={section.id}
                  type="button"
                  style={{ gridColumn: `${startCol} / span ${section.bars}` }}
                  className={[
                    "flex flex-col items-start px-2 py-2 text-left transition-colors",
                    selected ? "bg-lime-400/15 text-lime-100" : "text-zinc-300 hover:bg-zinc-800/60",
                    !isLast ? "border-r border-zinc-600" : "",
                  ].join(" ")}
                  onClick={() => onSelectSection(section.id)}
                >
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em]">
                    {section.name}
                  </span>
                  <span className="text-[10px] text-zinc-500">{section.bars} bars</span>
                </button>
              );
            })}
          </div>
          <div
            className="grid bg-zinc-900/70"
            style={{
              gridTemplateColumns: `repeat(${totalBars}, minmax(${MIN_BAR_WIDTH}px, 1fr))`,
            }}
          >
            {Array.from({ length: totalBars }).map((_, barIndex) => {
              const resolved = resolveGlobalBarToSectionLocal(sections, sectionOrder, barIndex);
              const showDivider =
                resolved &&
                resolved.localBar === 0 &&
                sectionOffsets.get(resolved.sectionId) === barIndex &&
                barIndex > 0;

              return (
                <div
                  key={`bar-${barIndex}`}
                  className={[
                    "border-r border-zinc-800 px-2 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500",
                    showDivider ? "border-l border-l-zinc-600" : "",
                  ].join(" ")}
                >
                  {barIndex + 1}
                </div>
              );
            })}
          </div>
        </div>

        {tracks.map((track) => (
          <ArrangementGridRow
            key={track.id}
            sections={sections}
            sectionOrder={sectionOrder}
            orderedSections={orderedSections}
            sectionOffsets={sectionOffsets}
            totalBars={totalBars}
            track={track}
            selectedClipId={selectedClipId}
            hoveredSlot={hoveredSlot}
            onHoverSlot={setHoveredSlot}
            onSelectClip={onSelectClip}
            onPlacePatternClip={onPlacePatternClip}
            onAddAsset={onAddAsset}
          />
        ))}
        <ArrangementGridPlayhead totalBars={totalBars} />
      </div>
    </div>
  );
}
