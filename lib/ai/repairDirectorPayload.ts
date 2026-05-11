import type { ArrangementIntent, CompositionPlan, HarmonicPlan, RiddimStyleProfile } from "@/types";

type DirectorResponse = Pick<
  CompositionPlan,
  "title" | "styleProfile" | "mood" | "harmonicPlan" | "arrangementIntent"
>;

const STYLE_PROFILES: RiddimStyleProfile[] = [
  "deep-minimal",
  "wonky-riddim",
  "modern-festival",
  "dark-underground",
  "tearout-adjacent",
];

const SCALE_DEGREES: HarmonicPlan["scaleDegrees"] = [
  "1",
  "b2",
  "2",
  "b3",
  "3",
  "4",
  "b5",
  "5",
  "b6",
  "6",
  "b7",
  "7",
];

const MODE_DEGREES: Record<HarmonicPlan["mode"], HarmonicPlan["scaleDegrees"]> = {
  minor: ["1", "2", "b3", "4", "5", "b6", "b7"],
  phrygian: ["1", "b2", "b3", "4", "5", "b6", "b7"],
  dorian: ["1", "2", "b3", "4", "5", "6", "b7"],
  "harmonic-minor": ["1", "2", "b3", "4", "5", "b6", "7"],
};

const PROGRESSION_DEGREES: Array<HarmonicPlan["progression"][number]["degree"]> = [
  "i",
  "bII",
  "bIII",
  "iv",
  "v",
  "bV",
  "bVI",
  "bVII",
];

const SECTION_ROLES: Array<ArrangementIntent["sections"][number]["role"]> = [
  "intro",
  "build",
  "drop",
  "break",
  "outro",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, value));
}

function normalizeStyleProfile(value: unknown, mood: unknown): RiddimStyleProfile {
  if (typeof value === "string" && STYLE_PROFILES.includes(value as RiddimStyleProfile)) {
    return value as RiddimStyleProfile;
  }

  const text = `${typeof value === "string" ? value : ""} ${typeof mood === "string" ? mood : ""}`.toLowerCase();
  if (text.includes("tearout") || text.includes("aggressive")) {
    return "tearout-adjacent";
  }
  if (text.includes("festival") || text.includes("modern")) {
    return "modern-festival";
  }
  if (text.includes("wonky")) {
    return "wonky-riddim";
  }
  if (text.includes("minimal") || text.includes("deep")) {
    return "deep-minimal";
  }
  return "dark-underground";
}

function normalizeMode(value: unknown): HarmonicPlan["mode"] {
  return value === "minor" || value === "phrygian" || value === "dorian" || value === "harmonic-minor"
    ? value
    : "phrygian";
}

function normalizeScaleDegrees(value: unknown, mode: HarmonicPlan["mode"]): HarmonicPlan["scaleDegrees"] {
  if (!Array.isArray(value)) {
    return MODE_DEGREES[mode];
  }

  const normalized = value.filter(
    (degree): degree is HarmonicPlan["scaleDegrees"][number] =>
      typeof degree === "string" && SCALE_DEGREES.includes(degree as HarmonicPlan["scaleDegrees"][number]),
  );
  return normalized.length >= 5 ? normalized : MODE_DEGREES[mode];
}

function normalizeProgressionDegree(value: unknown): HarmonicPlan["progression"][number]["degree"] {
  if (typeof value === "string" && PROGRESSION_DEGREES.includes(value as HarmonicPlan["progression"][number]["degree"])) {
    return value as HarmonicPlan["progression"][number]["degree"];
  }
  return "i";
}

function inferChordFunction(
  degree: HarmonicPlan["progression"][number]["degree"],
): HarmonicPlan["progression"][number]["function"] {
  if (degree === "i") {
    return "tonic";
  }
  if (degree === "v" || degree === "bV") {
    return "dominant";
  }
  if (degree === "bII" || degree === "bIII") {
    return "tension";
  }
  if (degree === "bVII") {
    return "release";
  }
  return "predominant";
}

function parseFunctionalProgression(value: unknown): Array<HarmonicPlan["progression"][number]["degree"]> {
  if (typeof value !== "string") {
    return [];
  }
  return value
    .split(/\s*-\s*|\s+/)
    .map((token) => token.trim())
    .filter((token): token is HarmonicPlan["progression"][number]["degree"] =>
      PROGRESSION_DEGREES.includes(token as HarmonicPlan["progression"][number]["degree"]),
    );
}

