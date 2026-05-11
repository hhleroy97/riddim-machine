"use client";

import { useCallback, useEffect, useMemo } from "react";

import { MidiImporter } from "@/components/midi/MidiImporter";
import { AIPanel } from "@/components/studio/AIPanel";
import { ArrangementWorkspace } from "@/components/studio/ArrangementWorkspace";
import { InspectorPanel } from "@/components/studio/InspectorPanel";
import { LoopLibrary } from "@/components/studio/LoopLibrary";
import { Mixer } from "@/components/studio/Mixer";
import { PatternWorkspace } from "@/components/studio/PatternWorkspace";
import { SoundDesignWorkspace } from "@/components/studio/SoundDesignWorkspace";
import { StudioShell } from "@/components/studio/StudioShell";
import { ToastViewport } from "@/components/studio/ToastViewport";
import { TrackRail } from "@/components/studio/TrackRail";
import { TransportControls } from "@/components/studio/TransportControls";
import { WorkspaceTabs } from "@/components/studio/WorkspaceTabs";
import { useAIWorkflow } from "@/hooks/useAIWorkflow";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { getPresetLibrary, migratePresetLibrary } from "@/lib/audio/presetLibrary";
import { makeRenderPlan } from "@/lib/arrangement/defaults";
import { materializeSongIdea } from "@/lib/arrangement/songIdeaApply";
import { parseMidiToTracks } from "@/lib/midi/parseMidi";
import { useAIStore } from "@/stores/aiStore";
import { useAudioStore } from "@/stores/audioStore";
import { useLoopStore } from "@/stores/loopStore";
import { useArrangementStore } from "@/stores/arrangementStore";
import { useUIStore, type StudioWorkspace } from "@/stores/uiStore";
import type {
  AIRiddimComposerResult,
  AISongIdeaResult,
  CompositionPlan,
  Loop,
  SongIdea,
  SynthPatch,
  Track,
} from "@/types";

/**
 * Main studio composition surface.
 */
