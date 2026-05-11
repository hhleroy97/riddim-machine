import Anthropic from "@anthropic-ai/sdk";
import { type NextRequest } from "next/server";

import { normalizeTracks } from "@/lib/audio/patches";
import { getAIInstrumentOptions } from "@/lib/ai/instrumentCatalog";
import { parseAgentJson } from "@/lib/ai/parseAgentJson";
import { AGENT_SYSTEM_PROMPTS } from "@/lib/ai/prompts";
import { repairCriticPayload } from "@/lib/ai/repairCriticPayload";
import { repairDirectorPayload } from "@/lib/ai/repairDirectorPayload";
import { repairMotifPayload } from "@/lib/ai/repairMotifPayload";
import { repairPatchPayload } from "@/lib/ai/repairPatchPayload";
import { agentBodySchema, agentResponseSchemas, compositionPlanSchema } from "@/lib/ai/schemas";
import { compositionPlanToSongIdea } from "@/lib/riddim/composer";
import type {
  ArrangementClip,
  AutomationLane,
  CompositionPlan,
  PatternLibraryPlacement,
  PatternLibraryPlan,
} from "@/types";

function logAgentRouteError(
  stage: string,
  agentId: string,
  details: Record<string, unknown>,
): void {
  console.error(`[agents/${agentId}] ${stage}`, details);
}

/**
 * Pattern agent returns multiple tracks with 16 steps plus full device chains; the default
 * budget truncates mid-JSON and breaks parseAgentJson().
 */
function maxOutputTokensForAgent(agentId: string): number {
  if (agentId === "pattern") {
    return 4096;
  }
  return 1200;
}

interface AgentInput {
  prompt: string;
  bpm: number;
  bars: number;
  existingTracks: Array<{
    id: string;
    name: string;
    type: "drum" | "bass";
    deviceChain?: {
      instrumentPluginId: string;
      instrumentParams: Record<string, number>;
      effects: unknown[];
    };
  }>;
  composerOptions?: {
    applyDespiteLowCriticScore?: boolean;
  };
  selectedArrangementSection?: {
    id: string;
    name: string;
    bars: number;
    clips: ArrangementClip[];
    automationLanes: AutomationLane[];
  };
}

function toAgentModelInput(input: {
  prompt: string;
  bpm: number;
  bars: number;
  existingTracks: Array<{
    id: string;
    name: string;
    type: "drum" | "bass";
    deviceChain?: {
      instrumentPluginId: string;
      instrumentParams: Record<string, number>;
      effects: unknown[];
    };
  }>;
  selectedTrackId?: string;
  selectedTrackChain?: {
    instrumentPluginId: string;
    instrumentParams: Record<string, number>;
    effects: unknown[];
  };
  selectedArrangementSection?: {
    id: string;
    name: string;
    bars: number;
    clips: ArrangementClip[];
    automationLanes: AutomationLane[];
  };
  arrangementGoals?: {
    desiredSections?: number;
    targetBars?: number;
    mood?: string;
    energyCurve?: number[];
  };
}): string {
  return JSON.stringify({
    prompt: input.prompt,
    bpm: input.bpm,
    bars: input.bars,
    existingTracks: input.existingTracks,
    selectedTrackId: input.selectedTrackId,
    selectedTrackChain: input.selectedTrackChain,
    selectedArrangementSection: input.selectedArrangementSection,
    arrangementGoals: input.arrangementGoals,
    availableInstrumentOptions: getAIInstrumentOptions(),
  });
}

