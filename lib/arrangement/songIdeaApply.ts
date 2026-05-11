import { makeDefaultDeviceChain } from "@/lib/audio/patches";
import { resolveInstrumentPreset } from "@/lib/ai/instrumentCatalog";
import { buildChordPattern } from "@/lib/midi/chordPatterns";
import { applyDeviceIntent, applyPatchIntent } from "@/lib/riddim/patchIntent";
import { renderMotifPhrases } from "@/lib/riddim/phrases";
import type {
  ArrangementSection,
  AutomationLane,
  ChordEvent,
  CompositionPlan,
  InstrumentPluginId,
  PatternLibraryMotif,
  PatternLibraryPlacement,
  PatternLibraryPlan,
  SongArrangement,
  SongIdea,
  Step,
  Track,
} from "@/types";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function noteToMidi(note: string): number {
  const match = note.match(/^([A-G]#?)(-?\d)$/);
  if (!match) {
    return 48;
  }
  const [, pitch, octaveRaw] = match;
  const octave = Number(octaveRaw);
  return (octave + 1) * 12 + NOTE_NAMES.indexOf(pitch);
}

function midiToNote(value: number): string {
  const clamped = Math.max(24, Math.min(108, Math.round(value)));
  const pitch = NOTE_NAMES[clamped % 12];
  const octave = Math.floor(clamped / 12) - 1;
  return `${pitch}${octave}`;
}

function triad(chord: string, octave: number): string[] {
  const root = chord.trim().slice(0, chord.includes("#") ? 2 : 1) || "F";
  const isMinor = /m(?!aj)/i.test(chord);
  const rootMidi = noteToMidi(`${root}${octave}`);
  return [
    midiToNote(rootMidi),
    midiToNote(rootMidi + (isMinor ? 3 : 4)),
    midiToNote(rootMidi + 7),
  ];
}

function emptyPattern(note = "C3"): Step[] {
  return Array.from({ length: 16 }, () => ({
    active: false,
    note,
    velocity: 0.7,
  }));
}

function makeDrumPattern(base: Step[], sectionIndex: number, trackIndex: number): Step[] {
  return base.map((step, index) => {
    const pulse = (index + sectionIndex + trackIndex) % 4 === 0;
    const ghost = trackIndex % 2 === 0 && index % 8 === 6;
    const active = index % 8 === 0 ? true : step.active || pulse || ghost;
    return {
      ...step,
      active,
      velocity: active
        ? Math.max(0.3, Math.min(1, step.velocity + (sectionIndex % 3) * 0.08 - (ghost ? 0.2 : 0)))
        : step.velocity,
    };
  });
}

function makeBassPattern(chords: ChordEvent[], barIndex: number): Step[] {
  const pattern = emptyPattern("F1");
  const chord = chords[barIndex % Math.max(1, chords.length)]?.chord ?? "Fm";
  const tones = triad(chord, 1);
  const rhythm = [0, 2, 5, 7, 8, 10, 13, 15];
  rhythm.forEach((stepIndex, index) => {
    pattern[stepIndex] = {
      active: true,
      note: tones[index % tones.length] ?? tones[0] ?? "F1",
      velocity: 0.6 + ((barIndex + index) % 3) * 0.1,
    };
  });
  return pattern;
}

function makeLeadPattern(chords: ChordEvent[], barIndex: number): Step[] {
  const pattern = emptyPattern("F3");
  const chord = chords[barIndex % Math.max(1, chords.length)]?.chord ?? "Fm";
  const tones = triad(chord, 3);
  const upper = tones.map((note) => midiToNote(noteToMidi(note) + 12));
  const phrasePool = [
    [1, 3, 6, 10, 11, 14],
    [0, 4, 7, 9, 12, 15],
    [2, 5, 8, 11, 13, 15],
  ];
  const phrase = phrasePool[barIndex % phrasePool.length] ?? phrasePool[0];
  phrase.forEach((stepIndex, index) => {
    const noteChoices = [...upper, ...tones];
    pattern[stepIndex] = {
      active: true,
      note: noteChoices[(index + barIndex) % noteChoices.length] ?? "F3",
      velocity: 0.48 + ((index + barIndex) % 4) * 0.11,
    };
  });
  return pattern;
}

function makeChordPattern(chords: ChordEvent[], barIndex: number): Step[] {
  const pattern = emptyPattern("F2");
  const chord = chords[barIndex % Math.max(1, chords.length)]?.chord ?? "Fm";
  const tones = triad(chord, 2);
  const stabs = [0, 4, 8, 12];
  stabs.forEach((stepIndex, index) => {
    const rootTone = tones[0] ?? "F2";
    pattern[stepIndex] = {
      active: true,
      note: rootTone,
      notes: [...tones],
      velocity: 0.55 - (index % 2) * 0.07,
    };
  });
  return pattern;
}

function transposeStep(step: Step, semitones: number): Step {
  if (!step.active) {
    return step;
  }
  return {
    ...step,
    note: midiToNote(noteToMidi(step.note) + semitones),
    notes: step.notes?.map((note) => midiToNote(noteToMidi(note) + semitones)),
  };
}

function withDensity(step: Step, index: number, increase: boolean): Step {
  if (increase) {
    if (step.active) {
      return { ...step, velocity: Math.min(1, step.velocity + 0.08) };
    }
    if (index % 8 === 6 || index % 16 === 14) {
      return { active: true, note: step.note, velocity: 0.38 };
    }
    return step;
  }
  if (!step.active) {
    return step;
  }
  if (index % 4 !== 0 && index % 8 !== 2) {
    return { ...step, active: false, velocity: Math.max(0.2, step.velocity - 0.2) };
  }
  return { ...step, velocity: Math.max(0.35, step.velocity - 0.08) };
}

function applyMotifTransform(pattern: Step[], motif: PatternLibraryMotif): Step[] {
  if (motif.transform === "mute") {
    return pattern.map((step) => ({ ...step, active: false, velocity: 0 }));
  }
  if (motif.transform === "density-up") {
    return pattern.map((step, index) => withDensity(step, index, true));
  }
  if (motif.transform === "density-down") {
    return pattern.map((step, index) => withDensity(step, index, false));
  }
  if (motif.transform === "transpose-up") {
    return pattern.map((step) => transposeStep(step, 2));
  }
  if (motif.transform === "transpose-down") {
    return pattern.map((step) => transposeStep(step, -2));
  }
  if (motif.transform === "fill-ending") {
    return pattern.map((step, index) => {
      if (index < 12) {
        return step.active ? { ...step, velocity: Math.max(0.35, step.velocity - 0.05) } : step;
      }
      return {
        active: true,
        note: step.note,
        velocity: Math.min(1, Math.max(step.velocity, 0.62 + (index - 12) * 0.04)),
      };
    });
  }
  return pattern;
}

function chooseInstrumentPlugin(
  track: Track,
  songIdea: SongIdea,
): InstrumentPluginId {
  const fromRecommendation = songIdea.recommendedTracks.find(
    (candidate) =>
      candidate.name.toLowerCase() === track.name.toLowerCase() ||
      (track.role && candidate.role === track.role),
  )?.instrumentPluginId;
  if (fromRecommendation) {
    return fromRecommendation;
  }

  const mood = songIdea.mood.toLowerCase();
  if (track.role === "lead") {
    if (mood.includes("aggressive") || mood.includes("tearout") || mood.includes("hard")) {
      return "phase-distortion-synth";
    }
    return "supersaw-stack";
  }
  if (track.role === "harmony") {
    if (mood.includes("dark") || mood.includes("cinematic")) {
      return "granular-texture";
    }
    return "wavetable-synth";
  }
  if (track.role === "bass" || track.id === "bass") {
    return mood.includes("metal") ? "fm-synth" : "subtractive-bass";
  }
  if (track.type === "drum") {
    return "sampler-drum-rack";
  }
  return track.deviceChain.instrumentPluginId;
}

function makeTrackVariant(
  track: Track,
  chords: ChordEvent[],
  sectionIndex: number,
  trackIndex: number,
  barIndex: number,
  compositionPlan?: CompositionPlan,
  sectionEnergy = 0.7,
  sectionBars = 1,
): Step[] {
  if (compositionPlan) {
    const rendered = renderMotifPhrases(
      compositionPlan.harmonicPlan,
      compositionPlan.motifPlan,
      sectionBars,
      sectionEnergy,
    );
    const sliceBar = (steps: Step[]) => steps.slice(barIndex * 16, barIndex * 16 + 16);
    if (track.id === "kick") {
      return sliceBar(rendered.kick);
    }
    if (track.id === "snare") {
      return sliceBar(rendered.snare);
    }
    if (track.id.includes("hat") || track.name.toLowerCase().includes("hat")) {
      return sliceBar(rendered.hats);
    }
    if (track.role === "lead" || track.id.includes("lead")) {
      return sliceBar(rendered.lead);
    }
    if (track.role === "harmony" || track.id.includes("chord")) {
      return sliceBar(rendered.chords);
    }
    if (track.role === "bass" || track.id === "bass") {
      return sliceBar(rendered.bass);
    }
  }
  if (track.type === "drum") {
    return makeDrumPattern(track.steps, sectionIndex, trackIndex);
  }
  if (track.role === "lead" || track.id.includes("lead")) {
    return makeLeadPattern(chords, barIndex);
  }
  if (track.role === "harmony" || track.id.includes("chord")) {
    return makeChordPattern(chords, barIndex);
  }
  if (track.role === "bass" || track.id === "bass") {
    return makeBassPattern(chords, barIndex);
  }
  return buildChordPattern(chords, 2 + (trackIndex % 2));
}

function sanitizeTitle(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "composition";
}

function motifId(trackId: string, suffix: string): string {
  return `${trackId}-${suffix}`;
}

function fallbackMotifsForTrack(track: Track): PatternLibraryMotif[] {
  return [
    { id: motifId(track.id, "base"), trackId: track.id, role: "base", sourceBar: 0, transform: "none" },
    {
      id: motifId(track.id, "response"),
      trackId: track.id,
      role: "response",
      sourceBar: 1,
      transform: track.type === "drum" ? "density-down" : "transpose-up",
    },
    { id: motifId(track.id, "fill"), trackId: track.id, role: "fill", sourceBar: 3, transform: "fill-ending" },
    { id: motifId(track.id, "breakdown"), trackId: track.id, role: "breakdown", sourceBar: 0, transform: "density-down" },
  ];
}

function fallbackPatternLibraryPlan(section: ArrangementSection, tracks: Track[]): PatternLibraryPlan {
  return {
    motifs: tracks.flatMap((track) => fallbackMotifsForTrack(track)),
    placements: tracks.flatMap((track) =>
      Array.from({ length: Math.max(1, section.bars) }).map((_, barIndex) => {
        const isFinalBar = barIndex === section.bars - 1;
        const phraseSlot = barIndex % 4;
        const suffix = isFinalBar ? "fill" : phraseSlot === 1 ? "response" : "base";
        return {
          sectionId: section.id,
          trackId: track.id,
          motifId: motifId(track.id, suffix),
          startBar: barIndex,
          bars: 1,
        };
      }),
    ),
  };
}

function compactPlacements(placements: PatternLibraryPlacement[]): PatternLibraryPlacement[] {
  return placements.reduce<PatternLibraryPlacement[]>((acc, placement) => {
    const previous = acc[acc.length - 1];
    if (
      previous &&
      previous.sectionId === placement.sectionId &&
      previous.trackId === placement.trackId &&
      previous.motifId === placement.motifId &&
      previous.startBar + previous.bars === placement.startBar
    ) {
      previous.bars += placement.bars;
      return acc;
    }
    acc.push({ ...placement });
    return acc;
  }, []);
}

function sectionPatternLibraryPlan(
  section: ArrangementSection,
  tracks: Track[],
  compositionPlan?: CompositionPlan,
): PatternLibraryPlan {
  const fallback = fallbackPatternLibraryPlan(section, tracks);
  if (!compositionPlan) {
    return {
      motifs: fallback.motifs,
      placements: compactPlacements(fallback.placements),
    };
  }

  const sectionPlacements = compositionPlan.patternLibraryPlan.placements.filter(
    (placement) => placement.sectionId === section.id,
  );
  if (sectionPlacements.length === 0) {
    return {
      motifs: fallback.motifs,
      placements: compactPlacements(fallback.placements),
    };
  }

  const trackIds = new Set(tracks.map((track) => track.id));
  const motifIds = new Set(sectionPlacements.map((placement) => placement.motifId));
  const motifs = [
    ...compositionPlan.patternLibraryPlan.motifs.filter(
      (motif) => trackIds.has(motif.trackId) && motifIds.has(motif.id),
    ),
    ...fallback.motifs.filter((motif) => motifIds.has(motif.id)),
  ];
  const knownMotifIds = new Set(motifs.map((motif) => motif.id));
  const placements = sectionPlacements
    .filter((placement) => trackIds.has(placement.trackId) && knownMotifIds.has(placement.motifId))
    .map((placement) => ({
      ...placement,
      startBar: Math.max(0, Math.min(section.bars - 1, placement.startBar)),
      bars: Math.max(1, Math.min(section.bars - placement.startBar, placement.bars)),
    }));

  return placements.length > 0
    ? { motifs, placements: compactPlacements(placements) }
    : { motifs: fallback.motifs, placements: compactPlacements(fallback.placements) };
}

function buildGeneratedClips(
  section: ArrangementSection,
  sectionIndex: number,
  tracks: Track[],
  generationId: string,
  compositionPlan?: CompositionPlan,
): ArrangementSection["clips"] {
  const libraryPlan = sectionPatternLibraryPlan(section, tracks, compositionPlan);
  const motifsById = new Map(libraryPlan.motifs.map((motif) => [motif.id, motif]));

  libraryPlan.motifs.forEach((motif) => {
    const track = tracks.find((candidate) => candidate.id === motif.trackId);
    if (!track) {
      return;
    }
    const trackIndex = tracks.findIndex((candidate) => candidate.id === track.id);
    const sourceBar = Math.max(0, Math.min(Math.max(1, section.bars) - 1, motif.sourceBar));
    const variant = makeTrackVariant(
      track,
      section.chordProgression,
      sectionIndex,
      Math.max(0, trackIndex),
      sourceBar,
      compositionPlan,
      compositionPlan?.arrangementIntent.sections.find((intent) => intent.id === section.id)?.energy,
      section.bars,
    );
    track.clipVariants = {
      ...(track.clipVariants ?? {}),
      [`${generationId}-${section.id}-${motif.id}`]: applyMotifTransform(variant, motif),
    };
  });

  return libraryPlan.placements.flatMap((placement) => {
    const motif = motifsById.get(placement.motifId);
    if (!motif) {
      return [];
    }
    const safeStart = Math.max(0, Math.min(section.bars - 1, placement.startBar));
    const safeBars = Math.max(1, Math.min(section.bars - safeStart, placement.bars));
    return {
      id: `${generationId}-${section.id}-${placement.trackId}-${placement.motifId}-${safeStart + 1}`,
      trackId: placement.trackId,
      variantId: `${generationId}-${section.id}-${motif.id}`,
      bars: safeBars,
      startBar: safeStart,
      muted: false,
    };
  });
}

function buildAutomationLanes(section: ArrangementSection, tracks: Track[]): AutomationLane[] {
  return tracks.map((track, index) => {
    const target = track.type === "bass" ? "filter.cutoff" : "fx.drive";
    return {
      id: `${section.id}-${track.id}-${target}`,
      trackId: track.id,
      target,
      points: [
        { bar: 0, value: 0.35 + ((index + 1) % 4) * 0.12 },
        { bar: Math.max(1, section.bars - 1), value: 0.7 - (index % 3) * 0.1 },
      ],
    };
  });
}

function mergeAutomationLanes(section: ArrangementSection, tracks: Track[]): AutomationLane[] {
  const existing = section.automationLanes ?? [];
  const existingKeys = new Set(existing.map((lane) => `${lane.trackId}:${lane.target}`));
  const generated = buildAutomationLanes(section, tracks);
  const missing = generated.filter((lane) => !existingKeys.has(`${lane.trackId}:${lane.target}`));
  return [...existing, ...missing];
}

/**
 * Expands a song idea into section-populated clips + variants for all tracks.
 */
export function materializeSongIdea(
  songIdea: SongIdea,
  tracks: Track[],
  compositionPlan?: CompositionPlan,
): { arrangement: SongArrangement; tracks: Track[] } {
  const nextTracks = tracks.map((track) => {
    const instrumentIntent = compositionPlan?.instrumentIntents.find(
      (intent) => intent.trackId === track.id || intent.role === track.role,
    );
    const recommendation = songIdea.recommendedTracks.find(
      (candidate) =>
        candidate.name.toLowerCase() === track.name.toLowerCase() ||
        (track.role && candidate.role === track.role),
    );
    const instrumentPluginId = instrumentIntent?.instrumentPluginId ?? chooseInstrumentPlugin(track, songIdea);
    const preset = resolveInstrumentPreset(
      instrumentIntent?.instrumentPresetId ?? recommendation?.instrumentPresetId,
      instrumentPluginId,
    );
    const patchIntent = compositionPlan?.patchIntents.find(
      (intent) => intent.trackId === track.id || intent.trackId === track.role,
    );
    const baseDeviceChain =
      track.deviceChain.instrumentPluginId === instrumentPluginId
        ? track.deviceChain
        : {
            ...makeDefaultDeviceChain(instrumentPluginId),
            effects: track.deviceChain.effects,
          };
    return {
      ...track,
      synthPatch: applyPatchIntent(
        track.type === "drum" ? track.synthPatch : preset?.synthPatch ?? track.synthPatch,
        patchIntent,
      ),
      deviceChain: applyDeviceIntent(baseDeviceChain, patchIntent),
      clipVariants: { ...(track.clipVariants ?? {}) },
    };
  });
  const nextSections = songIdea.arrangement.sections.map((section, sectionIndex) => {
    const generationId = compositionPlan
      ? `composer-${sanitizeTitle(compositionPlan.title)}`
      : "generated";
    const generatedClips = buildGeneratedClips(
      section,
      sectionIndex,
      nextTracks,
      generationId,
      compositionPlan,
    );

    return {
      ...section,
      // Keep lanes empty until this generation pass materializes fresh clip content.
      clips: generatedClips,
      assets: section.assets ?? [],
      automationLanes: mergeAutomationLanes(section, nextTracks),
    };
  });

  return {
    arrangement: {
      ...songIdea.arrangement,
      sections: nextSections,
      totalBars: songIdea.arrangement.sectionOrder
        .map((id) => nextSections.find((section) => section.id === id)?.bars ?? 0)
        .reduce((acc, bars) => acc + bars, 0),
    },
    tracks: nextTracks,
  };
}
