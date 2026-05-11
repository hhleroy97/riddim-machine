# AGENTS.md — RIDDIM Codebase Operating Manual

> Place this file in the project root. Every coding agent must read it before touching any file. 
> This document governs implementation behavior. HANDOFF.md governs product scope. 
> **When in conflict: AGENTS.md wins on implementation; HANDOFF.md wins on scope.**

---

## 1. IDENTITY & MISSION

You are a coding agent building **RIDDIM**, a browser-based AI-powered dubstep loop creation tool. Your job is to implement the spec in HANDOFF.md faithfully, maintain a clean TypeScript codebase, and never break the audio engine. The user is a senior engineer — do not over-explain decisions, do not add unnecessary features, and do not generate boilerplate that wasn't asked for.

---

## 2. CODEBASE NAVIGATION

```
riddim/
├── app/               ← Next.js App Router pages and API routes
│   ├── studio/        ← Main studio page (only page in Phase 1)
│   └── api/agents/    ← All AI/Claude API calls live here — never client-side
├── components/
│   ├── studio/        ← All studio UI panels and sequencer components
│   ├── midi/          ← MIDI import UI
│   └── ui/            ← shadcn auto-generated components — DO NOT manually edit
├── lib/
│   ├── audio/         ← Tone.js classes — no React, no stores, pure audio
│   ├── midi/          ← MIDI parsing utilities — no React, no audio
│   └── ai/            ← Prompt templates and agent configs — no React
├── stores/            ← Zustand stores — no direct Tone.js calls
├── hooks/             ← React hooks that bridge stores ↔ audio engine
├── types/             ← Canonical types — single source of truth
└── public/samples/    ← Optional WAV files — do not commit large assets
```

**Never** edit files in `components/ui/` — these are managed by the shadcn CLI.  
**Never** import from `lib/audio/` inside a Zustand store — stores are audio-agnostic.  
**Never** call `Tone.js` APIs inside React components directly — use hooks from `hooks/`.  
**Never** put API keys, Claude calls, or fetch to `api.anthropic.com` in client components.

---

## 3. DEV COMMANDS

Run these from the project root. Know the output of each before you write any code.

```bash
# Start dev server (hot reload)
pnpm dev

# Production build (must pass before handoff)
pnpm build

# Type-check only (no emit — run after every major module)
pnpm tsc --noEmit

# Lint
pnpm lint

# Format (if prettier is configured)
pnpm format

# Test an API route manually
curl -X POST http://localhost:3000/api/agents/pattern \
  -H "Content-Type: application/json" \
  -d '{"prompt":"dark drop","bpm":140,"bars":4,"existingTracks":[]}'
```

**Rule**: Run `pnpm tsc --noEmit` after completing each of these milestones:
- `types/index.ts`
- All `lib/audio/` files
- All `stores/` files
- All `app/api/` routes
- All `components/` files

Do not accumulate type errors. Fix them before moving to the next module.

---

## 4. CODING CONVENTIONS

### TypeScript
- Strict mode is non-negotiable (`"strict": true` in `tsconfig.json`)
- Zero `any` — use `unknown` + type guards if the shape is uncertain
- All function parameters and return types must be explicitly typed
- Use type imports: `import type { Loop } from '@/types'`
- Prefer `interface` for object shapes that will be extended; `type` for unions and aliases

### Naming
- Components: `PascalCase` (e.g., `StepSequencer.tsx`)
- Hooks: `camelCase` prefixed with `use` (e.g., `useAudioEngine.ts`)
- Stores: `camelCase` suffixed with `Store` (e.g., `audioStore.ts`)
- Audio classes: `PascalCase` (e.g., `WobbleBass.ts`)
- Constants: `SCREAMING_SNAKE_CASE`
- CSS variables: `--riddim-[category]-[property]` (e.g., `--riddim-color-accent`)

### File structure
- One React component per file
- One Zustand store per file
- No barrel `index.ts` files except in `types/`
- Keep files under 300 lines — split if longer

### Import order (enforced by ESLint)
1. React
2. Next.js
3. Third-party libraries
4. Internal `@/lib/*`
5. Internal `@/stores/*`
6. Internal `@/hooks/*`
7. Internal `@/types`
8. Relative imports
9. Style imports

### Comments
- JSDoc all exported functions, classes, and types
- Inline comments only for non-obvious logic — not narration
- All Tone.js AudioContext guards must have a comment: `// SSR guard — Tone.js requires browser`

---

## 5. AUDIO ENGINE RULES

These rules exist because Tone.js has sharp edges in a Next.js SSR environment. Violating them causes silent failures that are hard to debug.

### SSR Guards
Every file that imports from `tone` must begin with an SSR check at the module level or within functions:

```typescript
// Correct — guard at function/method level
export function createSynth() {
  if (typeof window === 'undefined') return null; // SSR guard — Tone.js requires browser
  return new Tone.MonoSynth();
}
```

