"use client";

import type { CSSProperties } from "react";

import { summarizeAutomationLaneValues } from "@/lib/studio/automationDisplay";
import type { AutomationLane } from "@/types";

interface AutomationClipBlockProps {
  lane: AutomationLane;
  onSelectClip: (clipId: string) => void;
  selected?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Automation lane visual block in the arrangement timeline.
 */
export function AutomationClipBlock({
  lane,
  onSelectClip,
  selected = false,
  className = "",
  style,
}: AutomationClipBlockProps) {
  const minBar = Math.min(...lane.points.map((point) => point.bar));
  const maxBar = Math.max(...lane.points.map((point) => point.bar));
  const valueReadout = summarizeAutomationLaneValues(lane);
  const sourceLabel = lane.variantId ?? lane.clipId;

  return (
    <button
      type="button"
      className={[
        "rounded border border-fuchsia-400/50 bg-fuchsia-500/15 px-1 py-0.5 text-left text-[10px] font-medium text-fuchsia-100",
        selected ? "ring-1 ring-fuchsia-200" : "",
        className,
      ].join(" ")}
      style={style}
      title={`${lane.trackId}/${lane.target}${sourceLabel ? ` · ${sourceLabel}` : ""} · ${valueReadout} · bars ${Number.isFinite(minBar) ? minBar + 1 : 1}–${Number.isFinite(maxBar) ? maxBar + 1 : 1}`}
      onClick={() => onSelectClip(lane.id)}
    >
      <span className="block truncate leading-tight">{lane.target}</span>
      {sourceLabel ? (
        <span className="block truncate text-[9px] leading-tight text-fuchsia-200/80">
          {sourceLabel}
        </span>
      ) : null}
      <span className="mt-0.5 block font-mono text-[10px] leading-none tabular-nums text-lime-200">
        {valueReadout}
      </span>
      <span className="mt-0.5 block truncate text-[9px] font-normal text-fuchsia-200/80">
        b{Number.isFinite(minBar) ? minBar + 1 : 1}–{Number.isFinite(maxBar) ? maxBar + 1 : 1}
      </span>
    </button>
  );
}
