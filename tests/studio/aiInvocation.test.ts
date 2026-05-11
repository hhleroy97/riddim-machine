import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();

test("studio does not mount transport-scheduled AI requests", async () => {
  const studioApp = await readFile(
    path.join(repoRoot, "components/studio/StudioApp.tsx"),
    "utf8",
  );

  assert.equal(studioApp.includes("useModulationScheduler"), false);
  assert.equal(studioApp.includes("requestModulation"), false);
});

test("AI workflow calls remain behind explicit workflow functions", async () => {
  const workflow = await readFile(path.join(repoRoot, "hooks/useAIWorkflow.ts"), "utf8");

  assert.match(workflow, /const generatePattern = useCallback/);
  assert.match(workflow, /const generateChords = useCallback/);
  assert.match(workflow, /const requestMixCoach = useCallback/);
  assert.equal(workflow.includes("scheduleRepeat"), false);
  assert.equal(workflow.includes("setInterval"), false);
});
