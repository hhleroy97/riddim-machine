"use client";

import { useMemo, useState } from "react";

import { Knob } from "@/components/studio/Knob";
import { filterPresetsByTag } from "@/lib/audio/presetLibrary";
import type {
  EffectChainPreset,
  InstrumentPreset,
  PluginChainPreset,
  SynthPatch,
} from "@/types";

interface SynthPatchPanelProps {
  trackId: string;
  patch: SynthPatch;
  instrumentPresets: InstrumentPreset[];
  effectPresets: EffectChainPreset[];
  chainPresets: PluginChainPreset[];
  favoritePresetIds: string[];
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
}

/**
 * Patch editor for bass synthesis architecture.
 */
export function SynthPatchPanel({
  trackId,
  patch,
  instrumentPresets,
  effectPresets,
  chainPresets,
  favoritePresetIds,
  onSetPatch,
  onSetMacro,
  onSetModRouteAmount,
  onApplyInstrumentPreset,
  onApplyEffectPreset,
  onApplyChainPreset,
  onToggleFavoritePreset,
}: SynthPatchPanelProps) {
  const [presetFilter, setPresetFilter] = useState("");

  const filteredInstrumentPresets = useMemo(
    () => filterPresetsByTag(instrumentPresets, presetFilter),
    [instrumentPresets, presetFilter],
  );
  const filteredEffectPresets = useMemo(
    () => filterPresetsByTag(effectPresets, presetFilter),
    [effectPresets, presetFilter],
  );
  const filteredChainPresets = useMemo(
    () => filterPresetsByTag(chainPresets, presetFilter),
    [chainPresets, presetFilter],
  );

  const setOscGain = (oscId: string, gain: number) => {
    onSetPatch(trackId, {
      ...patch,
      oscillators: patch.oscillators.map((osc) => (osc.id === oscId ? { ...osc, gain } : osc)),
    });
  };

  return (
    <section className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Patch Panel</h2>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold text-zinc-500">Preset Browser</h3>
          <input
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
            value={presetFilter}
            onChange={(event) => setPresetFilter(event.target.value)}
            placeholder="Filter tag..."
          />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1 rounded border border-zinc-800 p-2">
            <p className="text-xs text-zinc-500">Instrument</p>
            {filteredInstrumentPresets.map((preset) => (
              <div key={preset.id} className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-100 hover:bg-zinc-700"
                  onClick={() => onApplyInstrumentPreset(trackId, preset)}
                >
                  {preset.name}
                </button>
                <button
                  type="button"
                  className="text-xs text-zinc-400"
                  onClick={() => onToggleFavoritePreset(preset.id)}
                >
                  {favoritePresetIds.includes(preset.id) ? "★" : "☆"}
                </button>
              </div>
            ))}
          </div>
          <div className="space-y-1 rounded border border-zinc-800 p-2">
            <p className="text-xs text-zinc-500">Effects</p>
            {filteredEffectPresets.map((preset) => (
              <div key={preset.id} className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-100 hover:bg-zinc-700"
                  onClick={() => onApplyEffectPreset(trackId, preset)}
                >
                  {preset.name}
                </button>
                <button
                  type="button"
                  className="text-xs text-zinc-400"
                  onClick={() => onToggleFavoritePreset(preset.id)}
                >
                  {favoritePresetIds.includes(preset.id) ? "★" : "☆"}
                </button>
              </div>
            ))}
          </div>
          <div className="space-y-1 rounded border border-zinc-800 p-2">
            <p className="text-xs text-zinc-500">Full Chain</p>
            {filteredChainPresets.map((preset) => (
              <div key={preset.id} className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-100 hover:bg-zinc-700"
                  onClick={() => onApplyChainPreset(trackId, preset)}
                >
                  {preset.name}
                </button>
                <button
                  type="button"
                  className="text-xs text-zinc-400"
                  onClick={() => onToggleFavoritePreset(preset.id)}
                >
                  {favoritePresetIds.includes(preset.id) ? "★" : "☆"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-zinc-500">Osc</h3>
        <div className="flex gap-4">
          <Knob
            label="Sub"
            value={patch.oscillators[0]?.gain ?? 0}
            min={0}
            max={1}
            onChange={(value) => setOscGain("sub", value)}
          />
          <Knob
            label="Mid"
            value={patch.oscillators[1]?.gain ?? 0}
            min={0}
            max={1}
            onChange={(value) => setOscGain("mid", value)}
          />
          <Knob
            label="Noise"
            value={patch.oscillators[2]?.gain ?? 0}
            min={0}
            max={1}
            onChange={(value) => setOscGain("noise", value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-zinc-500">Filter</h3>
        <div className="flex gap-4">
          <Knob
            label="Cutoff"
            value={patch.filter.cutoff}
            min={40}
            max={18000}
            step={20}
            onChange={(value) =>
              onSetPatch(trackId, {
                ...patch,
                filter: { ...patch.filter, cutoff: value },
              })
            }
          />
          <Knob
            label="Reso"
            value={patch.filter.resonance}
            min={0.1}
            max={16}
            step={0.1}
            onChange={(value) =>
              onSetPatch(trackId, {
                ...patch,
                filter: { ...patch.filter, resonance: value },
              })
            }
          />
          <Knob
            label="EnvAmt"
            value={patch.filter.envelopeAmount}
            min={0}
            max={1200}
            step={10}
            onChange={(value) =>
              onSetPatch(trackId, {
                ...patch,
                filter: { ...patch.filter, envelopeAmount: value },
              })
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-zinc-500">Env</h3>
        <div className="flex gap-4">
          <Knob
            label="Atk"
            value={patch.ampEnvelope.attack}
            min={0.001}
            max={1}
            step={0.001}
            onChange={(value) =>
              onSetPatch(trackId, {
                ...patch,
                ampEnvelope: { ...patch.ampEnvelope, attack: value },
              })
            }
          />
          <Knob
            label="Dec"
            value={patch.ampEnvelope.decay}
            min={0.01}
            max={1.2}
            step={0.01}
            onChange={(value) =>
              onSetPatch(trackId, {
                ...patch,
                ampEnvelope: { ...patch.ampEnvelope, decay: value },
              })
            }
          />
          <Knob
            label="Sus"
            value={patch.ampEnvelope.sustain}
            min={0}
            max={1}
            onChange={(value) =>
              onSetPatch(trackId, {
                ...patch,
                ampEnvelope: { ...patch.ampEnvelope, sustain: value },
              })
            }
          />
          <Knob
            label="Rel"
            value={patch.ampEnvelope.release}
            min={0.01}
            max={2}
            step={0.01}
            onChange={(value) =>
              onSetPatch(trackId, {
                ...patch,
                ampEnvelope: { ...patch.ampEnvelope, release: value },
              })
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-zinc-500">FX</h3>
        <div className="flex gap-4">
          <Knob
            label="Drive"
            value={patch.fx.drive}
            min={0}
            max={1}
            onChange={(value) => onSetPatch(trackId, { ...patch, fx: { ...patch.fx, drive: value } })}
          />
          <Knob
            label="Chorus"
            value={patch.fx.chorusMix}
            min={0}
            max={1}
            onChange={(value) =>
              onSetPatch(trackId, { ...patch, fx: { ...patch.fx, chorusMix: value } })
            }
          />
          <Knob
            label="Width"
            value={patch.fx.stereoWidth}
            min={0}
            max={1}
            onChange={(value) =>
              onSetPatch(trackId, { ...patch, fx: { ...patch.fx, stereoWidth: value } })
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-zinc-500">Macros</h3>
        <div className="flex gap-4">
          {patch.macros.map((macro) => (
            <Knob
              key={macro.id}
              label={macro.label}
              value={macro.value}
              min={0}
              max={1}
              onChange={(value) => onSetMacro(trackId, macro.id, value)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-zinc-500">Mod Matrix</h3>
        <div className="space-y-2">
          {patch.modRoutes.map((route) => (
            <div key={route.id} className="grid grid-cols-[1fr_120px] items-center gap-3 rounded border border-zinc-800 p-2">
              <p className="text-xs text-zinc-300">
                {route.source} → {route.target}
              </p>
              <Knob
                label="Amt"
                value={route.amount}
                min={-1}
                max={1}
                step={0.01}
                onChange={(value) => onSetModRouteAmount(trackId, route.id, value)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
