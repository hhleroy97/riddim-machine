import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

/**
 * Guards the playback hot path: components rendered while transport is running
 * must NOT subscribe to `currentStep` directly via the React selector — every
 * 16th-note tick would reconcile the entire subtree and starve Tone.js's
 * lookahead scheduler. Use {@link useCurrentStepRaf} instead.
 */

const repoRoot = process.cwd();

async function readFromRepo(relative: string): Promise<string> {
  return readFile(path.join(repoRoot, relative), "utf8");
}

test("PatternWorkspace does not subscribe to currentStep (transport-tick render storm)", async () => {
  const source = await readFromRepo("components/studio/PatternWorkspace.tsx");
  assert.equal(
    source.includes("state.currentStep"),
    false,
    "PatternWorkspace must not bind currentStep at the React tree root — re-renders the entire pattern editor every 16th note",
  );
  assert.equal(
    source.includes("currentStep={"),
    false,
    "PatternWorkspace must not prop-drill currentStep into StepSequencer/ScaleNoteGrid",
  );
});

test("StepSequencer subscribes via rAF-throttled hook, not direct selector", async () => {
  const source = await readFromRepo("components/studio/StepSequencer.tsx");
  assert.match(
    source,
    /useCurrentStepRaf\(\)/,
    "StepSequencer must consume the playhead via useCurrentStepRaf for rAF coalescing",
  );
  assert.equal(
    source.includes("state.currentStep"),
    false,
    "StepSequencer must not subscribe to currentStep directly",
  );
});

test("ScaleNoteGrid subscribes via rAF-throttled hook, not direct selector", async () => {
  const source = await readFromRepo("components/studio/ScaleNoteGrid.tsx");
  assert.match(source, /useCurrentStepRaf\(\)/);
  assert.equal(source.includes("state.currentStep"), false);
});

test("StepSequencer and ScaleNoteGrid memoize per-track rows for cell-level diffing", async () => {
  const stepSequencer = await readFromRepo("components/studio/StepSequencer.tsx");
  const scaleGrid = await readFromRepo("components/studio/ScaleNoteGrid.tsx");
  assert.match(
    stepSequencer,
    /memo\(function StepRow/,
    "StepSequencer must wrap rows in React.memo so playhead ticks only diff changed cells",
  );
  assert.match(
    stepSequencer,
    /memo\(function StepCell/,
    "StepSequencer must wrap cells in React.memo to bail out unchanged steps on a tick",
  );
  assert.match(
    scaleGrid,
    /memo\(function ScaleTrackSection/,
    "ScaleNoteGrid must wrap track sections in React.memo",
  );
  assert.match(
    scaleGrid,
    /memo\(function ScaleNoteCell/,
    "ScaleNoteGrid must wrap cells in React.memo",
  );
});

test("useCurrentStepRaf coalesces store updates via requestAnimationFrame", async () => {
  const source = await readFromRepo("hooks/useCurrentStepRaf.ts");
  assert.match(source, /requestAnimationFrame/);
  assert.match(source, /useAudioStore\.subscribe/);
  assert.match(source, /cancelAnimationFrame/);
});

test("useAudioEngine does not schedule a playback flush on bare currentStep ticks", async () => {
  const source = await readFromRepo("hooks/useAudioEngine.ts");
  // The materialization microtask must be gated on a structural change (tracks ref / arrangement /
  // bar boundary) — never unconditionally on every audio store mutation.
  const unconditionalCall = /onAudioMutation = \(\)[\s\S]*?schedulePlaybackFlush\(\);\s*\n\s*\};/m;
  const match = source.match(unconditionalCall);
  if (match) {
    const body = match[0];
    assert.match(
      body,
      /audio\.tracks !== prevTracksRef/,
      "Per-tick flush scheduling must be gated on tracks ref change",
    );
  }
});
