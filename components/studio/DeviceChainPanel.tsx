"use client";

import type { DeviceChain } from "@/types";

interface DeviceChainPanelProps {
  trackId: string;
  chain: DeviceChain;
  onMoveEffect: (trackId: string, effectId: string, direction: "up" | "down") => void;
  onToggleBypass: (trackId: string, effectId: string) => void;
  onDuplicateEffect: (trackId: string, effectId: string) => void;
}

/**
 * DAW-style device chain controls.
 */
export function DeviceChainPanel({
  trackId,
  chain,
  onMoveEffect,
  onToggleBypass,
  onDuplicateEffect,
}: DeviceChainPanelProps) {
  return (
    <section className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Device Chain</h2>
      <p className="text-xs text-zinc-500">Instrument: {chain.instrumentPluginId}</p>
      <div className="space-y-2">
        {chain.effects.map((effect) => (
          <div
            key={effect.id}
            className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 rounded border border-zinc-800 px-2 py-1"
          >
            <div>
              <p className="text-xs text-zinc-200">{effect.pluginId}</p>
              <p className="text-[10px] text-zinc-500">wet {effect.wet.toFixed(2)}</p>
            </div>
            <button
              type="button"
              className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-100"
              onClick={() => onToggleBypass(trackId, effect.id)}
            >
              {effect.bypass ? "Enable" : "Bypass"}
            </button>
            <button
              type="button"
              className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-100"
              onClick={() => onMoveEffect(trackId, effect.id, "up")}
            >
              ↑
            </button>
            <button
              type="button"
              className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-100"
              onClick={() => onMoveEffect(trackId, effect.id, "down")}
            >
              ↓
            </button>
            <button
              type="button"
              className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-100"
              onClick={() => onDuplicateEffect(trackId, effect.id)}
            >
              Duplicate
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
