# Testing

## Automated

Run:

```bash
pnpm test
```

Current tests cover:
- AI JSON fence stripping/parsing helper
- Default loop-track bootstrap generation
- Patch preset serialization
- Legacy track patch migration normalization
- Modulation matrix clamping and target evaluation
- Plugin registry suite exposure
- Preset library migration/filter/apply helpers
- AI response schema validation
- Theory-guided riddim composer schema validation
- Scale-degree to note conversion and chord progression projection
- Motif rendering into multi-bar bass/lead/chord/drum phrase buffers, including preservation of absolute AI-authored step positions
- Scale-note generation for key/scale melodic editing
- Arrangement migration normalization (`Loop -> SongArrangement`)
- Timeline section mapping math for variable-length section chains
- Arrangement grid span/playhead percentage helpers for selected-section playlist rendering
- Chord-pattern generator determinism plus triad `notes[]` voicing checks and step note resolution helpers
- Song-idea schema validation against fallback repair payloads
- Arrangement store clip/asset/automation lane mutation actions
- AutomationAgent schema validation for clip-scoped granular lanes
- Song idea materialization (reusable pattern library placements + automation lanes)
- Composer generation-pass clip replacement and instrument intent assignment
- Regression coverage that studio AI calls are not scheduled from playback/transport state
- Track materialization helpers: structural synth patch/device chain/step equality checks used by playback sync (cheap hot-path compares)
- `useAudioEngine` drives Tone from Zustand `subscribe`/`getState` (not hooks) so transport does not rerender `StudioApp` every sixteenth; arrangement `absoluteStep` updates are coalesced via a queued microtask, and flush passes precomputed `mapArrangementStep` into materialization plus a cached last `(arrangement, step) → coords` memo in timeline for repeat calls inside the same tick
- Regression: `mapArrangementStep` returns the same coords object identity when arrangement + absolute step unchanged (transport hot path)

### Performance notes (heavy UI during play)

Beyond engine sync skips: `PatternWorkspace` is the main subscriber to `currentStep` — other tabs avoid playhead churn. The arrangement timeline playhead commits `absoluteStep` at most once per animation frame (`requestAnimationFrame`), which keeps Tone subdivisions from overwhelming React repaint. Additional wins if needed: memoize shell children (`Mixer`, rail, inspector props), RAF-throttle the pattern-grid highlight, virtualization for dense bar×track grids, and profile with Chrome Performance (React Profiler + main thread).

## Static Gates

```bash
pnpm typecheck
pnpm lint
pnpm build
```

## Manual Runtime Validation

1. Start app: `pnpm dev` then open `/studio`.
2. Workspace shell:
   - Switch between `Pattern`, `Arrangement`, `Sound Design`, and `Mixer`.
   - Confirm transport remains visible while switching workspaces.
   - Select tracks in the left rail and confirm the bottom inspector updates.
3. Transport:
   - Press Play.
   - Verify BPM reflects input.
   - With several tracks/clips armed, scrub through a full bar boundary; CPU should remain steady — engine sync skips redundant intra-bar reconciliation and `setCurrentStep` fires once per 16th.
   - Toggle steps while playback is active and confirm immediate audio change.
4. Pattern workflow:
   - In `Pattern`, toggle drum cells.
   - Change key/scale/octave controls and click melodic note cells.
   - Confirm bass/lead notes update in the selected scale and play back correctly.
   - Click a track `synth` action and confirm Sound Design opens for that instrument.
5. MIDI:
   - Drop a `.mid` file onto importer panel.
   - Confirm track data updates and optional BPM import.
6. AI:
   - Run Pattern and Chord generation from AI panel; confirm chord progressions land on selected sections and chord track step cells include polyphonic stab voicings audible with play.
   - Run Mix Coach from Mixer panel.
   - Start playback and leave it running without pressing AI buttons; confirm no `/api/agents/*` network requests are emitted.
7. Sound design:
   - Open Sound Design from a track/instrument click.
   - Switch presets for the selected track.
   - Move Macro and Mod Matrix controls while playing.
   - Confirm audible timbre changes without playback reset/glitch.
8. Device chain workflow:
   - Reorder effects in `Device Chain` panel while transport is running.
   - Toggle bypass and duplicate effects.
   - Confirm transport remains stable and updates are audible.
9. Scene variation:
   - Trigger `Generate Scene Variation`.
   - Confirm pattern changes without app errors or timing stalls.
10. Arrangement workflow:
   - Edit section bars and reorder sections in `Arrangement` panel.
   - Apply chord progression and verify bass section variant updates.
   - Confirm transport continues without restart when section selection changes.
   - Confirm the selected-section playlist grid shows track lanes, bar headers, 16th subdivisions, and one span per pattern/audio/automation block.
   - Press Play and verify the lime playhead advances once per 16th inside the selected section without making the grid feel sluggish.
   - Click clips in the timeline and verify inspector focus updates.
   - Drag pattern chips into playlist grid lane cells and verify new clips appear at the target bar.
   - Drop `.mid`/audio files into playlist grid lane cells and verify imported assets are listed.
   - Add automation points and verify parameter preview applies at bar 0.
   - Click `Generate Automation` and confirm fuchsia automation clips appear beneath their respective track rows, with clip/variant labels when generated for a pattern block.
   - Keep playback running through multiple bars and verify automation lane values continue updating at each bar boundary.
   - In sections with explicit clips for a track, verify uncovered bars for that same track stay silent instead of replaying the base pattern.
11. Theory-guided song idea AI:
   - Trigger `Generate Song Idea`.
   - Confirm the request hits `riddim-composer` and produces a critic score toast on success.
   - Confirm arrangement sections/chords populate and remain editable.
   - Confirm generated sections reuse recognizable pattern blocks (for example call/response/call/fill) instead of producing a different variant for every bar.
   - Confirm generated lead and chord events feel built around the drum/bass pocket rather than drifting ahead of or behind the groove.
   - Confirm bass, lead, and chord lanes use distinct generated phrases rather than identical arpeggios.
   - Confirm every section shows at least one pattern clip per track lane.
   - Confirm each section has populated automation lane entries.
   - Paste a custom composer or song-idea JSON in the Arrangement test box and confirm it applies.
   - If the critic rejects a weak output, confirm the toast includes the critic reasons and no fallback content is applied.
12. API:
   - `curl -X POST http://localhost:3000/api/agents/pattern -H "Content-Type: application/json" -d '{"prompt":"heavy drop","bpm":140,"bars":4,"existingTracks":[]}'`
   - `curl -X POST http://localhost:3000/api/agents/chord -H "Content-Type: application/json" -d '{"prompt":"dark drop","bpm":140,"bars":4,"existingTracks":[]}'`
   - `curl -X POST http://localhost:3000/api/agents/automation -H "Content-Type: application/json" -d '{"prompt":"add filter wobble automation","bpm":140,"bars":4,"existingTracks":[{"id":"bass","name":"Bass","type":"bass"}],"selectedArrangementSection":{"id":"drop","name":"Drop","bars":4,"clips":[{"id":"drop-bass-call-1","trackId":"bass","variantId":"bass-call","bars":1,"startBar":0,"muted":false}],"automationLanes":[]}}'`
   - `curl -X POST http://localhost:3000/api/agents/riddim-composer -H "Content-Type: application/json" -d '{"prompt":"dark industrial riddim","bpm":140,"bars":8,"existingTracks":[]}'`

## Performance Smoke Checks

- During `pnpm dev`, keep transport running for 2+ minutes while editing macros and chain order.
- Watch for audible pops/dropouts and verify CPU usage remains stable in browser task manager.
