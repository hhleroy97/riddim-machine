import type { CriticResult } from "@/types";

type CriticResponse = {
  critic: CriticResult;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeScore(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  const normalized = value > 1 ? value / 10 : value;
  return Math.max(0, Math.min(1, normalized));
}

/**
 * Normalize critic scores onto the canonical 0..1 scale.
 */
export function repairCriticPayload(payload: unknown): unknown {
  if (!isRecord(payload)) {
    return payload;
  }

  const source = isRecord(payload.critic) ? payload.critic : payload;
  const repaired: CriticResponse = {
    critic: {
      pass: typeof source.pass === "boolean" ? source.pass : normalizeScore(source.score) >= 0.7,
      score: normalizeScore(source.score),
      reasons: Array.isArray(source.reasons)
        ? source.reasons.filter((reason): reason is string => typeof reason === "string" && reason.length > 0)
        : ["Critic returned no reasons"],
    },
  };

  return repaired;
}
