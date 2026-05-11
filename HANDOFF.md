# HANDOFF.md — RIDDIM Product Scope

## 1. Product Vision
RIDDIM is a browser-based AI-powered dubstep loop studio. Users can program rhythmic patterns, synth basslines, import MIDI, and generate variations with AI while hearing real-time playback.

## 2. Milestone Target
Deliver a production-ready MVP with a stable audio engine, usable studio workflow, and server-side AI generation endpoints.

## 3. Scope Layers
- **Phase 0 (Foundation):** Project bootstrap, architecture, types, baseline docs.
- **Phase 1 (Core MVP):** Studio UI, sequencer, Tone.js audio engine, stores/hooks, AI routes, MIDI import.
- **Phase 2 (Enhancement):** Chord tools, modulation behavior, mix coach UX, arrangement stubs and polish.
- **Phase 3 (Release Hardening):** QA, performance pass, docs completion, build validation.

## 4. Phase 1 Functional Requirements
### 4.1 Studio
- Single main page at `app/studio/page.tsx`.
- Transport controls (play/stop), BPM input, and per-track step sequencer.
- Track editing for mute/solo/volume and basic synth/drum parameters.

### 4.2 Audio
- Tone.js-backed playback with synchronized step triggering.
- In-place sequence mutation during playback.
- Audio classes expose `dispose()` and are managed via hooks.

### 4.3 Stores
- Zustand stores for audio, AI, loop persistence, and UI state.
- No cross-store imports; orchestration happens in hooks.

### 4.4 AI
- Server routes under `app/api/agents/[agentId]/route.ts`.
- Pattern and chord generation available in MVP.
- Modulation and mix-coach supported by route + UI trigger.
- Arranger route exists as a phase-gated stub.

### 4.5 MIDI
- Drag-and-drop MIDI import.
- Conversion into canonical `Track[]` + BPM where available.

## 5. User Experience Requirements
- Fast feedback: loading indicators for all async flows.
- Error surfacing through toast notifications.
- Keyboard/mouse accessible controls (sequencer cells are buttons).

## 6. Non-Functional Requirements
- TypeScript strict mode, zero `any`.
- SSR-safe audio integration.
- No secrets in client bundles.
- `pnpm build` and `pnpm tsc --noEmit` pass before completion.

## 7. Validation and Acceptance
- Manual audio validation (playback, live step toggling, restart behavior).
- AI endpoint validation via `curl` returning valid JSON.
- MIDI import validation from known `.mid` file.
- Final lint/typecheck/build all pass.

## 8. Deliverables
- Working studio app and API routes.
- Documentation (`README.md`, architecture notes, validation notes).
- Baseline tests for critical pure logic and API helpers.

## 9. Phase Exit Criteria
### Phase 0 Exit
- Project scaffolded with required directories and base types.

### Phase 1 Exit
- End-to-end loop creation flow works: edit steps -> play audio -> AI assist -> save/load loops.

### Phase 2 Exit
- Chord/modulation/mix-coach enhancements integrated and stable.

### Phase 3 Exit
- Release gate checks pass and docs are complete.

## 10. Risks and Constraints
- Browser audio context requires user gesture start.
- Tone.js/SSR interactions can fail silently without guards.
- AI output JSON may be malformed and must be parsed defensively.

## 11. Section 18.2 Allowed Top-Level Dependencies
- `next`
- `react`
- `react-dom`
- `tone`
- `zustand`
- `zod`
- `@anthropic-ai/sdk`
- `@tonejs/midi`
- `lucide-react`
- `clsx`
- `tailwind-merge`

## 12. Runtime Agent Mapping
- `pattern` -> `PatternAgent`
- `chord` -> `ChordAgent`
- `modulation` -> `ModulationAgent`
- `arranger` -> `ArrangerAgent` (stub in Phase 1)
- `mix-coach` -> `MixCoachAgent`