function repairSongIdeaPayload(payload: unknown, input: AgentInput): unknown {
  const asRecord = payload as Record<string, unknown> | null;
  const source = asRecord?.songIdea && typeof asRecord.songIdea === "object"
    ? (asRecord.songIdea as Record<string, unknown>)
    : asRecord;
  if (!source || typeof source !== "object") {
    return payload;
  }

  const arrangementRaw = (source.arrangement as Record<string, unknown> | undefined) ?? {};
  const sectionsRaw = arrangementRaw.sections ?? source.sections;
  const sectionsEntries: Array<{ key: string; value: Record<string, unknown> }> = Array.isArray(
    sectionsRaw,
  )
    ? sectionsRaw.map((item, index) => ({
        key: `section-${index + 1}`,
        value: (item as Record<string, unknown>) ?? {},
      }))
    : sectionsRaw && typeof sectionsRaw === "object"
      ? Object.entries(sectionsRaw as Record<string, unknown>).map(([key, value]) => ({
          key,
          value: (value as Record<string, unknown>) ?? {},
        }))
      : [];

  if (sectionsEntries.length === 0) {
    return payload;
  }

  const normalizedSections = sectionsEntries.map(({ key, value }, sectionIndex) => {
    const section = value;
    const sectionId = typeof section.id === "string" ? section.id : key;
    const sectionBars =
      typeof section.bars === "number" && Number.isFinite(section.bars)
        ? Math.max(1, Math.min(16, Math.round(section.bars)))
        : Math.max(1, input.bars);
    const chordProgressionRaw = Array.isArray(section.chordProgression)
      ? section.chordProgression
      : [];
    const chordProgression =
      chordProgressionRaw.length > 0
        ? chordProgressionRaw.map((item, chordIndex) => {
            const candidate = item as Record<string, unknown>;
            return {
              chord:
                typeof candidate.chord === "string"
                  ? candidate.chord
                  : chordIndex % 2 === 0
                    ? "Fm"
                    : "Db",
              bars:
                typeof candidate.bars === "number"
                  ? Math.max(1, Math.min(8, Math.round(candidate.bars)))
                  : 2,
            };
          })
        : [{ chord: "Fm", bars: Math.max(1, Math.min(4, sectionBars)) }];

    const baseClips = input.existingTracks.map((track, trackIndex) => ({
      id: `${sectionId}-${track.id}-clip`,
      trackId: track.id,
      variantId: "base",
      bars: sectionBars,
      startBar: 0,
      muted: trackIndex > 0 && sectionIndex === 0 ? false : false,
    }));
    const clipsRaw = section.clips;
    const existingClips = Array.isArray(clipsRaw)
      ? clipsRaw.map((clipCandidate, clipIndex) => {
          const clip = clipCandidate as Record<string, unknown>;
          return {
            id: typeof clip.id === "string" ? clip.id : `${sectionId}-clip-${clipIndex}`,
            trackId:
              typeof clip.trackId === "string"
                ? clip.trackId
                : input.existingTracks[clipIndex % input.existingTracks.length]?.id ?? "track-1",
            variantId: typeof clip.variantId === "string" ? clip.variantId : "base",
            bars:
              typeof clip.bars === "number"
                ? Math.max(1, Math.min(16, Math.round(clip.bars)))
                : sectionBars,
            startBar:
              typeof clip.startBar === "number" ? Math.max(0, Math.round(clip.startBar)) : 0,
            muted: Boolean(clip.muted),
          };
        })
      : clipsRaw && typeof clipsRaw === "object"
        ? Object.entries(clipsRaw as Record<string, unknown>).map(([trackId], clipIndex) => ({
            id: `${sectionId}-${trackId}-clip-${clipIndex}`,
            trackId,
            variantId: `${sectionId}-${trackId}`,
            bars: sectionBars,
            startBar: 0,
            muted: false,
          }))
        : [];
    const existingClipKeys = new Set(existingClips.map((clip) => `${clip.trackId}:${clip.variantId}:${clip.startBar}`));
    const clips = [...existingClips, ...baseClips.filter((clip) => !existingClipKeys.has(`${clip.trackId}:${clip.variantId}:${clip.startBar}`))];

    return {
      id: sectionId,
      name: typeof section.name === "string" ? section.name : `Section ${sectionIndex + 1}`,
      bars: sectionBars,
      clips,
      assets: Array.isArray(section.assets) ? section.assets : [],
      automationLanes: Array.isArray(section.automationLanes) ? section.automationLanes : [],
      chordProgression,
      locked: Boolean(section.locked),
    };
  });

  const sectionOrder =
    Array.isArray(arrangementRaw.sectionOrder)
      ? ((arrangementRaw.sectionOrder as unknown[]) ?? [])
          .filter((item): item is string => typeof item === "string")
      : normalizedSections.map((section) => section.id);
  const safeSectionOrder = sectionOrder.length > 0 ? sectionOrder : normalizedSections.map((section) => section.id);
  const totalBars = normalizedSections.reduce((acc, section) => acc + section.bars, 0);

  const scenesRaw = Array.isArray(arrangementRaw.scenes) ? arrangementRaw.scenes : [];
  const scenes =
    scenesRaw.length > 0
      ? scenesRaw.map((sceneCandidate, sceneIndex) => {
          const scene = sceneCandidate as Record<string, unknown>;
          const sceneName = typeof scene.name === "string" ? scene.name : `Scene ${sceneIndex + 1}`;
          let sectionIds: string[] = [];
          if (Array.isArray(scene.sectionIds)) {
            sectionIds = scene.sectionIds.filter((id): id is string => typeof id === "string");
          } else if (typeof sceneName === "string") {
            const guessed = normalizedSections.find((section) =>
              section.name.toLowerCase().includes(sceneName.toLowerCase()),
            );
            if (guessed) {
              sectionIds = [guessed.id];
            }
          }
          if (sectionIds.length === 0) {
            sectionIds = [safeSectionOrder[sceneIndex % safeSectionOrder.length] ?? safeSectionOrder[0] ?? "section-1"];
          }
          return {
            id: typeof scene.id === "string" ? scene.id : `scene-${sceneIndex + 1}`,
            name: sceneName,
            sectionIds,
          };
        })
      : [{ id: "scene-1", name: "Scene 1", sectionIds: safeSectionOrder }];

  const recommendedTracksRaw = Array.isArray(source.recommendedTracks)
    ? source.recommendedTracks
    : [];
  const recommendedTracks =
    recommendedTracksRaw.length > 0
      ? recommendedTracksRaw.map((candidate, index) => {
          const track = candidate as Record<string, unknown>;
          const id = typeof track.id === "string" ? track.id : undefined;
          const found = id
            ? input.existingTracks.find((existing) => existing.id === id)
            : input.existingTracks[index];
          const roleRaw = track.role;
          const role =
            roleRaw === "rhythm" ||
            roleRaw === "bass" ||
            roleRaw === "harmony" ||
            roleRaw === "lead" ||
            roleRaw === "fx"
              ? roleRaw
              : found?.type === "drum"
                ? "rhythm"
                : "bass";
          const pluginRaw = track.instrumentPluginId;
          const instrumentPluginId =
            pluginRaw === "sampler-drum-rack" ||
            pluginRaw === "subtractive-bass" ||
            pluginRaw === "fm-synth" ||
            pluginRaw === "wavetable-synth" ||
            pluginRaw === "granular-texture" ||
            pluginRaw === "additive-synth" ||
            pluginRaw === "phase-distortion-synth" ||
            pluginRaw === "karplus-pluck" ||
            pluginRaw === "supersaw-stack" ||
            pluginRaw === "percussive-noise"
              ? pluginRaw
              : found?.deviceChain?.instrumentPluginId ??
                (found?.type === "drum" ? "sampler-drum-rack" : "subtractive-bass");
          const instrumentPresetId =
            typeof track.instrumentPresetId === "string" &&
            getAIInstrumentOptions().some(
              (option) =>
                option.presetId === track.instrumentPresetId &&
                option.instrumentPluginId === instrumentPluginId,
            )
              ? track.instrumentPresetId
              : undefined;
          return {
            name:
              typeof track.name === "string"
                ? track.name
                : found?.name ?? id ?? `Track ${index + 1}`,
            role,
            instrumentPluginId,
            ...(instrumentPresetId ? { instrumentPresetId } : {}),
          };
        })
      : input.existingTracks.map((track) => ({
          name: track.name,
          role: track.type === "drum" ? "rhythm" : "bass",
          instrumentPluginId:
            track.deviceChain?.instrumentPluginId ??
            (track.type === "drum" ? "sampler-drum-rack" : "subtractive-bass"),
        }));

  const normalized = {
    songIdea: {
      title: typeof source.title === "string" ? source.title : "Generated Song Idea",
      mood: typeof source.mood === "string" ? source.mood : "dark, energetic",
      arrangement: {
        id:
          typeof arrangementRaw.id === "string"
            ? (arrangementRaw.id as string)
            : "arrangement-ai",
        bpm:
          typeof arrangementRaw.bpm === "number"
            ? Number(arrangementRaw.bpm)
            : input.bpm,
        totalBars,
        sectionOrder: safeSectionOrder,
        sections: normalizedSections,
        scenes,
      },
      recommendedTracks,
      renderPlan:
        source.renderPlan && typeof source.renderPlan === "object"
          ? {
              stemMap: Array.isArray((source.renderPlan as Record<string, unknown>).stemMap)
                ? ((source.renderPlan as Record<string, unknown>).stemMap as unknown[])
                : input.existingTracks.map((track) => ({
                    trackId: track.id,
                    stemName: `${track.name.toLowerCase().replace(/\s+/g, "-")}.wav`,
                  })),
              sectionMarkers: Array.isArray((source.renderPlan as Record<string, unknown>).sectionMarkers)
                ? ((source.renderPlan as Record<string, unknown>).sectionMarkers as unknown[])
                : normalizedSections.reduce<
                    Array<{ sectionId: string; startBar: number; endBar: number }>
                  >((acc, section) => {
                    const startBar = acc.length === 0 ? 0 : acc[acc.length - 1]!.endBar;
                    acc.push({ sectionId: section.id, startBar, endBar: startBar + section.bars });
                    return acc;
                  }, []),
              tempoMap: Array.isArray((source.renderPlan as Record<string, unknown>).tempoMap)
                ? ((source.renderPlan as Record<string, unknown>).tempoMap as unknown[])
                : [{ bar: 0, bpm: input.bpm }],
            }
          : {
              stemMap: input.existingTracks.map((track) => ({
                trackId: track.id,
                stemName: `${track.name.toLowerCase().replace(/\s+/g, "-")}.wav`,
              })),
              sectionMarkers: normalizedSections.reduce<Array<{ sectionId: string; startBar: number; endBar: number }>>(
                (acc, section) => {
                  const startBar = acc.length === 0 ? 0 : acc[acc.length - 1]!.endBar;
                  acc.push({ sectionId: section.id, startBar, endBar: startBar + section.bars });
                  return acc;
                },
                [],
              ),
              tempoMap: [{ bar: 0, bpm: input.bpm }],
            },
    },
  };

  return normalized;
}

