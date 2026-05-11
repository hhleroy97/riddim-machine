"use client";

import { useMemo, useRef } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";

import { formatKnobDisplay } from "@/lib/studio/knobFormat";

const VIEW = 100;
const CX = VIEW / 2;
const CY = VIEW / 2;
const ARC_R = 38;
const POINTER_INNER = 10;
const POINTER_OUTER = 34;
/** Degrees: min at lower-left sweep through top to max at lower-right (260° travel). */
const ANGLE_MIN = -130;
const ANGLE_MAX = 130;
const ANGLE_SWEEP = ANGLE_MAX - ANGLE_MIN;

interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** Override auto formatting for the value readout under the dial. */
  formatValue?: (value: number) => string;
}

/**
 * Maps knob angle (0 = up, + = clockwise) to SVG coordinates.
 */
function polar(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
}

/**
 * Circular arc path between two angles (same convention as {@link polar}).
 */
function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p0 = polar(cx, cy, r, a0);
  const p1 = polar(cx, cy, r, a1);
  const delta = a1 - a0;
  const largeArc = Math.abs(delta) > 180 ? 1 : 0;
  const sweep = delta >= 0 ? 1 : 0;
  return `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${p1.x} ${p1.y}`;
}

/**
 * Mouse-drag rotary knob: SVG needle pivots from the true center; arc shows value travel.
 */
export function Knob({ label, value, min, max, step = 0.01, onChange, formatValue }: KnobProps) {
  const startValueRef = useRef(value);
  const startYRef = useRef(0);

  const normalized = useMemo(() => {
    const t = max === min ? 0 : (value - min) / (max - min);
    return Math.min(1, Math.max(0, t));
  }, [max, min, value]);

  const pointerAngle = ANGLE_MIN + normalized * ANGLE_SWEEP;

  const trackPath = useMemo(() => arcPath(CX, CY, ARC_R, ANGLE_MIN, ANGLE_MAX), []);
  const valuePath = useMemo(() => arcPath(CX, CY, ARC_R, ANGLE_MIN, pointerAngle), [pointerAngle]);

  const display = formatValue ? formatValue(value) : formatKnobDisplay(value, min, max, step);

  const pointerLine = useMemo(() => {
    const outer = polar(CX, CY, POINTER_OUTER, pointerAngle);
    const inner = polar(CX, CY, POINTER_INNER, pointerAngle);
    return { x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y };
  }, [pointerAngle]);

  const onMouseDown = (event: ReactMouseEvent<HTMLButtonElement>) => {
    startYRef.current = event.clientY;
    startValueRef.current = value;

    const onMouseMove = (moveEvent: globalThis.MouseEvent) => {
      const delta = startYRef.current - moveEvent.clientY;
      const next = Math.max(
        min,
        Math.min(max, startValueRef.current + delta * ((max - min) / 200)),
      );
      const snapped = Math.round(next / step) * step;
      onChange(Number(snapped.toFixed(5)));
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div className="flex w-[52px] flex-col items-center gap-0.5">
      <button
        type="button"
        onMouseDown={onMouseDown}
        className="flex h-[52px] w-[52px] touch-manipulation items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 shadow-inner outline-none ring-lime-400/35 focus-visible:ring-2"
        aria-label={label}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Number.isFinite(value) ? value : 0}
        aria-valuetext={display}
      >
        <svg
          width="48"
          height="48"
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          className="pointer-events-none"
          aria-hidden
        >
          <circle cx={CX} cy={CY} r={ARC_R - 5} fill="#18181b" stroke="#27272a" strokeWidth="1" />

          <path d={trackPath} fill="none" stroke="#3f3f46" strokeWidth="5" strokeLinecap="round" />

          <path d={valuePath} fill="none" stroke="#bef264" strokeWidth="5" strokeLinecap="round" />

          <line
            x1={pointerLine.x1}
            y1={pointerLine.y1}
            x2={pointerLine.x2}
            y2={pointerLine.y2}
            stroke="#ecfccb"
            strokeWidth="3"
            strokeLinecap="round"
          />

          <circle cx={CX} cy={CY} r={4} fill="#fafafa" opacity="0.95" />
        </svg>
      </button>

      <span className="font-mono text-[11px] leading-none tabular-nums text-lime-200">{display}</span>
      <span className="text-center text-[10px] leading-tight text-zinc-400">{label}</span>
    </div>
  );
}
