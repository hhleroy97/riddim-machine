import assert from "node:assert/strict";
import test from "node:test";

import { parseAgentJson, stripJsonMarkdown } from "../../lib/ai/parseAgentJson";

test("stripJsonMarkdown removes markdown fences", () => {
  const raw = "```json\n{\"ok\":true}\n```";
  const clean = stripJsonMarkdown(raw);
  assert.equal(clean, "{\"ok\":true}");
});

test("parseAgentJson parses fenced JSON payloads", () => {
  const parsed = parseAgentJson<{ value: number }>("```json\n{\"value\":42}\n```");
  assert.equal(parsed.value, 42);
});

test("parseAgentJson heals critic bracket-before-brace hallucination", () => {
  const malformed = `{
  "critic": {
    "pass": true,
    "score": 0.85,
    "reasons": [
      "half-time riddim groove"
    ]
  ]
}`;
  const parsed = parseAgentJson<{ critic: { pass: boolean; score: number } }>(malformed);
  assert.equal(parsed.critic.pass, true);
  assert.equal(parsed.critic.score, 0.85);
});

test("parseAgentJson rejects truncated model output (no closing brace)", () => {
  const truncated = '```json\n{"tracks":[{"id":"a","steps":[{"active":true,"note":"C1","velocity":127},\n        ';
  assert.throws(
    () => {
      parseAgentJson<unknown>(truncated);
    },
    /No JSON object found/,
  );
});
