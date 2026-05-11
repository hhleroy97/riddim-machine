import type { MotifPlan, PhraseEvent } from "@/types";

type MotifResponse = {
  motifPlan: MotifPlan;
};

type MotifRole = "bass" | "lead" | "chords";

const BASS_CONTOURS: Array<MotifPlan["bass"]["contour"]> = ["falling", "rising", "static", "leap-return"];
const VARIATION_STRATEGIES: Array<MotifPlan["bass"]["variationStrategy"]> = [
  "sequence",
  "inversion",
  "fragment",
  "answer",
];
const LEAD_RELATIONSHIPS: Array<MotifPlan["lead"]["relationship"]> = [
  "answer-bass",
  "double-bass",
  "counter-rhythm",
  "sparse-hook",
];
const CHORD_VOICINGS: Array<MotifPlan["chords"]["voicing"]> = [
  "stabs",
  "sustained",
  "offbeat",
  "atmospheric",
];
const ARTICULATIONS: Array<PhraseEvent["articulation"]> = [
  "stab",
  "sustain",
  "growl",
  "silence",
  "fill",
  "answer",
];

const ROLE_DEFAULTS: Record<MotifRole, { degree: string; octave: number; velocity: number }> = {
  bass: { degree: "1", octave: 1, velocity: 0.9 },
  lead: { degree: "5", octave: 4, velocity: 0.6 },
  chords: { degree: "1", octave: 3, velocity: 0.55 },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasCanonicalMotifPlan(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  return isRecord(value.bass) && isRecord(value.lead) && isRecord(value.chords) && isRecord(value.drums);
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, value));
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  return Math.round(clampNumber(value, min, max, fallback));
}

function sanitizeStepArray(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((step) => clampInteger(step, 0, 63, 0));
}

function sanitizePhraseEvents(value: unknown, role: MotifRole): PhraseEvent[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const fallback = ROLE_DEFAULTS[role];
  return value.filter(isRecord).map((event, index) => ({
    step: clampInteger(event.step, 0, 63, index * 4),
    degree: typeof event.degree === "string" && event.degree.length > 0 ? event.degree : fallback.degree,
    octave: clampInteger(event.octave, 1, 7, fallback.octave),
    length: clampNumber(event.length, 0.25, 8, 1),
    velocity: clampNumber(event.velocity, 0, 1, fallback.velocity),
    articulation:
      typeof event.articulation === "string" &&
      ARTICULATIONS.includes(event.articulation as PhraseEvent["articulation"])
        ? (event.articulation as PhraseEvent["articulation"])
        : articulationForRole(role, ""),
  }));
}

function normalizeCanonicalMotifPlan(motifPlan: Record<string, unknown>): MotifResponse {
  const bass = isRecord(motifPlan.bass) ? motifPlan.bass : {};
  const lead = isRecord(motifPlan.lead) ? motifPlan.lead : {};
  const chords = isRecord(motifPlan.chords) ? motifPlan.chords : {};
  const drums = isRecord(motifPlan.drums) ? motifPlan.drums : {};
  const bassEvents = sanitizePhraseEvents(bass.events, "bass");

  return {
    motifPlan: {
      bass: {
        contour:
          typeof bass.contour === "string" && BASS_CONTOURS.includes(bass.contour as MotifPlan["bass"]["contour"])
            ? (bass.contour as MotifPlan["bass"]["contour"])
            : "leap-return",
        variationStrategy:
          typeof bass.variationStrategy === "string" &&
          VARIATION_STRATEGIES.includes(bass.variationStrategy as MotifPlan["bass"]["variationStrategy"])
            ? (bass.variationStrategy as MotifPlan["bass"]["variationStrategy"])
            : "answer",
        density: clampNumber(bass.density, 0, 1, 0.35),
        events: bassEvents.length > 0 ? bassEvents : phraseEvents({}, "bass"),
      },
      lead: {
        relationship:
          typeof lead.relationship === "string" &&
          LEAD_RELATIONSHIPS.includes(lead.relationship as MotifPlan["lead"]["relationship"])
            ? (lead.relationship as MotifPlan["lead"]["relationship"])
            : "answer-bass",
        density: clampNumber(lead.density, 0, 1, 0.25),
        events: sanitizePhraseEvents(lead.events, "lead"),
      },
      chords: {
        voicing:
          typeof chords.voicing === "string" && CHORD_VOICINGS.includes(chords.voicing as MotifPlan["chords"]["voicing"])
            ? (chords.voicing as MotifPlan["chords"]["voicing"])
            : "stabs",
        density: clampNumber(chords.density, 0, 1, 0.25),
        events: sanitizePhraseEvents(chords.events, "chords"),
      },
      drums: {
        kickSteps: sanitizeStepArray(drums.kickSteps),
        snareSteps: sanitizeStepArray(drums.snareSteps),
        hatSteps: sanitizeStepArray(drums.hatSteps),
        swing: clampNumber(drums.swing, 0, 0.4, 0.08),
      },
    },
  };
}

