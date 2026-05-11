# Architecture

## Runtime Boundaries

- `components/` render UI and dispatch user intent.
- `stores/` own domain state and remain audio-agnostic.
- `hooks/` bridge store changes into Tone.js engine behavior.
- `lib/audio/` contains pure Tone.js classes and transport scheduling.
- `app/api/agents/[agentId]/route.ts` handles all Claude requests server-side.

## Data Flow

1. User edits sequence/mixer controls in studio components.
2. `audioStore` updates canonical track/tempo state.
3. `useAudioEngine` mirrors state to `AudioEngine` with in-place sequence mutation.
4. Transport tick updates current step index for UI highlighting.
5. AI requests update `aiStore`; applicable results are injected into `audioStore`.

## Studio Workspace Shell

- `StudioApp` now acts as a DAW shell rather than a long single page.
- `stores/uiStore.ts` owns navigation-only state:
  - active workspace (`pattern`, `arrangement`, `sound-design`, `mixer`)
  - selected track
  - selected clip
  - focused side panel
- `components/studio/StudioShell.tsx` provides persistent transport, track rail, workspace tabs, inspector, and docks.
- `TrackRail` is the primary project browser: selecting a track focuses it; opening an instrument jumps directly into Sound Design.
- `PatternWorkspace` owns drum step programming and scale-constrained melodic note editing.
- `ArrangementWorkspace` owns section lanes and visual timeline context for pattern clips, automation clips, and audio/MIDI assets.
- `SoundDesignWorkspace` scopes patch and device-chain editing to the selected track.

## Sound Design Foundation (v1+)

- Track model now embeds `synthPatch` directly in canonical `Track`.
- `lib/audio/patches.ts` owns built-in instrument presets; `lib/audio/presetLibrary.ts` adds canonical `role:*` and `instrument:*` tags for UI filtering.
- `lib/ai/instrumentCatalog.ts` exposes a compact preset catalog (`presetId`, plugin id, roles, tags) to server-side agents, so AI can choose role-appropriate instrument presets instead of only coarse plugin ids.
- Song ideas and composer instrument intents may include `instrumentPresetId`; arrangement materialization applies the matching preset patch when the selected preset belongs to the selected instrument plugin.
- Bass synthesis uses layered voice architecture (sub/mid/noise) with filter/envelope/FX path in `lib/audio/WobbleBass.ts`.
- Modulation matrix is evaluated via `lib/audio/modMatrix.ts` using routes (`source -> target -> amount`) and clamped target limits.
- Patch defaults, presets, and migration helpers live in `lib/audio/patches.ts`.
- `useAudioEngine` performs incremental patch diffing and calls `AudioEngine.setTrackPatch(...)` without transport teardown.

### Patch Editing Flow

1. User edits knobs/routes in `components/studio/SynthPatchPanel.tsx`.
2. `audioStore` mutates embedded `track.synthPatch`.
3. `useAudioEngine` detects patch deltas and applies patch updates to `AudioEngine`.
4. `WobbleBass` applies patch to active Tone nodes and modulation targets.

## Plugin Ecosystem Layer

- Plugin contracts live in `lib/audio/plugins/contracts.ts`.
- Runtime registration lives in `lib/audio/plugins/registry.ts` and `lib/audio/plugins/defaultRegistry.ts`.
- `AudioEngine` now builds per-track module graphs from `track.deviceChain`:
  - one instrument plugin instance per track
  - ordered effect chain (insert topology)
  - incremental chain reapply without sequence recreation
- Preset platform is separated into:
  - instrument presets
  - effect-chain presets
  - full plugin-chain presets
  in `lib/audio/presetLibrary.ts`.

## AI Full-Stack Generation Contract

- Request body now includes selected track and chain context (`selectedTrackId`, `selectedTrackChain`).
- Automation generation additionally receives the selected arrangement section so lanes can be scoped to existing pattern clips.
- Client-side AI calls are user-intent only: generation and coach requests are dispatched from explicit UI actions, not transport timers, effects, or playback state changes.
- Song arrangement generation uses `song-idea` payloads with optional `arrangementGoals`.
- Theory-guided riddim generation uses `riddim-composer`, which orchestrates:
  - `riddim-director` for key/mode/progression/section intent
  - `riddim-motif` for bass, lead, chord, and half-time drum motifs
  - `riddim-patch` for instrument and effect-stack intent
  - `riddim-critic` for negative-space, role-separation, and anti-arpeggio quality gates
