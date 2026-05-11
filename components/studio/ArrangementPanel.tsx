"use client";

import { useMemo, useState } from "react";

import { summarizeAutomationLaneValues } from "@/lib/studio/automationDisplay";
import type { ArrangementSection, Track } from "@/types";

interface ArrangementPanelProps {
  sections: ArrangementSection[];
  sectionOrder: string[];
  tracks: Track[];
  selectedSectionId: string | null;
  onSelectSection: (sectionId: string) => void;
  onSetSectionBars: (sectionId: string, bars: number) => void;
  onSetSectionChords: (sectionId: string, chords: string[]) => void;
  onDuplicateSection: (sectionId: string) => void;
  onMoveSection: (sectionId: string, direction: "left" | "right") => void;
  onGenerateSectionVariation: (sectionId: string) => void;
  onRegenerateSelectedFromAI: (prompt: string, songIdeaJson: string) => Promise<void>;
  onGenerateAutomation: (prompt: string) => Promise<void>;
  onSetAutomationPoint: (
    sectionId: string,
    trackId: string,
    target:
      | "amp.attack"
      | "amp.decay"
      | "amp.sustain"
      | "amp.release"
      | "filter.cutoff"
      | "filter.resonance"
      | "fx.drive"
      | "fx.chorusMix"
      | "fx.stereoWidth",
    bar: number,
    value: number,
  ) => void;
  loadingSongIdea: boolean;
  loadingAutomation: boolean;
}

/**
 * Arranger-focused editor for section order, lengths and chords.
 */