function sectionSource(motifPlan: Record<string, unknown>): Record<string, unknown> {
  const preferred = ["drop", "build", "intro", "break"];
  for (const key of preferred) {
    if (isRecord(motifPlan[key])) {
      return motifPlan[key];
    }
  }

  const firstSection = Object.values(motifPlan).find(isRecord);
  return firstSection ?? {};
}

function roleText(section: Record<string, unknown>, role: MotifRole | "drums"): string {
  const source = isRecord(section[role]) ? section[role] : {};
  return `${String(source.pattern ?? "")} ${String(source.style ?? "")} ${String(source.notes ?? "")}`.toLowerCase();
}

function densityFromText(text: string, fallback: number): number {
  if (text.includes("minimal") || text.includes("sparse")) {
    return Math.min(fallback, 0.25);
  }
  if (text.includes("heavy") || text.includes("full") || text.includes("active")) {
    return Math.max(fallback, 0.45);
  }
  return fallback;
}

function articulationForRole(role: MotifRole, text: string): PhraseEvent["articulation"] {
  if (role === "bass") {
    return text.includes("sustain") || text.includes("half") ? "sustain" : "growl";
  }
  if (role === "lead") {
    return "answer";
  }
  return text.includes("pad") || text.includes("sustain") ? "sustain" : "stab";
}

function octaveForRole(section: Record<string, unknown>, role: MotifRole): number {
  const source = isRecord(section[role]) ? section[role] : {};
  const fallback = ROLE_DEFAULTS[role].octave;
  return typeof source.octave === "number" && Number.isFinite(source.octave)
    ? Math.max(1, Math.min(7, Math.round(source.octave)))
    : fallback;
}

function phraseEvents(section: Record<string, unknown>, role: MotifRole): PhraseEvent[] {
  const text = roleText(section, role);
  const defaults = ROLE_DEFAULTS[role];
  const octave = octaveForRole(section, role);
  const articulation = articulationForRole(role, text);

  if (role === "bass") {
    return [
      { step: 0, degree: defaults.degree, octave, length: 1, velocity: defaults.velocity, articulation },
      { step: 7, degree: "b2", octave, length: 0.5, velocity: 0.72, articulation: "answer" },
      { step: 16, degree: "b7", octave, length: 1, velocity: 0.78, articulation },
      { step: 26, degree: "1", octave, length: 0.75, velocity: 0.84, articulation: "growl" },
    ];
  }

  if (role === "lead") {
    return [
      { step: 14, degree: "5", octave, length: 0.5, velocity: defaults.velocity, articulation },
      { step: 22, degree: "b6", octave, length: 0.5, velocity: 0.52, articulation },
      { step: 38, degree: "b3", octave, length: 0.75, velocity: 0.58, articulation },
    ];
  }

  return [
    { step: 12, degree: defaults.degree, octave, length: 0.5, velocity: defaults.velocity, articulation },
    { step: 30, degree: "b2", octave, length: 0.5, velocity: 0.5, articulation },
    { step: 44, degree: "b7", octave, length: 0.5, velocity: 0.52, articulation },
  ];
}

function drumSteps(section: Record<string, unknown>): MotifPlan["drums"] {
  const text = roleText(section, "drums");
  const hasHats = text.includes("hat") || text.includes("sixteenth") || text.includes("eighth");
  const busySnare = text.includes("2.5") || text.includes("4.5") || text.includes("ghost");

  return {
    kickSteps: text.includes("3") ? [0, 8, 32, 40] : [0, 32],
    snareSteps: busySnare ? [4, 12, 20, 36, 44, 52] : [8, 24, 40, 56],
    hatSteps: hasHats ? [2, 6, 10, 14, 18, 22, 26, 30] : [6, 14, 22, 30],
    swing: text.includes("riddim") || text.includes("heavy") ? 0.08 : 0.04,
  };
}

/**
 * Normalize section-scoped prose motif output into the canonical renderer contract.
 */
export function repairMotifPayload(payload: unknown): unknown {
  if (!isRecord(payload)) {
    return payload;
  }

  const motifPlan = isRecord(payload.motifPlan) ? payload.motifPlan : payload;
  if (hasCanonicalMotifPlan(motifPlan)) {
    return normalizeCanonicalMotifPlan(motifPlan);
  }

  const section = sectionSource(motifPlan);
  const bassText = roleText(section, "bass");
  const leadText = roleText(section, "lead");
  const chordText = roleText(section, "chords");
  const repaired: MotifResponse = {
    motifPlan: {
      bass: {
        contour: bassText.includes("fall") ? "falling" : "leap-return",
        variationStrategy: "answer",
        density: densityFromText(bassText, 0.4),
        events: phraseEvents(section, "bass"),
      },
      lead: {
        relationship: leadText.includes("double") ? "double-bass" : "answer-bass",
        density: densityFromText(leadText, 0.28),
        events: phraseEvents(section, "lead"),
      },
      chords: {
        voicing: chordText.includes("pad") || chordText.includes("sustain") ? "sustained" : "stabs",
        density: densityFromText(chordText, 0.24),
        events: phraseEvents(section, "chords"),
      },
      drums: drumSteps(section),
    },
  };

  return repaired;
}
