import type { EntityType } from "./types";

// ---------------------------------------------------------------------------
// Industrial ontology + deterministic entity extractors.
//
// Real plant documents are full of structured tokens that a generic NER model
// misses (equipment tags, regulatory clauses, ISA parameters). We encode the
// domain grammar here so extraction works even with zero LLM budget, and the
// LLM (when available) only has to add the fuzzy, contextual entities.
// ---------------------------------------------------------------------------

export interface ExtractPattern {
  type: EntityType;
  /** global regex, first capture group (or full match) is the entity label */
  re: RegExp;
  /** normalises a raw match into a canonical id */
  normalize?: (raw: string) => string;
  describe: string;
}

export const EXTRACTORS: ExtractPattern[] = [
  {
    type: "Equipment",
    // ISA-style tags: P-101A, E-101, C-101, F-101, V-100, PSV-101, TI-1023
    // (lookbehind stops it matching inside OISD-GDN-119, API-682 etc.)
    re: /(?<![A-Za-z0-9-])([A-Z]{1,4}-\d{2,4}[A-Z]?)\b/g,
    normalize: (r) => r.toUpperCase(),
    describe: "ISA equipment / instrument tag",
  },
  {
    type: "Regulation",
    // OISD-STD-116, OISD-GDN-119, Factory Act 1948, PESO, IS 3624, API 682
    re: /\b(OISD[- ](?:STD|GDN|RP)?[- ]?\d{2,3}|API\s?\d{2,3}|IS\s?\d{3,5}|Factory\s+Act(?:\s+\d{4})?|PESO|CPCB|GPCB)\b/gi,
    normalize: (r) => r.replace(/\s+/g, " ").trim().toUpperCase(),
    describe: "Regulatory / standard reference",
  },
  {
    type: "Parameter",
    // 18 bar, 0.05 mm, 30 %, 220 degC, 1450 rpm — engineering setpoints only
    // (units chosen to avoid matching every stray number in prose)
    re: /\b(\d+(?:\.\d+)?\s?(?:barg?|mm|degc|°c|rpm|kg\/cm2|psi|m3\/hr|kw|mpa))\b/gi,
    describe: "Process parameter / setpoint",
  },
  // NOTE: Person extraction is intentionally NOT a bulk regex — "A. Surname"
  // matches thousands of citation initials in reference prose. Personnel are
  // captured from explicit authorship and (when a key is present) LLM extraction.
];

/** Canonical failure-mode vocabulary for RCA clustering. */
export const FAILURE_MODES = [
  "Mechanical Seal Failure",
  "Coupling Misalignment",
  "Bearing Overheat",
  "Tube Fouling",
  "Cavitation",
  "Corrosion Under Insulation",
] as const;

/** Colour tokens per entity type — used by the graph canvas + legend. */
export const ENTITY_STYLE: Record<
  EntityType,
  { color: string; ring: string; glyph: string }
> = {
  Equipment: { color: "#38bdf8", ring: "#0ea5e9", glyph: "⬢" },
  Parameter: { color: "#a3e635", ring: "#84cc16", glyph: "◈" },
  Regulation: { color: "#f472b6", ring: "#ec4899", glyph: "§" },
  Person: { color: "#fbbf24", ring: "#f59e0b", glyph: "◉" },
  FailureMode: { color: "#fb7185", ring: "#f43f5e", glyph: "✕" },
  Document: { color: "#c084fc", ring: "#a855f7", glyph: "▤" },
  Unit: { color: "#5eead4", ring: "#14b8a6", glyph: "▦" },
};

// Safety-critical intents. If a query matches and grounding is weak, Sutradhar
// REFUSES rather than guesses — because this is a safety system, not a chatbot.
export const SAFETY_INTENT = [
  /\bbypass\b/i,
  /\boverride\b/i,
  /\bdisable\b.*\b(interlock|trip|alarm|relief|psv|sis)\b/i,
  /\bignore\b.*\b(alarm|limit|trip)\b/i,
  /\bkeep running\b|\bkeep it running\b/i,
  /\bwithout\b.*\b(seal flush|cooling|lubrication|ppe)\b/i,
];