class AgentRouteError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly response: Record<string, unknown>,
  ) {
    super(message);
  }
}

function compactPatternPlacements(
  placements: PatternLibraryPlacement[],
): PatternLibraryPlacement[] {
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

function motifId(trackId: string, suffix: string): string {
  return `${trackId}-${suffix}`;
}

function motifForBar(
  section: CompositionPlan["arrangementIntent"]["sections"][number],
  trackId: string,
  barIndex: number,
): string {
  const phraseSlot = barIndex % 4;
  const isFinalBar = barIndex === section.bars - 1;
  if (isFinalBar && section.role !== "intro" && section.role !== "break") {
    return motifId(trackId, "fill");
  }
  if (section.role === "intro" || section.role === "break" || section.role === "outro" || section.energy < 0.35) {
    return phraseSlot === 3 ? motifId(trackId, "response") : motifId(trackId, "breakdown");
  }
  if (section.role === "build") {
    return phraseSlot === 3 ? motifId(trackId, "fill") : phraseSlot % 2 === 0 ? motifId(trackId, "base") : motifId(trackId, "response");
  }
  return phraseSlot % 2 === 0 ? motifId(trackId, "call") : motifId(trackId, "response");
}

function buildPatternLibraryPlan(
  arrangementIntent: CompositionPlan["arrangementIntent"],
  tracks: AgentInput["existingTracks"],
): PatternLibraryPlan {
  const motifs = tracks.flatMap((track) => [
    {
      id: motifId(track.id, "base"),
      trackId: track.id,
      role: "base" as const,
      sourceBar: 0,
      transform: "none" as const,
    },
    {
      id: motifId(track.id, "call"),
      trackId: track.id,
      role: "call" as const,
      sourceBar: 0,
      transform: "density-up" as const,
    },
    {
      id: motifId(track.id, "response"),
      trackId: track.id,
      role: "response" as const,
      sourceBar: 1,
      transform: track.type === "drum" ? "density-down" as const : "transpose-up" as const,
    },
    {
      id: motifId(track.id, "fill"),
      trackId: track.id,
      role: "fill" as const,
      sourceBar: 3,
      transform: "fill-ending" as const,
    },
    {
      id: motifId(track.id, "breakdown"),
      trackId: track.id,
      role: "breakdown" as const,
      sourceBar: 0,
      transform: "density-down" as const,
    },
  ]);

  const placements = arrangementIntent.sections.flatMap((section) =>
    tracks.flatMap((track) =>
      compactPatternPlacements(
        Array.from({ length: section.bars }).map((_, barIndex) => ({
          sectionId: section.id,
          trackId: track.id,
          motifId: motifForBar(section, track.id, barIndex),
          startBar: barIndex,
          bars: 1,
        })),
      ),
    ),
  );

  return { motifs, placements };
}

function repairAgentPayload(agentId: keyof typeof agentResponseSchemas, payload: unknown): unknown {
  if (agentId === "riddim-director") {
    return repairDirectorPayload(payload);
  }
  if (agentId === "riddim-motif") {
    return repairMotifPayload(payload);
  }
  if (agentId === "riddim-patch") {
    return repairPatchPayload(payload);
  }
  if (agentId === "riddim-critic") {
    return repairCriticPayload(payload);
  }
  return payload;
}

async function runAnthropicAgent(
  anthropic: Anthropic,
  agentId: keyof typeof agentResponseSchemas,
  content: string,
): Promise<unknown> {
  const completion = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1800,
    system: AGENT_SYSTEM_PROMPTS[agentId],
    messages: [{ role: "user", content }],
  });
  const textBlock = completion.content.find((block) => block.type === "text");
  const text = textBlock?.text ?? "";
  let parsedResponse: unknown;
  try {
    parsedResponse = parseAgentJson<unknown>(text);
  } catch (error) {
    logAgentRouteError("invalid_agent_json", agentId, {
      error: error instanceof Error ? error.message : String(error),
      raw: text,
    });
    throw new AgentRouteError("Agent returned invalid JSON", 500, {
      error: `${agentId} returned invalid JSON`,
      raw: text,
    });
  }

  const schema = agentResponseSchemas[agentId];
  const responseCandidate = repairAgentPayload(agentId, parsedResponse);
  const validated = schema.safeParse(responseCandidate);
  if (!validated.success) {
    logAgentRouteError("invalid_agent_schema", agentId, {
      issues: validated.error.issues,
      raw: text,
    });
    throw new AgentRouteError("Agent returned invalid schema", 500, {
      error: `${agentId} returned invalid schema`,
      raw: text,
    });
  }
  return validated.data;
}

