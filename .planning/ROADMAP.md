# ROADMAP.md

## Milestone: RIDDIM MVP

### Phase 0 — Foundation Bootstrap
- [x] Define scope baseline in `HANDOFF.md`
- [x] Bootstrap Next.js + TypeScript strict app
- [x] Create canonical architecture directories and base modules

### Phase 1 — Core MVP Studio
- [x] Implement audio engine primitives (`lib/audio/*`)
- [x] Implement stores/hooks boundaries (`stores/*`, `hooks/*`)
- [x] Implement studio page and core components
- [x] Implement AI agent route and prompt/schemas
- [x] Implement MIDI import flow

### Phase 2 — Enhancement Layer
- [x] Chord suggestion UI path integrated in `AIPanel`
- [x] Modulation scheduling via `Tone.Transport.scheduleRepeat`
- [x] Mix coach surfaced in mixer dialog panel
- [x] Arranger route stub path available via generic route handling

### Phase 3 — Release Hardening
- [x] Add architecture + testing docs
- [x] Add baseline tests for critical pure logic
- [ ] Manual browser audio verification by user
- [ ] Real API key validation pass by user

## Notes
- Remaining unchecked items require runtime browser interaction and secrets the agent cannot perform autonomously.
