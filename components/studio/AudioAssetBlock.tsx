"use client";

import type { CSSProperties } from "react";

import type { ArrangementAssetClip } from "@/types";

interface AudioAssetBlockProps {
  asset: ArrangementAssetClip;
  onSelectClip: (clipId: string) => void;
  selected?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Audio or MIDI asset visual block in the arrangement timeline.
 */
export function AudioAssetBlock({
  asset,
  onSelectClip,
  selected = false,
  className = "",
  style,
}: AudioAssetBlockProps) {
  return (
    <button
      type="button"
      className={[
        "truncate rounded border border-sky-400/50 bg-sky-500/15 px-1 py-1 text-left text-[10px] font-medium text-sky-100",
        selected ? "ring-1 ring-sky-200" : "",
        className,
      ].join(" ")}
      style={style}
      title={asset.label}
      onClick={() => onSelectClip(asset.id)}
    >
      {asset.kind.toUpperCase()} · {asset.label}
    </button>
  );
}