export function ArrangementPanel({
  sections,
  sectionOrder,
  tracks,
  selectedSectionId,
  onSelectSection,
  onSetSectionBars,
  onSetSectionChords,
  onDuplicateSection,
  onMoveSection,
  onGenerateSectionVariation,
  onRegenerateSelectedFromAI,
  onGenerateAutomation,
  onSetAutomationPoint,
  loadingSongIdea,
  loadingAutomation,
}: ArrangementPanelProps) {
  const selectedSection = useMemo(
    () => sections.find((section) => section.id === selectedSectionId) ?? sections[0],
    [sections, selectedSectionId],
  );
  const [chordText, setChordText] = useState(
    selectedSection?.chordProgression.map((event) => event.chord).join(" ") ?? "Fm Db Eb Cm",
  );
  const [automationTarget, setAutomationTarget] = useState<ArrangementPanelProps["onSetAutomationPoint"] extends (
    sectionId: string,
    trackId: string,
    target: infer T,
    bar: number,
    value: number,
  ) => void
    ? T
    : never>("filter.cutoff");
  const [automationBar, setAutomationBar] = useState(0);
  const [automationValue, setAutomationValue] = useState(0.7);
  const [automationTrackId, setAutomationTrackId] = useState<string>(tracks[0]?.id ?? "");
  const [automationPrompt, setAutomationPrompt] = useState(
    "Add granular filter and FX movement that follows the selected pattern clips",
  );
  const [songIdeaPrompt, setSongIdeaPrompt] = useState(
    "Generate a playable riddim song idea with 3-4 sections",
  );
  const [songIdeaJson, setSongIdeaJson] = useState("");

  if (!selectedSection) {
    return null;
  }

  return (
    <section className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-100">Arrangement</h2>
        <button
          type="button"
          className="rounded bg-zinc-800 px-3 py-1.5 text-xs text-zinc-100 disabled:opacity-60"
          onClick={() => void onRegenerateSelectedFromAI(songIdeaPrompt, songIdeaJson)}
          disabled={loadingSongIdea}
        >
          {loadingSongIdea
            ? "Generating..."
            : songIdeaJson.trim().length > 0
              ? "Apply Test Song Idea"
              : "Generate Song Idea"}
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1 text-xs text-zinc-300">
          <span>Song Idea Prompt</span>
          <input
            type="text"
            value={songIdeaPrompt}
            onChange={(event) => setSongIdeaPrompt(event.target.value)}
            className="w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-zinc-100"
          />
        </label>
        <label className="space-y-1 text-xs text-zinc-300">
          <span>Test Song Idea JSON (optional)</span>
          <textarea
            value={songIdeaJson}
            onChange={(event) => setSongIdeaJson(event.target.value)}
            placeholder='{"songIdea":{...}} or {"title":"...","arrangement":...}'
            className="h-20 w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {sectionOrder.map((sectionId) => {
          const section = sections.find((item) => item.id === sectionId);
          if (!section) {
            return null;
          }
          const selected = section.id === selectedSection.id;
          return (
            <button
              key={section.id}
              type="button"
              className={`rounded px-2 py-1 text-xs ${
                selected ? "bg-indigo-500 text-white" : "bg-zinc-800 text-zinc-200"
              }`}
              onClick={() => onSelectSection(section.id)}
            >
              {section.name} ({section.bars} bars)
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-xs text-zinc-300">
          <span>Section Bars</span>
          <input
            type="number"
            min={1}
            max={32}
            value={selectedSection.bars}
            onChange={(event) => onSetSectionBars(selectedSection.id, Number(event.target.value))}
            className="w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-zinc-100"
          />
        </label>
        <button
          type="button"
          className="rounded bg-zinc-800 px-3 py-2 text-xs text-zinc-100"
          onClick={() => onDuplicateSection(selectedSection.id)}
        >
          Duplicate
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 rounded bg-zinc-800 px-3 py-2 text-xs text-zinc-100"
            onClick={() => onMoveSection(selectedSection.id, "left")}
          >
            Move Left
          </button>
          <button
            type="button"
            className="flex-1 rounded bg-zinc-800 px-3 py-2 text-xs text-zinc-100"
            onClick={() => onMoveSection(selectedSection.id, "right")}
          >
            Move Right
          </button>
        </div>
      </div>

      <label className="space-y-1 text-xs text-zinc-300">
        <span>Chord Progression (space-separated)</span>
        <input
          type="text"
          value={chordText}
          onChange={(event) => setChordText(event.target.value)}
          className="w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-zinc-100"
        />
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          className="rounded bg-zinc-800 px-3 py-2 text-xs text-zinc-100"
          onClick={() => {
            const chords = chordText
              .split(/\s+/)
              .map((chord) => chord.trim())
              .filter(Boolean);
            onSetSectionChords(selectedSection.id, chords);
          }}
        >
          Apply Chords
        </button>
        <button
          type="button"
          className="rounded bg-zinc-800 px-3 py-2 text-xs text-zinc-100"
          onClick={() => onGenerateSectionVariation(selectedSection.id)}
        >
          Generate Section Variation
        </button>
      </div>

      <div className="space-y-2 rounded border border-zinc-800 bg-zinc-900/40 p-3">
        <div className="text-xs font-semibold text-zinc-200">Pattern Clip Palette</div>
        <div className="flex flex-wrap gap-2">
          {tracks.map((track) => {
            const variants = ["base", ...Object.keys(track.clipVariants ?? {})];
            return variants.map((variantId) => (
              <button
                key={`${track.id}-${variantId}`}
                type="button"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "copy";
                  const payload = JSON.stringify({ trackId: track.id, variantId });
                  event.dataTransfer.setData("application/riddim-pattern", payload);
                  event.dataTransfer.setData("text/plain", payload);
                }}
                className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-200"
              >
                {track.name}: {variantId}
              </button>
            ));
          })}
        </div>
      </div>

      <div className="space-y-2 rounded border border-zinc-800 bg-zinc-900/40 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold text-zinc-200">Automation Lane</div>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              Manual points and AI-generated pattern automation appear under their track lanes.
            </p>
          </div>
          <button
            type="button"
            className="rounded bg-fuchsia-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
            onClick={() => void onGenerateAutomation(automationPrompt)}
            disabled={loadingAutomation}
          >
            {loadingAutomation ? "Generating..." : "Generate Automation"}
          </button>
        </div>
        <input
          type="text"
          value={automationPrompt}
          onChange={(event) => setAutomationPrompt(event.target.value)}
          className="w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
        />
        <div className="grid gap-2 sm:grid-cols-4">
          <select
            value={automationTrackId}
            onChange={(event) => setAutomationTrackId(event.target.value)}
            className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
          >
            {tracks.map((track) => (
              <option key={track.id} value={track.id}>
                {track.name}
              </option>
            ))}
          </select>
          <select
            value={automationTarget}
            onChange={(event) =>
              setAutomationTarget(
                event.target.value as
                  | "amp.attack"
                  | "amp.decay"
                  | "amp.sustain"
                  | "amp.release"
                  | "filter.cutoff"
                  | "filter.resonance"
                  | "fx.drive"
                  | "fx.chorusMix"
                  | "fx.stereoWidth",
              )
            }
            className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
          >
            {[
              "amp.attack",
              "amp.decay",
              "amp.sustain",
              "amp.release",
              "filter.cutoff",
              "filter.resonance",
              "fx.drive",
              "fx.chorusMix",
              "fx.stereoWidth",
            ].map((target) => (
              <option key={target} value={target}>
                {target}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            value={automationBar}
            onChange={(event) => setAutomationBar(Number(event.target.value))}
            className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
            placeholder="Bar"
          />
          <input
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={automationValue}
            onChange={(event) => setAutomationValue(Number(event.target.value))}
            className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
            placeholder="Value 0..1"
          />
        </div>
        <button
          type="button"
          className="rounded bg-zinc-800 px-3 py-2 text-xs text-zinc-100"
          onClick={() =>
            onSetAutomationPoint(
              selectedSection.id,
              automationTrackId,
              automationTarget,
              automationBar,
              automationValue,
            )
          }
        >
          Add Automation Point
        </button>
      </div>

      <div className="space-y-1 rounded border border-zinc-800 bg-zinc-900/30 p-3">
        <div className="text-xs font-semibold text-zinc-200">Current Section Clips</div>
        {selectedSection.clips.map((clip) => (
          <div key={clip.id} className="text-xs text-zinc-300">
            pattern: {clip.trackId}/{clip.variantId} @ bar {clip.startBar + 1} ({clip.bars} bars)
          </div>
        ))}
        {selectedSection.assets.map((asset) => (
          <div key={asset.id} className="text-xs text-zinc-400">
            {asset.kind}: {asset.label} @ bar {asset.startBar + 1}
          </div>
        ))}
        {selectedSection.automationLanes.map((lane) => (
          <div key={lane.id} className="text-xs text-zinc-500">
            automation {lane.trackId}/{lane.target}: {lane.points.length} pts ·{" "}
            <span className="font-mono tabular-nums text-lime-200/90">
              {summarizeAutomationLaneValues(lane)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