- Responses are validated per-agent with Zod (`agentResponseSchemas` in `lib/ai/schemas.ts`).
- `riddim-director`, `riddim-motif`, `riddim-patch`, and `riddim-critic` responses pass through narrow contract normalizers before validation to repair common model drift such as descriptive style strings, legacy harmonic keys, missing section roles, section-scoped prose motif plans, external plugin vocabulary, or 10-point critic scores.
- Pattern results are normalized through `normalizeTracks` before store injection to preserve runtime compatibility.
- Critic rejection or invalid sub-agent JSON/schema output returns an error; there is no silent fallback.

## AI Route Model

- Input validation: `zod` (`lib/ai/schemas.ts`)
- Prompt definitions: `lib/ai/prompts.ts`
- Parse strategy: markdown-fence stripping before JSON parse (`lib/ai/parseAgentJson.ts`)
- Fallback strategy: none for AI generation; failures are logged server-side and surfaced in UI toasts.

## MIDI Import Path

1. Drag/drop file in `MidiImporter`.
2. Parse ArrayBuffer in `lib/midi/parseMidi.ts`.
3. Convert MIDI tracks to canonical `Track[]`.
4. Replace live tracks in `audioStore`.

## Arrangement + Timeline Playback

- `stores/arrangementStore.ts` owns `SongArrangement` state (sections, order, section bars, chord progressions).
- `lib/arrangement/timeline.ts` maps global timeline position to section-local step (`mapArrangementStep`).
- `useAudioEngine` now requests section-scoped track views from arrangement store so transport remains continuous while section focus changes.
- During arranged playback, tracks with explicit clips are silenced on bars where no clip exists for that track (no implicit fallback to base pattern on uncovered bars).
- Track model includes `clipVariants`, enabling section-specific patterns without changing track identity.
- `ArrangementTimeline` hosts the selected-section playlist grid: drag generated pattern variants onto bar-aligned track lanes, drop MIDI/audio files into cells, and select pattern/audio/automation blocks for inspector focus.
- `ArrangementGrid` renders one span per clip or asset instead of repeating content in every occupied bar cell, with subtle 16th-note subdivisions and a snapped playhead overlay.
- `ArrangementPanel` owns section controls, the draggable pattern palette, AI song idea inputs, manual automation authoring, and AutomationAgent generation without duplicating the visual lane grid.
- `lib/arrangement/grid.ts` contains pixel-independent grid placement and playhead percentage helpers used by the UI and tests.
- The arrangement playhead is a narrow React subscriber to `arrangementStore.absoluteStep`; only the overlay rerenders on 16th-note ticks while the grid rows remain stable.
- Arrangement automation lanes may be section-scoped or clip-scoped (`clipId`/`variantId`) and are rendered under their owning track rows. Playback samples the current value at bar boundaries and applies it to live track voices through `AudioEngine.applyTrackAutomation(...)`.
- `lib/arrangement/songIdeaApply.ts` materializes generated song ideas into concrete arrangement content:
  - a reusable pattern library per composition plan (`patternLibraryPlan`)
  - repeated clip placements that reference shared base/call/response/fill/breakdown variants
  - non-empty per-section automation lanes across instruments
  - current-pass generated clips replace stale generated lane content
- The composer route derives `patternLibraryPlan` deterministically from AI-authored section roles and energy, so the model supplies musical intent while app code enforces A/A-prime/B/fill reuse and avoids one-off per-bar pattern drift.
- Riddim motif generation is bottom-up: drums establish the half-time grid, bass locks to that pocket, lead answers in the gaps, and chord stabs support the low-end rhythm instead of competing with kick/snare anchors.
- `renderMotifPhrases` treats AI-authored event steps as absolute 0-63 timeline positions. The renderer does not add phrase offsets, which keeps bass, lead, chords, and drum anchors aligned.

## Theory-Guided Riddim Renderer

- `lib/riddim/theory.ts` converts AI-authored scale degrees into playable notes and chord metadata.
- `lib/riddim/phrases.ts` renders `MotifPlan` events into bass, lead, chord, kick, snare, and hat `Step[]` buffers.
- `lib/riddim/rhythm.ts` keeps drum output in half-time grammar and applies energy-shaped hat density.
- `lib/riddim/patchIntent.ts` maps `PatchIntent` into synth macros and device-chain effects.
- `lib/riddim/composer.ts` converts validated `CompositionPlan` into an app-facing `SongIdea` scaffold before `materializeSongIdea` builds clips/automation.

## Chord Pattern Engine

- `lib/midi/chordPatterns.ts` generates deterministic chord-derived step patterns: quarter-step stabs populate both `note` (root pitch) and `notes[]` (full triad) so polyphonic stacks can resolve in the Tone.js graph.
- Chord variants are injected per section using `track.clipVariants[sectionId]`.
- Arrangement panel actions can regenerate selected section variants while preserving base sequence state.
