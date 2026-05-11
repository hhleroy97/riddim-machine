/**
 * Removes markdown code fences from model output.
 */
export function stripJsonMarkdown(raw: string): string {
  return raw.replace(/^```json\s*/m, "").replace(/```\s*$/m, "").trim();
}

/**
 * Fixes a recurring Claude glitch: `"reasons": [ … ]\n ]\n}` (extra `]` instead of closing `}`)
 * leaving the outer object malformed so brace-only extraction yields null.
 */
function repairNestedObjectClosedWithBracket(text: string): string {
  return text.replace(/\]\s*\n(\s+)\]\s*\r?\n\}\s*$/m, (_match, indent: string) => {
    return `]\n${indent}}\n}`;
  });
}

function extractBalancedJsonObject(raw: string): string | null {
  const text = stripJsonMarkdown(raw);
  const start = text.indexOf("{");
  if (start < 0) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaping) {
        escaping = false;
        continue;
      }
      if (char === "\\") {
        escaping = true;
        continue;
      }
      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  return null;
}

/**
 * Parses model JSON output with markdown-fence tolerance.
 */
export function parseAgentJson<T>(raw: string): T {
  const stripped = stripJsonMarkdown(raw);
  const healed = repairNestedObjectClosedWithBracket(stripped);

  try {
    return JSON.parse(healed) as T;
  } catch {
    const extracted = extractBalancedJsonObject(healed);
    if (!extracted) {
      throw new Error("No JSON object found in model response.");
    }
    const nestedHealed = repairNestedObjectClosedWithBracket(extracted);
    try {
      return JSON.parse(nestedHealed) as T;
    } catch {
      throw new Error("No JSON object found in model response.");
    }
  }
}
