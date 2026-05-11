# RIDDIM

RIDDIM is a browser-based AI-powered dubstep loop creation studio built with Next.js, Tone.js, Zustand, and server-side Claude agent routes.

## Local Development

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000/studio](http://localhost:3000/studio).

## Required Environment

Create `.env.local`:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

Without an API key, the agent routes return deterministic fallback payloads for local workflow testing.

## Scripts

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Architecture

- App routes: `app/studio`, `app/api/agents/[agentId]/route.ts`
- Audio engine: `lib/audio`
- MIDI parsing: `lib/midi`
- AI prompts/schemas/helpers: `lib/ai`
- Stores: `stores`
- Store-to-audio orchestration hooks: `hooks`
- Canonical types: `types/index.ts`

More detail: `docs/ARCHITECTURE.md`.

## Validation Checklist

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm test`
4. `pnpm build`
5. Manual runtime checks in browser:
   - Play/stop transport
   - Toggle steps while playing
   - MIDI drag/drop import
   - Pattern/chord/mix coach AI actions
# riddim-machine