function normalizeProgression(source: Record<string, unknown>, key: string): HarmonicPlan["progression"] {
  if (Array.isArray(source.progression)) {
    const progression = source.progression
      .filter(isRecord)
      .map((item) => {
        const degree = normalizeProgressionDegree(item.degree);
        return {
          degree,
          chord: typeof item.chord === "string" && item.chord.length > 0 ? item.chord : key,
          function:
            item.function === "tonic" ||
            item.function === "predominant" ||
            item.function === "dominant" ||
            item.function === "tension" ||
            item.function === "release"
              ? item.function
              : inferChordFunction(degree),
          bars: Math.round(clampNumber(item.bars, 1, 16, 4)),
        };
      });
    if (progression.length > 0) {
      return progression;
    }
  }

  const degrees = parseFunctionalProgression(source.functionalProgression);
  const chords = Array.isArray(source.chordProgression)
    ? source.chordProgression.filter((chord): chord is string => typeof chord === "string" && chord.length > 0)
    : [];
  const fallbackDegrees: Array<HarmonicPlan["progression"][number]["degree"]> = ["i", "bII", "bVII", "i"];
  const resolvedDegrees = degrees.length > 0 ? degrees : fallbackDegrees;

  return resolvedDegrees.map((degree, index) => ({
    degree,
    chord: chords[index] ?? chords[0] ?? key,
    function: inferChordFunction(degree),
    bars: 4,
  }));
}

function normalizeHarmonicPlan(value: unknown): HarmonicPlan {
  const source = isRecord(value) ? value : {};
  const mode = normalizeMode(source.mode);
  const key = typeof source.key === "string" && source.key.length > 0
    ? source.key.replace(/\s+(minor|major)$/i, "").slice(0, 8)
    : "F";

  return {
    key,
    mode,
    scaleDegrees: normalizeScaleDegrees(source.scaleDegrees ?? source.scalePattern, mode),
    progression: normalizeProgression(source, key),
  };
}

function normalizeSectionRole(value: unknown): ArrangementIntent["sections"][number]["role"] {
  if (typeof value === "string" && SECTION_ROLES.includes(value as ArrangementIntent["sections"][number]["role"])) {
    return value as ArrangementIntent["sections"][number]["role"];
  }
  if (typeof value === "string" && value.toLowerCase().includes("build")) {
    return "build";
  }
  if (typeof value === "string" && value.toLowerCase().includes("break")) {
    return "break";
  }
  return "drop";
}

function normalizeArrangementIntent(value: unknown): ArrangementIntent {
  const source = isRecord(value) ? value : {};
  const rawSections = Array.isArray(source.sections) ? source.sections.filter(isRecord) : [];
  const sections = rawSections.length > 0 ? rawSections : [{ name: "Drop", role: "drop", bars: 8, energy: 0.9 }];

  return {
    sections: sections.map((section, index) => {
      const name = typeof section.name === "string" && section.name.length > 0
        ? section.name
        : `Section ${index + 1}`;
      const role = normalizeSectionRole(section.role ?? section.name);
      return {
        id: typeof section.id === "string" && section.id.length > 0
          ? section.id
          : name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `section-${index + 1}`,
        name,
        role,
        bars: Math.round(clampNumber(section.bars, 4, 16, role === "drop" ? 16 : 8)),
        energy: clampNumber(section.energy, 0, 1, role === "drop" ? 0.9 : 0.45 + index * 0.15),
      };
    }),
  };
}

/**
 * Normalize common RiddimDirector model drift into the canonical contract before validation.
 */
export function repairDirectorPayload(payload: unknown): unknown {
  if (!isRecord(payload)) {
    return payload;
  }

  const title = typeof payload.title === "string" && payload.title.length > 0 ? payload.title : "Generated Riddim";
  const mood = typeof payload.mood === "string" && payload.mood.length > 0 ? payload.mood : "dark and sparse";
  const repaired: DirectorResponse = {
    title,
    styleProfile: normalizeStyleProfile(payload.styleProfile, mood),
    mood,
    harmonicPlan: normalizeHarmonicPlan(payload.harmonicPlan),
    arrangementIntent: normalizeArrangementIntent(payload.arrangementIntent),
  };

  return repaired;
}
