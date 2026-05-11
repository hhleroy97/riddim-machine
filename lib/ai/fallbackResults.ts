import { createDefaultTracks } from "@/lib/loop/defaults";
import { makeDefaultArrangement, makeRenderPlan } from "@/lib/arrangement/defaults";
import type {
  AIArrangerResult,
  AIChordResult,
  AIMixCoachResult,
  AIModulationResult,
  AIPatternResult,
  AISongIdeaResult,
  Track,
} from "@/types";

interface FallbackOptions {
  prompt?: string;
  bpm?: number;
  bars?: number;
}

function randomizedPatternTracks(): Track[] {
  return createDefaultTracks().map((track) => ({
    ...track,
    steps: track.steps.map((step, index) => ({
      ...step,
      active:
        track.type === "drum"
          ? index % 4 === 0 || index % 8 === 4
          : index % 2 === 0 || index % 8 === 3,
    })),
  }));
}

function pickOne<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)] ?? items[0];
}

function pickMany<T>(items: T[], count: number): T[] {
  const pool = [...items];
  const result: T[] = [];
  while (pool.length > 0 && result.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    const [item] = pool.splice(index, 1);
    if (item !== undefined) {
      result.push(item);
    }
  }
  return result.length > 0 ? result : [items[0] as T];
}

/**
 * Returns deterministic fallback payloads when API key is unavailable.
 */
export function getFallbackResult(agentId: string, options: FallbackOptions = {}):
  | AIPatternResult
  | AIChordResult
  | AIModulationResult
  | AIArrangerResult
  | AISongIdeaResult
  | AIMixCoachResult {
  if (agentId === "pattern") {
    return { tracks: randomizedPatternTracks() };
  }

  if (agentId === "chord") {
    return {
      chords: ["Fm", "Db", "Eb", "Cm"],
      progression: [
        { chord: "Fm", bars: 1 },
        { chord: "Db", bars: 1 },
        { chord: "Eb", bars: 1 },
        { chord: "Cm", bars: 1 },
      ],
    };
  }

  if (agentId === "modulation") {
    return { cutoff: 640, resonance: 3.4 };
  }

  if (agentId === "arranger") {
    return {
      sections: [
        { name: "Intro", bars: 8 },
        { name: "Build", bars: 8 },
        { name: "Drop", bars: 16 },
      ],
    };
  }

  if (agentId === "song-idea") {
    const tracks = randomizedPatternTracks();
    const bpm = options.bpm ?? 140;
    const arrangement = makeDefaultArrangement(tracks, bpm);
    const sectionTemplates = [
      { id: "intro", name: "Intro", bars: 4 },
      { id: "build", name: "Build", bars: 4 },
      { id: "switch", name: "Switch", bars: 4 },
      { id: "drop", name: "Drop", bars: 8 },
      { id: "break", name: "Break", bars: 4 },
      { id: "final", name: "Final Drop", bars: 8 },
    ];
    const chordPacks = [
      ["Fm", "Db", "Eb", "Cm"],
      ["F#m", "D", "E", "C#m"],
      ["Gm", "Eb", "F", "Dm"],
      ["Em", "C", "D", "Bm"],
    ];
    const names = [
      "Warehouse Pressure",
      "Chrome Wobble",
      "Sub Reactor",
      "Void Mechanics",
      "Hydraulic Drop",
    ];
    const moods = [
      "dark, tense, mechanical",
      "aggressive, futuristic, punchy",
      "gritty, heavy, cinematic",
      "industrial, moody, energetic",
    ];

    const selectedTemplates = pickMany(
      sectionTemplates,
      3 + Math.floor(Math.random() * 2),
    );
    const selectedChordPack = pickOne(chordPacks);
    const baseSection = arrangement.sections[0];
    arrangement.sections = selectedTemplates.map((template, index) => {
      const next = structuredClone(baseSection);
      next.id = `section-${template.id}`;
      next.name = template.name;
      next.bars = template.bars;
      next.chordProgression = [
        { chord: selectedChordPack[index % selectedChordPack.length] ?? "Fm", bars: 2 },
        { chord: selectedChordPack[(index + 1) % selectedChordPack.length] ?? "Db", bars: 2 },
      ];
      next.clips = next.clips.map((clip) => ({ ...clip, id: `${next.id}-${clip.trackId}-clip` }));
      return next;
    });
    arrangement.sectionOrder = arrangement.sections.map((section) => section.id);
    arrangement.totalBars = arrangement.sections.reduce((acc, section) => acc + section.bars, 0);

    const moodHint = options.prompt
      ? `${pickOne(moods)} (${options.prompt.slice(0, 42)})`
      : pickOne(moods);
    return {
      songIdea: {
        title: pickOne(names),
        mood: moodHint,
        arrangement,
        recommendedTracks: [
          {
            name: "Kick",
            role: "rhythm",
            instrumentPluginId: "sampler-drum-rack",
            instrumentPresetId: "inst-drum-rack-half-time",
          },
          {
            name: "Snare",
            role: "rhythm",
            instrumentPluginId: "sampler-drum-rack",
            instrumentPresetId: "inst-drum-rack-snap",
          },
          {
            name: "Hi-Hats",
            role: "rhythm",
            instrumentPluginId: "sampler-drum-rack",
            instrumentPresetId: "inst-drum-rack-half-time",
          },
          {
            name: "Wobble Bass",
            role: "bass",
            instrumentPluginId: "wavetable-synth",
            instrumentPresetId: "inst-wavetable-vowel-bass",
          },
          {
            name: "Lead Synth",
            role: "lead",
            instrumentPluginId: "supersaw-stack",
            instrumentPresetId: "inst-supersaw-alarm-hook",
          },
          {
            name: "Chord Synth",
            role: "harmony",
            instrumentPluginId: "additive-synth",
            instrumentPresetId: "inst-additive-crystal-pad",
          },
        ],
        renderPlan: makeRenderPlan(arrangement, tracks),
      },
    };
  }

  return {
    suggestions: [
      "Trim sub frequencies below 30Hz on non-bass channels.",
      "Sidechain bass to kick for cleaner transients.",
      "Reduce high-hat brightness around 9kHz slightly.",
    ],
  };
}