Any component that uses audio must be either:
- A `'use client'` component with audio calls inside `useEffect`
- Or loaded via `dynamic(() => import('./Component'), { ssr: false })`

### AudioContext Activation
`Tone.start()` must be called inside a user gesture handler (click, keydown). Never call it at module load or in `useEffect` without a gesture trigger. The `useAudioEngine` hook handles this — do not duplicate the logic.

### Sequence Mutation
When a step changes during playback, **mutate the per-slot cell's `step` fields in place via `AudioEngine.updateStep`** — do not reassign `sequence.events[i]` and do not recreate the sequence. In Tone.js 15 the `Sequence.events` array is a `Proxy` whose indexed setter calls `_eventsUpdated()`, which clears and reschedules the entire `Part` — that causes audible glitches and timing drift.

```typescript
// Correct — mutate the existing cell.step in place (see lib/audio/sequencerStepSync.ts)
copyStepAudioFields(cell.step, nextStep);

// Wrong — triggers Tone.js Sequence reschedule via Proxy setter
sequence.events[stepIndex] = updatedStep;

// Wrong — disposing/recreating restarts the whole sequence
sequence.dispose();
sequence = new Tone.Sequence(...);
```

### Tone.js Timing
All scheduled audio events must use Tone.js time notation (e.g., `"16n"`, `"4n"`, `"+0.1"`) — never raw `Date.now()` or `setTimeout`. Tone.js has its own clock that stays in sync with the audio context.

### Cleanup
Every audio class (`WobbleBass`, `DrumKit`, etc.) must implement a `dispose()` method that calls `.dispose()` on all Tone.js nodes. Call `dispose()` in `useEffect` cleanup functions.

### Playback Hot-Path React Rules
The audio thread is single-threaded with React reconciliation. Anything that re-renders a large subtree on every transport tick will starve `Tone.Transport`'s lookahead scheduler and produce audible glitches.

- **Never subscribe to `useAudioStore.currentStep` directly via the React selector** in any component that lives above a button-grid or large list. Use `useCurrentStepRaf()` (`hooks/useCurrentStepRaf.ts`) which coalesces store updates to `requestAnimationFrame` cadence.
- **Never prop-drill `currentStep` from a parent into pattern-editor components.** Subscribe inside the leaf so transport ticks do not invalidate the parent tree.
- **Memoize per-track row and per-cell components** in any grid that consumes the playhead. The combination of `React.memo` + a stable `currentStep` value means only the cells whose `isCurrent` flipped actually reconcile.
- **`useAudioEngine` only schedules a materialization microtask when something structural changed** (`tracks` ref / `arrangement` ref / bar boundary). A bare `currentStep` mutation must not trigger a flush. Tests in `tests/studio/playbackHotPath.test.ts` enforce these rules.
- Mirror the `useArrangementStepOnRaf` + `<ArrangementGridPlayhead memo>` pattern in `components/studio/ArrangementGrid.tsx` for any new transport-driven UI.

---

## 6. STATE MANAGEMENT RULES

### Store Boundaries
Each store owns a specific domain. Do not reach across store boundaries directly.

| Store | Owns | Does NOT own |
|---|---|---|
| `audioStore` | Tracks, steps, BPM, playing state | Tone.js nodes, saved loops |
| `loopStore` | Saved loops, localStorage persistence | Active playback state |
| `aiStore` | AI generation state, results | Applying results to tracks |
| `uiStore` | Panel visibility, selection | Data or audio |

### Cross-Store Communication
Stores communicate via **hooks**, not by importing each other.

```typescript
// Correct — in a hook
const applyPattern = () => {
  const result = useAIStore.getState().lastResult;
  useAudioStore.getState().injectPattern(result);
};

// Wrong — store importing store
import { useAIStore } from './aiStore'; // Never inside another store file
```

### Persistence
Only `loopStore` uses `zustand/middleware` `persist`. All other stores are ephemeral (reset on page reload). This is intentional — audio state should not survive a page reload because Tone.js context is rebuilt fresh.

---

## 7. AI CALL RULES