async function runRiddimComposer(
  anthropic: Anthropic,
  input: AgentInput,
): Promise<Response> {
  const director = (await runAnthropicAgent(
    anthropic,
    "riddim-director",
    toAgentModelInput(input),
  )) as {
    title: string;
    styleProfile: CompositionPlan["styleProfile"];
    mood: string;
    harmonicPlan: CompositionPlan["harmonicPlan"];
    arrangementIntent: CompositionPlan["arrangementIntent"];
  };
  const motif = (await runAnthropicAgent(
    anthropic,
    "riddim-motif",
    JSON.stringify({ prompt: input.prompt, bpm: input.bpm, director }),
  )) as { motifPlan: CompositionPlan["motifPlan"] };
  const patch = (await runAnthropicAgent(
    anthropic,
    "riddim-patch",
    JSON.stringify({
      prompt: input.prompt,
      existingTracks: input.existingTracks,
      availableInstrumentOptions: getAIInstrumentOptions(),
      harmonicPlan: director.harmonicPlan,
      motifPlan: motif.motifPlan,
    }),
  )) as {
    instrumentIntents: CompositionPlan["instrumentIntents"];
    patchIntents: CompositionPlan["patchIntents"];
  };
  const critic = (await runAnthropicAgent(
    anthropic,
    "riddim-critic",
    JSON.stringify({ prompt: input.prompt, director, motif, patch }),
  )) as { critic: CompositionPlan["critic"] };

  const compositionPlanCandidate = {
    title: director.title,
    styleProfile: director.styleProfile,
    mood: director.mood,
    harmonicPlan: director.harmonicPlan,
    arrangementIntent: director.arrangementIntent,
    patternLibraryPlan: buildPatternLibraryPlan(director.arrangementIntent, input.existingTracks),
    motifPlan: motif.motifPlan,
    instrumentIntents: patch.instrumentIntents,
    patchIntents: patch.patchIntents,
    critic: critic.critic,
  };
  const compositionPlan = compositionPlanSchema.parse(compositionPlanCandidate);
  const composerBypassLowCritic = input.composerOptions?.applyDespiteLowCriticScore === true;

  const criticFailed = !compositionPlan.critic.pass || compositionPlan.critic.score < 0.7;
  if (criticFailed && !composerBypassLowCritic) {
    logAgentRouteError("critic_rejected_composition", "riddim-composer", {
      critic: compositionPlan.critic,
    });
    return Response.json(
      {
        error: "Riddim critic rejected the composition",
        critic: compositionPlan.critic,
      },
      { status: 500 },
    );
  }

  if (criticFailed && composerBypassLowCritic) {
    logAgentRouteError("critic_bypassed_accepting_plan", "riddim-composer", {
      critic: compositionPlan.critic,
    });
  }

  const songIdea = compositionPlanToSongIdea(compositionPlan, input.existingTracks, input.bpm);
  return Response.json({
    compositionPlan,
    songIdea,
    ...(criticFailed && composerBypassLowCritic ? { criticBypassed: true } : {}),
  });
}

