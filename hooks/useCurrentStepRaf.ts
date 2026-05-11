"use client";

import { useEffect, useRef, useState } from "react";

import { useAudioStore } from "@/stores/audioStore";

/**
 * Subscribes to {@link useAudioStore} `currentStep` with `requestAnimationFrame`
 * coalescing so that components do **not** re-render on every Tone.js subdivision.
 *
 * The store is mutated ~9–17 times/sec at typical riddim BPMs (140–220). Without
 * coalescing, any consumer pulls its entire React subtree into reconciliation on
 * every tick — which competes with Tone.Transport's lookahead scheduler and causes
 * audible glitches.
 *
 * Mirrors the pattern used by {@link ./components/studio/ArrangementGrid}.
 */
export function useCurrentStepRaf(): number {
  const [currentStep, setCurrentStep] = useState(
    () => useAudioStore.getState().currentStep,
  );
  const rafRef = useRef(0);

  useEffect(() => {
    const pump = (): void => {
      rafRef.current = 0;
      const next = useAudioStore.getState().currentStep;
      setCurrentStep((previous) => (previous === next ? previous : next));
    };

    const schedule = (): void => {
      if (rafRef.current !== 0) {
        return;
      }
      // SSR guard — requestAnimationFrame is browser-only; this hook runs in useEffect so window exists,
      // but bail defensively to keep test environments deterministic.
      if (typeof window === "undefined") {
        return;
      }
      rafRef.current = window.requestAnimationFrame(pump);
    };

    schedule();
    const unsub = useAudioStore.subscribe(schedule);
    return () => {
      unsub();
      if (rafRef.current !== 0) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, []);

  return currentStep;
}
