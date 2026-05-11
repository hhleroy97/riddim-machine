"use client";

import { DeviceChainPanel } from "@/components/studio/DeviceChainPanel";
import { SynthPatchPanel } from "@/components/studio/SynthPatchPanel";
import type {
  EffectChainPreset,
  InstrumentPreset,
  PluginChainPreset,
  SynthPatch,
  Track,
} from "@/types";

interface SoundDesignWorkspaceProps {
  tracks: Track[];
  selectedTrackId: string | null;
  instrumentPresets: InstrumentPreset[];
  effectPresets: EffectChainPreset[];
  chainPresets: PluginChainPreset[];
  favoritePresetIds: string[];
  onSelectTrack: (trackId: string) => void;
  onSetPatch: (trackId: string, patch: SynthPatch) => void;
  onSetMacro: (
    trackId: string,
    macroId: "macro1" | "macro2" | "macro3" | "macro4",
    value: number,
  ) => void;
  onSetModRouteAmount: (trackId: string, routeId: string, amount: number) => void;
  onApplyInstrumentPreset: (trackId: string, preset: InstrumentPreset) => void;
  onApplyEffectPreset: (trackId: string, preset: EffectChainPreset) => void;
  onApplyChainPreset: (trackId: string, preset: PluginChainPreset) => void;
  onToggleFavoritePreset: (presetId: string) => void;
  onMoveEffect: (trackId: string, effectId: string, direction: "up" | "down") => void;
  onToggleBypass: (trackId: string, effectId: string) => void;
  onDuplicateEffect: (trackId: string, effectId: string) => void;
}

/**
 * Selected-track synth and device editor.
 */
export function SoundDesignWorkspace({
  tracks,
  selectedTrackId,
  instrumentPresets,
  effectPresets,
  chainPresets,
  favoritePresetIds,
  onSelectTrack,
  onSetPatch,
  onSetMacro,
  onSetModRouteAmount,
  onApplyInstrumentPreset,
  onApplyEffectPreset,
  onApplyChainPreset,
  onToggleFavoritePreset,
  onMoveEffect,
  onToggleBypass,
  onDuplicateEffect,
}: SoundDesignWorkspaceProps) {
  const selectedTrack =
    tracks.find((track) => track.id === selectedTrackId) ?? tracks.find((track) => track.synthPatch) ?? tracks[0];

  if (!selectedTrack) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-lime-300">
            Sound Design
          </p>
          <h2 className="text-2xl font-black tracking-tight text-zinc-100">
            {selectedTrack.name}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Edit the selected instrument, macros, presets, and device chain.
          </p>
        </div>
        <select
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          value={selectedTrack.id}
          onChange={(event) => onSelectTrack(event.target.value)}
        >
          {tracks.map((track) => (
            <option key={track.id} value={track.id}>
              {track.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        {selectedTrack.synthPatch ? (
          <SynthPatchPanel
            trackId={selectedTrack.id}
            patch={selectedTrack.synthPatch}
            instrumentPresets={instrumentPresets}
            effectPresets={effectPresets}
            chainPresets={chainPresets}
            favoritePresetIds={favoritePresetIds}
            onSetPatch={onSetPatch}
            onSetMacro={onSetMacro}
            onSetModRouteAmount={onSetModRouteAmount}
            onApplyInstrumentPreset={onApplyInstrumentPreset}
            onApplyEffectPreset={onApplyEffectPreset}
            onApplyChainPreset={onApplyChainPreset}
            onToggleFavoritePreset={onToggleFavoritePreset}
          />
        ) : (
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-500">
            This track uses a drum instrument and has no synth patch editor yet.
          </section>
        )}
        <DeviceChainPanel
          trackId={selectedTrack.id}
          chain={selectedTrack.deviceChain}
          onMoveEffect={onMoveEffect}
          onToggleBypass={onToggleBypass}
          onDuplicateEffect={onDuplicateEffect}
        />
      </div>
    </div>
  );
}