- **All Claude API calls are server-side only** — in `app/api/agents/[agentId]/route.ts`
- **All system prompts live in `lib/ai/prompts.ts`** — do not inline prompts in route files
- **All inputs must be validated with Zod** before being sent to Claude
- **Always strip markdown fences** before `JSON.parse` — Claude occasionally wraps JSON in \`\`\`json blocks
- **Always handle parse failure** — return `{ error: string }` with status 500, never throw unhandled

```typescript
// Standard AI response parsing pattern
const text = data.content?.[0]?.text ?? '';
const clean = text.replace(/^```json\s*/m, '').replace(/```\s*$/m, '').trim();
try {
  return Response.json(JSON.parse(clean));
} catch {
  return Response.json({ error: 'Agent returned invalid JSON', raw: text }, { status: 500 });
}
```

- **Context sent to agents must be minimal** — strip fields the agent doesn't need (e.g., don't send full `SynthConfig` to `PatternAgent`)
- **Never log the full Claude response** in production — it may contain user prompt data

---

## 8. COMPONENT RULES

- All studio components are `'use client'` — they interact with audio and stores
- Do not use `<form>` tags — use `onClick` / `onChange` handlers directly
- The `<Knob>` component must handle mouse drag via `onMouseDown` → `document.onMouseMove` → `document.onMouseUp` pattern. Never use `<input type="range">` for synth parameters (it doesn't match the visual design)
- Step cells in `StepSequencer` must be rendered as `<button>` elements for accessibility
- `MidiImporter` uses native HTML drag events (`onDragOver`, `onDrop`) — not `@dnd-kit` (which is for reordering, not file drop)
- All async operations (AI calls, MIDI parse) must show a loading state in the UI

---

## 9. TESTING STRATEGY

No testing framework is configured in Phase 1. Instead, use this manual validation protocol after each module:

### Audio Validation
1. `pnpm dev` → open studio in browser
2. Click play — BPM should match display
3. Toggle steps — audio should reflect changes in real-time
4. Stop and restart — sequence should reset cleanly

### AI Validation
```bash
curl -X POST http://localhost:3000/api/agents/pattern \
  -H "Content-Type: application/json" \
  -d '{"prompt":"heavy drop","bpm":140,"bars":4,"existingTracks":[]}'
```
Response must be valid `AIPatternResult` JSON with `tracks` array. Verify with:
```bash
curl ... | python3 -m json.tool
```

### MIDI Validation
- Drop a known `.mid` file (e.g., any royalty-free MIDI drum loop)
- Confirm `Track[]` created in store matches expected step density
- Confirm BPM extracted from MIDI matches the file's tempo

### Build Validation
`pnpm build` must pass with zero errors and zero type errors. This is the final gate before any phase handoff.

---

## 10. WHEN TO HALT AND ASK

Stop and report to Hartley when:

- A spec in HANDOFF.md is ambiguous and two reasonable interpretations lead to different architectures
- A required npm package is not installable (version conflict, deprecation, breaking API change)
- `pnpm tsc --noEmit` produces more than 5 errors after a module implementation — something is structurally wrong
- The Tone.js API has changed since this document was written and the skeleton code in HANDOFF.md no longer compiles
- An API route returns an unexpected response shape from Claude that doesn't match the defined output schema, and the pattern is consistent (not a one-off)
- Adding a feature would require a new top-level dependency not listed in HANDOFF.md section 18.2

Do **not** halt for:
- Minor styling decisions not specified in HANDOFF.md (make a reasonable choice and note it)
- JSDoc wording
- Choosing between two equivalent Tone.js patterns that produce the same audio result
- Resolving a single type error that has an obvious fix

---

## 11. RUNTIME AGENT INTEGRATION NOTES

The application sub-agents (defined in HANDOFF.md §20) are invoked by the frontend via fetch to `app/api/agents/[agentId]/route.ts`. When implementing their UI surfaces:

- `PatternAgent` → `AIPanel` component — show spinner during generation, particle burst on success
- `ChordAgent` → sub-panel within `AIPanel` — chord chips are clickable and inject into sequencer
- `ModulationAgent` → fires on `Tone.Transport.scheduleRepeat` — result applied via `rampTo` (200ms), never instant set
- `ArrangerAgent` → Phase 2 only — do not build UI in Phase 1, stub the route only
- `MixCoachAgent` → `Mixer` component — "Coach" button opens shadcn `<Dialog>` with suggestions list

Each agent call must be wrapped in a try/catch. Failures must surface as shadcn `<Toast>` notifications — never as uncaught promise rejections.

---

## 12. ENVIRONMENT & SECRETS

```bash
# Required in .env.local (never commit this file)
ANTHROPIC_API_KEY=sk-ant-...

# .env.local is already in .gitignore from create-next-app — verify before first commit
cat .gitignore | grep .env
```

Never access `process.env.ANTHROPIC_API_KEY` in a client component or any file under `components/` or `stores/`. It will be `undefined` at runtime and expose your intent to leak the key.

---

## 13. GIT WORKFLOW

- Commit after each sub-agent completes its module (see HANDOFF.md §19)
- Commit message format: `[agent] short description` (e.g., `[AudioAgent] implement WobbleBass and DrumKit`)
- Never commit with type errors — run `pnpm tsc --noEmit` before every commit
- Never commit `.env.local`, `node_modules/`, or `.next/`
- Branch names: `feat/[module]` (e.g., `feat/audio-engine`, `feat/step-sequencer`)

---

*AGENTS.md version: 1.0 — RIDDIM MVP. Owner: Hartley / JLDTS LLC.*
