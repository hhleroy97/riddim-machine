"use client";

import type { CSSProperties } from "react";

import type { ArrangementClip } from "@/types";

interface PatternClipBlockProps {
  clip: ArrangementClip;
  onSelectClip: (clipId: string) => void;
  selected?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Pattern clip visual block in the arrangement timeline.
 */
export function PatternClipBlock({
  clip,
  onSelectClip,
  selected = false,
  className = "",
  style,
}: PatternClipBlockProps) {
  return (
    <button
      type="button"
      className={[
        "truncate rounded border border-lime-400/50 bg-lime-500/20 px-1 py-1 text-left text-[10px] font-semibold text-lime-100",
        selected ? "ring-1 ring-lime-200" : "",
        className,
      ].join(" ")}
      style={style}
      title={`${clip.trackId}/${clip.variantId}`}
      onClick={() => onSelectClip(clip.id)}
    >
      {clip.variantId}
    </button>
  );
}
