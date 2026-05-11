import assert from "node:assert/strict";
import test from "node:test";

import { makeDefaultArrangement, makeRenderPlan } from "../../lib/arrangement/defaults";
import { agentResponseSchemas } from "../../lib/ai/schemas";
import { createDefaultTracks } from "../../lib/loop/defaults";

test("song-idea schema validates canonical generated payload", () => {
  const tracks = createDefaultTracks();
  const arrangement = makeDefaultArrangement(tracks, 140);
  const payload = {
    songIdea: {
      title: "Test Idea",
      mood: "dark and punchy",
      arrangement,
      recommendedTracks: [
        { name: "Kick", role: "rhythm", instrumentPluginId: "sampler-drum-rack" },
        { name: "Wobble Bass", role: "bass", instrumentPluginId: "subtractive-bass" },
      ],
      renderPlan: makeRenderPlan(arrangement, tracks),
    },
  };
  const parsed = agentResponseSchemas["song-idea"].safeParse(payload);
  assert.equal(parsed.success, true);
});

test("song-idea schema accepts normalized object-section style payload", () => {
  const normalizedLikeRoute = {
    songIdea: {
      title: "Bass Drop Riddim",
      mood: "aggressive",
      arrangement: {
        id: "riddim-140",
        bpm: 140,
        totalBars: 16,
        sectionOrder: ["intro", "drop"],
        sections: [
          {
            id: "intro",
            name: "Intro",
            bars: 8,
            clips: [
              {
                id: "intro-kick-clip",
                trackId: "kick",
                variantId: "base",
                bars: 8,
                startBar: 0,
                muted: false,
              },
            ],
            assets: [],
            automationLanes: [],
            chordProgression: [{ chord: "Am", bars: 2 }],
            locked: false,
          },
          {
            id: "drop",
            name: "Drop",
            bars: 8,
            clips: [
              {
                id: "drop-bass-clip",
                trackId: "bass",
                variantId: "base",
                bars: 8,
                startBar: 0,
                muted: false,
              },
            ],
            assets: [],
            automationLanes: [],
            chordProgression: [{ chord: "F", bars: 2 }],
            locked: false,
          },
        ],
        scenes: [{ id: "scene-1", name: "Scene 1", sectionIds: ["intro", "drop"] }],
      },
      recommendedTracks: [
        { name: "Kick", role: "rhythm", instrumentPluginId: "sampler-drum-rack" },
        { name: "Bass", role: "bass", instrumentPluginId: "subtractive-bass" },
      ],
      renderPlan: {
        stemMap: [{ trackId: "kick", stemName: "kick.wav" }],
        sectionMarkers: [{ sectionId: "intro", startBar: 0, endBar: 8 }],
        tempoMap: [{ bar: 0, bpm: 140 }],
      },
    },
  };

  const parsed = agentResponseSchemas["song-idea"].safeParse(normalizedLikeRoute);
  assert.equal(parsed.success, true);
});