export function StudioApp() {
  const bpm = useAudioStore((state) => state.bpm);
  const isPlaying = useAudioStore((state) => state.isPlaying);
  const tracks = useAudioStore((state) => state.tracks);
  const setBpm = useAudioStore((state) => state.setBpm);
  const toggleStep = useAudioStore((state) => state.toggleStep);
  const setTrackStep = useAudioStore((state) => state.setTrackStep);
  const setTrackStepVelocity = useAudioStore((state) => state.setTrackStepVelocity);
  const setTrackVolume = useAudioStore((state) => state.setTrackVolume);
  const setTrackMute = useAudioStore((state) => state.setTrackMute);
  const setTrackSolo = useAudioStore((state) => state.setTrackSolo);
  const replaceTracks = useAudioStore((state) => state.replaceTracks);
  const applyChordToBass = useAudioStore((state) => state.applyChordToBass);
  const setBassPatch = useAudioStore((state) => state.setBassPatch);
  const setMacroValue = useAudioStore((state) => state.setMacroValue);
  const setModRoute = useAudioStore((state) => state.setModRoute);
  const applyInstrumentPresetToTrack = useAudioStore(
    (state) => state.applyInstrumentPresetToTrack,
  );
  const applyEffectPresetToTrack = useAudioStore((state) => state.applyEffectPresetToTrack);
  const applyPluginChainPresetToTrack = useAudioStore(
    (state) => state.applyPluginChainPresetToTrack,
  );
  const favoritePresetIds = useAudioStore((state) => state.favoritePresetIds);
  const toggleFavoritePreset = useAudioStore((state) => state.toggleFavoritePreset);
  const moveEffectSlot = useAudioStore((state) => state.moveEffectSlot);
  const toggleEffectBypass = useAudioStore((state) => state.toggleEffectBypass);
  const duplicateEffectSlot = useAudioStore((state) => state.duplicateEffectSlot);
  const applySceneVariation = useAudioStore((state) => state.applySceneVariation);
  const applyChordVariantToTrack = useAudioStore((state) => state.applyChordVariantToTrack);
  const setTrackDeviceChain = useAudioStore((state) => state.setTrackDeviceChain);

  const loadingPattern = useAIStore((state) => state.loadingPattern);
  const loadingChord = useAIStore((state) => state.loadingChord);
  const loadingMixCoach = useAIStore((state) => state.loadingMixCoach);
  const loadingSongIdea = useAIStore((state) => state.loadingSongIdea);
  const loadingAutomation = useAIStore((state) => state.loadingAutomation);
  const chords = useAIStore((state) => state.lastChords);
  const mixCoach = useAIStore((state) => state.lastMixCoach);
  const patternBurstCount = useAIStore((state) => state.patternBurstCount);

  const activeWorkspace = useUIStore((state) => state.activeWorkspace);
  const selectedTrackId = useUIStore((state) => state.selectedTrackId);
  const selectedClipId = useUIStore((state) => state.selectedClipId);
  const setActiveWorkspace = useUIStore((state) => state.setActiveWorkspace);
  const setSelectedTrackId = useUIStore((state) => state.setSelectedTrackId);
  const setSelectedClipId = useUIStore((state) => state.setSelectedClipId);
  const pushToast = useUIStore((state) => state.pushToast);

  const navigateToWorkspace = useCallback(
    (id: StudioWorkspace) => {
      setActiveWorkspace(id);
    },
    [setActiveWorkspace],
  );

  const savedLoops = useLoopStore((state) => state.savedLoops);
  const saveLoop = useLoopStore((state) => state.saveLoop);
  const deleteLoop = useLoopStore((state) => state.deleteLoop);

  const arrangement = useArrangementStore((state) => state.arrangement);
  const selectedSectionId = useArrangementStore((state) => state.selectedSectionId);
  const seedDefaultArrangement = useArrangementStore((state) => state.seedDefaultArrangement);
  const setArrangement = useArrangementStore((state) => state.setArrangement);
  const setSelectedSection = useArrangementStore((state) => state.setSelectedSection);
  const setSectionBars = useArrangementStore((state) => state.setSectionBars);
  const setSectionChords = useArrangementStore((state) => state.setSectionChords);
  const duplicateSection = useArrangementStore((state) => state.duplicateSection);
  const moveSection = useArrangementStore((state) => state.moveSection);
  const placePatternClip = useArrangementStore((state) => state.placePatternClip);
  const addSectionAsset = useArrangementStore((state) => state.addSectionAsset);
  const setAutomationPoint = useArrangementStore((state) => state.setAutomationPoint);

  const { startPlayback, stopPlayback } = useAudioEngine();
  const {
    generatePattern,
    generateChords,
    generateAutomation,
    requestMixCoach,
    generateRiddimComposition,
    applyDespiteRiddimCritic,
    setApplyDespiteRiddimCritic,
  } = useAIWorkflow();

  const loopName = useMemo(
    () => `Loop ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
    [],
  );
  const presetLibrary = useMemo(() => migratePresetLibrary(getPresetLibrary()), []);

  useEffect(() => {
    if (!arrangement) {
      seedDefaultArrangement(tracks, bpm);
    }
  }, [arrangement, bpm, seedDefaultArrangement, tracks]);

  useEffect(() => {
    if (!selectedTrackId && tracks[0]) {
      setSelectedTrackId(tracks[0].id);
    }
  }, [selectedTrackId, setSelectedTrackId, tracks]);

  const onImportMidi = async (file: File) => {
    try {
      const bytes = await file.arrayBuffer();
      const result = parseMidiToTracks(bytes);
      if (result.tracks.length === 0) {
        pushToast({ tone: "error", title: "No notes found in MIDI file" });
        return;
      }

      replaceTracks(result.tracks);
      seedDefaultArrangement(result.tracks, result.bpm ? Math.round(result.bpm) : bpm);
      if (result.bpm) {
        setBpm(Math.round(result.bpm));
      }
      pushToast({ tone: "success", title: "MIDI imported" });
    } catch {
      pushToast({ tone: "error", title: "MIDI import failed" });
    }
  };

  const onSaveLoop = () => {
    saveLoop(
      loopName,
      bpm,
      tracks,
      arrangement ?? undefined,
      arrangement ? makeRenderPlan(arrangement, tracks) : undefined,
    );
    pushToast({ tone: "success", title: "Loop saved" });
  };

  const onLoadLoop = (loop: Loop) => {
    replaceTracks(loop.tracks);
    setBpm(loop.bpm);
    if (loop.arrangement) {
      setArrangement(loop.arrangement);
    } else {
      seedDefaultArrangement(loop.tracks, loop.bpm);
    }
    pushToast({ tone: "success", title: `Loaded ${loop.name}` });
  };

  const onApplyChord = (chord: string) => {
    applyChordToBass(chord);
    pushToast({ tone: "success", title: `Applied ${chord} to bass track` });
  };

  const synthTracks = tracks.filter(
    (track): track is Track & { synthPatch: SynthPatch } =>
      track.type === "bass" && Boolean(track.synthPatch),
  );
  const bassTrack = synthTracks.find((track) => track.role === "bass") ?? synthTracks[0];

  const onSetSectionChords = (sectionId: string, chordSymbols: string[]) => {
    const chords = chordSymbols.map((chord) => ({ chord, bars: 1 }));
    setSectionChords(sectionId, chords);
    if (bassTrack) {
      applyChordVariantToTrack(bassTrack.id, sectionId, chords);
    }
  };

  const onGenerateSongIdea = async (prompt: string, songIdeaJson: string) => {
    let songIdea: SongIdea | null = null;
    let compositionPlan: CompositionPlan | undefined;

    if (songIdeaJson.trim().length > 0) {
      try {
        const parsed = JSON.parse(songIdeaJson) as AISongIdeaResult | AIRiddimComposerResult | SongIdea;
        if ("compositionPlan" in parsed) {
          songIdea = parsed.songIdea;
          compositionPlan = parsed.compositionPlan;
        } else {
          songIdea = "songIdea" in parsed ? parsed.songIdea : parsed;
        }
      } catch {
        pushToast({ tone: "error", title: "Invalid test song idea JSON" });
        return;
      }
    } else {
      const result = await generateRiddimComposition(prompt);
      songIdea = result?.songIdea ?? null;
      compositionPlan = result?.compositionPlan;
    }

    if (!songIdea) {
      return;
    }

    const materialized = materializeSongIdea(songIdea, tracks, compositionPlan);
    replaceTracks(materialized.tracks);
    setArrangement(materialized.arrangement);
    if (bassTrack) {
      materialized.arrangement.sections.forEach((section) => {
        applyChordVariantToTrack(bassTrack.id, section.id, section.chordProgression);
      });
    }
    pushToast({
      tone: "success",
      title: `Song idea applied (${materialized.arrangement.sections.length} sections)`,
    });
  };

  const applyAutomationPreview = (
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
    value: number,
  ) => {
    const track = tracks.find((candidate) => candidate.id === trackId);
    if (!track) {
      return;
    }
    if (
      track.synthPatch &&
      (target === "amp.attack" ||
        target === "amp.decay" ||
        target === "amp.sustain" ||
        target === "amp.release" ||
        target === "filter.cutoff" ||
        target === "filter.resonance" ||
        target === "fx.drive" ||
        target === "fx.chorusMix" ||
        target === "fx.stereoWidth")
    ) {
      const patch = structuredClone(track.synthPatch);
      if (target === "amp.attack") patch.ampEnvelope.attack = value * 2;
      if (target === "amp.decay") patch.ampEnvelope.decay = value * 2;
      if (target === "amp.sustain") patch.ampEnvelope.sustain = value;
      if (target === "amp.release") patch.ampEnvelope.release = value * 2;
      if (target === "filter.cutoff") patch.filter.cutoff = 80 + value * 12000;
      if (target === "filter.resonance") patch.filter.resonance = 0.1 + value * 12;
      if (target === "fx.drive") patch.fx.drive = value;
      if (target === "fx.chorusMix") patch.fx.chorusMix = value;
      if (target === "fx.stereoWidth") patch.fx.stereoWidth = value;
      setBassPatch(trackId, patch);
      return;
    }

    if (target === "fx.drive" || target === "fx.chorusMix" || target === "fx.stereoWidth") {
      const chain = structuredClone(track.deviceChain);
      chain.instrumentParams[target] = value;
      setTrackDeviceChain(trackId, chain);
    }
  };

  const openTrackInSoundDesign = (trackId: string) => {
    setSelectedTrackId(trackId);
    navigateToWorkspace("sound-design");
  };

  const selectedSection = arrangement?.sections.find(
    (section) => section.id === selectedSectionId,
  );
  const workspace = (() => {
    switch (activeWorkspace) {
      case "pattern":
        return (
          <PatternWorkspace
            tracks={tracks}
            selectedTrackId={selectedTrackId}
            onToggleStep={toggleStep}
            onSetTrackStep={setTrackStep}
            onSetTrackStepVelocity={setTrackStepVelocity}
            onSelectTrack={setSelectedTrackId}
            onOpenTrack={openTrackInSoundDesign}
          />
        );
      case "arrangement":
        return arrangement ? (
          <ArrangementWorkspace
            sections={arrangement.sections}
            sectionOrder={arrangement.sectionOrder}
            tracks={tracks}
            selectedSectionId={selectedSectionId}
            selectedClipId={selectedClipId}
            onSelectSection={setSelectedSection}
            onSelectClip={setSelectedClipId}
            onSetSectionBars={setSectionBars}
            onSetSectionChords={onSetSectionChords}
            onDuplicateSection={duplicateSection}
            onMoveSection={moveSection}
            onGenerateSectionVariation={(sectionId) => {
              applySceneVariation();
              if (bassTrack) {
                const section = arrangement.sections.find((item) => item.id === sectionId);
                if (section) {
                  applyChordVariantToTrack(bassTrack.id, sectionId, section.chordProgression);
                }
              }
            }}
            onRegenerateSelectedFromAI={onGenerateSongIdea}
            onGenerateAutomation={generateAutomation}
            onPlacePatternClip={placePatternClip}
            onAddAsset={addSectionAsset}
            onSetAutomationPoint={(sectionId, trackId, target, bar, value) => {
              setAutomationPoint(sectionId, { trackId, target }, bar, value);
              if (bar === 0) {
                applyAutomationPreview(trackId, target, value);
              }
            }}
            loadingSongIdea={loadingSongIdea}
            loadingAutomation={loadingAutomation}
          />
        ) : (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-500">
            No arrangement is loaded.
          </div>
        );
      case "sound-design":
        return (
          <SoundDesignWorkspace
            tracks={tracks}
            selectedTrackId={selectedTrackId}
            instrumentPresets={presetLibrary.instrumentPresets}
            effectPresets={presetLibrary.effectChainPresets}
            chainPresets={presetLibrary.pluginChainPresets}
            favoritePresetIds={favoritePresetIds}
            onSelectTrack={setSelectedTrackId}
            onSetPatch={setBassPatch}
            onSetMacro={setMacroValue}
            onSetModRouteAmount={(trackId, routeId, amount) =>
              setModRoute(trackId, routeId, { amount })
            }
            onApplyInstrumentPreset={applyInstrumentPresetToTrack}
            onApplyEffectPreset={applyEffectPresetToTrack}
            onApplyChainPreset={applyPluginChainPresetToTrack}
            onToggleFavoritePreset={toggleFavoritePreset}
            onMoveEffect={moveEffectSlot}
            onToggleBypass={toggleEffectBypass}
            onDuplicateEffect={duplicateEffectSlot}
          />
        );
      case "mixer":
        return (
          <Mixer
            tracks={tracks}
            loadingMixCoach={loadingMixCoach}
            mixCoachResult={mixCoach}
            onVolumeChange={setTrackVolume}
            onMuteChange={setTrackMute}
            onSoloChange={setTrackSolo}
            onOpenCoach={async () =>
              requestMixCoach("help this mix hit harder while staying clean")
            }
          />
        );
      default: {
        const _exhaustive: never = activeWorkspace;
        return _exhaustive;
      }
    }
  })();

  return (
    <div className="space-y-4">
      <StudioShell
        transport={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TransportControls
              bpm={bpm}
              isPlaying={isPlaying}
              onBpmChange={setBpm}
              onPlay={startPlayback}
              onStop={stopPlayback}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-100"
                onClick={applySceneVariation}
              >
                Scene Variation
              </button>
              <button
                type="button"
                className="rounded bg-lime-400 px-3 py-2 text-xs font-semibold text-zinc-950"
                onClick={onSaveLoop}
              >
                Save Loop
              </button>
            </div>
          </div>
        }
        sidebar={
          <TrackRail
            tracks={tracks}
            selectedTrackId={selectedTrackId}
            onSelectTrack={setSelectedTrackId}
            onOpenTrack={openTrackInSoundDesign}
            onSelectWorkspace={navigateToWorkspace}
          />
        }
        tabs={
          <WorkspaceTabs
            activeWorkspace={activeWorkspace}
            onSelectWorkspace={navigateToWorkspace}
          />
        }
        workspace={workspace}
        inspector={
          <InspectorPanel
            tracks={tracks}
            sections={arrangement?.sections ?? []}
            selectedTrackId={selectedTrackId}
            selectedClipId={selectedClipId}
          />
        }
        docks={
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="grid gap-4 lg:grid-cols-2">
              <AIPanel
                loadingPattern={loadingPattern}
                loadingChord={loadingChord}
                loadingSongIdea={loadingSongIdea}
                chords={chords}
                patternBurstCount={patternBurstCount}
                applyDespiteRiddimCritic={applyDespiteRiddimCritic}
                onApplyDespiteRiddimCriticChange={setApplyDespiteRiddimCritic}
                onGeneratePattern={generatePattern}
                onGenerateChords={generateChords}
                onGenerateSongArrangement={async (prompt) => {
                  await onGenerateSongIdea(prompt, "");
                }}
                onApplyChord={onApplyChord}
              />
              <MidiImporter onImport={onImportMidi} />
            </div>
            <div className="space-y-4">
              <LoopLibrary
                loops={savedLoops}
                onSave={onSaveLoop}
                onLoad={onLoadLoop}
                onDelete={deleteLoop}
              />
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">
                Current section:{" "}
                <span className="font-semibold text-zinc-100">
                  {selectedSection?.name ?? "None"}
                </span>
              </div>
            </div>
          </div>
        }
      />
      <ToastViewport />
    </div>
  );
}