/**
 * Generic server-side AI route dispatcher.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ agentId: string }> },
): Promise<Response> {
  const { agentId } = await context.params;
  const systemPrompt = AGENT_SYSTEM_PROMPTS[agentId];
  if (!systemPrompt) {
    return Response.json({ error: "Unknown agent id" }, { status: 404 });
  }

  const payload = await request.json();
  const parsed = agentBodySchema.safeParse(payload);
  if (!parsed.success) {
    logAgentRouteError("invalid_request_payload", agentId, {
      issues: parsed.error.issues,
    });
    return Response.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logAgentRouteError("missing_api_key", agentId, {
      hasApiKey: false,
    });
    return Response.json(
      { error: "ANTHROPIC_API_KEY is missing; generation unavailable" },
      { status: 500 },
    );
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    if (agentId === "riddim-composer") {
      return await runRiddimComposer(anthropic, parsed.data);
    }
    const completion = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxOutputTokensForAgent(agentId),
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: toAgentModelInput(parsed.data),
        },
      ],
    });

    const textBlock = completion.content.find((block) => block.type === "text");
    const text = textBlock?.text ?? "";
    try {
      const parsedResponse = parseAgentJson<unknown>(text);
      if (agentId === "pattern") {
        const validated = agentResponseSchemas.pattern.safeParse(parsedResponse);
        if (!validated.success) {
          logAgentRouteError("invalid_pattern_schema", agentId, {
            issues: validated.error.issues,
            raw: text,
          });
          return Response.json(
            { error: "Agent returned invalid schema", raw: text },
            { status: 500 },
          );
        }
        return Response.json({
          tracks: normalizeTracks(validated.data.tracks),
        });
      }
      if (agentId === "song-idea") {
        const repaired = repairSongIdeaPayload(parsedResponse, parsed.data);
        const validated = agentResponseSchemas["song-idea"].safeParse(repaired);
        if (!validated.success) {
          logAgentRouteError("invalid_song_idea_schema", agentId, {
            issues: validated.error.issues,
            raw: text,
          });
          return Response.json(
            { error: "Agent returned invalid schema", raw: text },
            { status: 500 },
          );
        }
        return Response.json(validated.data);
      }

      const typedAgentId = agentId as keyof typeof agentResponseSchemas;
      const schema = agentResponseSchemas[typedAgentId];
      const responseCandidate = repairAgentPayload(typedAgentId, parsedResponse);
      const validated = schema.safeParse(responseCandidate);
      if (!validated.success) {
        logAgentRouteError("invalid_agent_schema", agentId, {
          issues: validated.error.issues,
          raw: text,
        });
        return Response.json(
          { error: "Agent returned invalid schema", raw: text },
          { status: 500 },
        );
      }

      return Response.json(validated.data);
    } catch (error) {
      const stopReason = completion.stop_reason;
      logAgentRouteError("invalid_agent_json", agentId, {
        error: error instanceof Error ? error.message : String(error),
        raw: text,
        stopReason,
      });
      return Response.json(
        {
          error: "Agent returned invalid JSON",
          stopReason,
          ...(stopReason === "max_tokens"
            ? {
                hint: "Output hit max_tokens and was likely truncated; retry or raise max_output_tokens for this agent.",
              }
            : {}),
          raw: text,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    if (error instanceof AgentRouteError) {
      return Response.json(error.response, { status: error.status });
    }
    logAgentRouteError("provider_request_failed", agentId, {
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json(
      { error: "Failed to complete agent request" },
      { status: 500 },
    );
  }
}
