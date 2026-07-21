import type { CopilotAnswer, ConfidenceBand } from "../types";
import { retrieve, toCitations, type Retrieved } from "./retrieve";
import { llmComplete, isLLMAvailable } from "../ai/client";
import { SAFETY_INTENT } from "../ontology";
import { getStore } from "../store";

const AUTHORITATIVE = new Set(["SOP", "Regulation", "OEM Manual"]);

function band(conf: number): ConfidenceBand {
  if (conf >= 0.75) return "high";
  if (conf >= 0.5) return "medium";
  if (conf >= 0.3) return "low";
  return "insufficient";
}

/** Confidence blends absolute retrieval relevance, corroboration and authority. */
function scoreConfidence(items: Retrieved[]): number {
  if (!items.length) return 0;
  const top = items[0].score; // 0..1 absolute relevance
  // require genuine relevance: a weak top match caps confidence hard
  if (top < 0.18) return Math.round(top * 100) / 100;
  const distinctDocs = new Set(items.map((i) => i.doc.id)).size;
  const corroboration = Math.min(1, distinctDocs / 3);
  const hasAuthority = items.some((i) => AUTHORITATIVE.has(i.doc.type)) ? 1 : 0.7;
  return Math.round(Math.min(1, top * 0.6 + corroboration * 0.25 + hasAuthority * 0.15) * 100) / 100;
}

function detectConflicts(items: Retrieved[]): string[] {
  const store = getStore();
  const conflicts: string[] = [];
  for (const i of items) {
    // this doc is the current revision — flag that an older one was suppressed
    if (i.doc.supersedes) {
      const old = store.documents.find((d) => d.id === i.doc.supersedes);
      conflicts.push(
        `Using ${i.doc.revision} of "${i.doc.title}" (the current controlled version).` +
          (old ? ` An older ${old.revision} exists and was suppressed to avoid stale guidance.` : "")
      );
    }
    // this doc is itself a superseded revision that leaked into retrieval
    if (i.doc.revision?.toUpperCase().includes("SUPERSEDED")) {
      const newer = store.documents.find((d) => d.supersedes === i.doc.id);
      conflicts.push(
        `⚠ "${i.doc.title}" is a SUPERSEDED revision${newer ? ` — ${newer.revision} is current` : ""}.`
      );
    }
  }
  return Array.from(new Set(conflicts));
}

export async function answerQuery(query: string): Promise<CopilotAnswer> {
  const items = await retrieve(query, 6);
  const citations = toCitations(items);
  const relatedEntities = Array.from(
    new Set(items.flatMap((i) => i.chunk.entities))
  ).slice(0, 12);
  const conflicts = detectConflicts(items);
  const confidence = scoreConfidence(items);
  const engine: CopilotAnswer["engine"] = isLLMAvailable() ? "llm" : "retrieval-fallback";

  const isSafety = SAFETY_INTENT.some((re) => re.test(query));

  // -- SAFETY GUARDRAIL ---------------------------------------------------
  // This is a safety system. On a query that seeks to bypass a protective
  // measure, we refuse and cite the governing rule instead of "helping".
  if (isSafety) {
    const safetySource = items.find((i) =>
      AUTHORITATIVE.has(i.doc.type)
    );
    const cite = safetySource
      ? `${safetySource.doc.title} (${safetySource.chunk.locator})`
      : "the governing OEM/OISD documentation";
    return {
      answer:
        `⚠️ I can't advise on bypassing or overriding a safety protection. This is a safety-critical action. ` +
        `Per ${cite}, the protective measure you asked about is mandatory and removing it risks loss of containment. ` +
        `Please raise a Management-of-Change (MOC) and consult the shift-in-charge and the OISD-referenced procedure before any deviation.`,
      citations,
      confidence: Math.max(confidence, 0.6),
      band: "high",
      relatedEntities,
      refused: true,
      engine,
      conflicts,
      reasoning: [
        "Query matched a safety-critical intent (bypass/override/disable a protection).",
        "Policy: refuse and redirect to MOC + governing standard rather than provide the workaround.",
      ],
    };
  }

  // -- INSUFFICIENT GROUNDING --------------------------------------------
  if (!items.length || confidence < 0.3) {
    return {
      answer:
        "I don't have enough grounded evidence in the connected documents to answer this reliably. " +
        "Rather than guess, I'm flagging this as a knowledge gap. Try rephrasing with an equipment tag " +
        "(e.g. P-101A), or this may be undocumented tacit knowledge worth capturing before it's lost.",
      citations,
      confidence,
      band: "insufficient",
      relatedEntities,
      refused: false,
      engine,
      conflicts,
      reasoning: ["No chunk cleared the grounding threshold — refusing to hallucinate."],
    };
  }

  // -- GROUNDED SYNTHESIS -------------------------------------------------
  const context = items
    .map(
      (i, n) =>
        `[[${n + 1}]] SOURCE: ${i.doc.title} · ${i.doc.type} · ${i.chunk.locator} (dated ${i.doc.date})\n${i.chunk.text}`
    )
    .join("\n\n");

  const system =
    "You are Nexus, an industrial knowledge copilot for a refinery. Answer ONLY from the provided sources. " +
    "Be concise and operational — a field technician or engineer is reading on a phone. " +
    "Cite sources inline using the [[n]] markers that precede each source. " +
    "If the sources conflict or one is superseded, say which one is current. " +
    "Never invent equipment tags, setpoints or clause numbers that are not in the sources. " +
    "If the sources don't fully answer, say what is missing.";

  const prompt = `QUESTION: ${query}\n\nSOURCES:\n${context}\n\nAnswer the question grounded strictly in the sources above, with inline [[n]] citations.`;

  const llm = await llmComplete({ system, prompt });

  const answer = llm ?? extractiveAnswer(items);

  // If the model itself signals the corpus doesn't cover the question, the
  // confidence must reflect that — retrieval strength alone can mislead.
  const noAnswer =
    /not (available|found|contained|present|covered) in the (provided |connected |available )?(sources|documents|records)|do(es)? not (contain|provide|mention|include|specify|address)|i (don'?t|do not) have|no (relevant )?information|cannot (be )?(find|found|determined|answer(ed)?)|unable to (find|locate|answer)/i.test(
      answer
    );
  const finalConf = noAnswer ? Math.min(confidence, 0.2) : confidence;

  return {
    answer,
    citations: noAnswer ? [] : citations,
    confidence: finalConf,
    band: noAnswer ? "insufficient" : band(finalConf),
    relatedEntities: noAnswer ? [] : relatedEntities,
    refused: false,
    engine: llm ? "llm" : "retrieval-fallback",
    conflicts: noAnswer ? [] : conflicts,
    reasoning: [
      `Retrieved ${items.length} chunks across ${new Set(items.map((i) => i.doc.id)).size} documents.`,
      noAnswer
        ? "Model reported the corpus does not cover this — flagged as a knowledge gap rather than answered."
        : `Confidence ${(finalConf * 100).toFixed(0)}% — ${band(finalConf)} (relevance + corroboration + authority).`,
      conflicts.length && !noAnswer ? `${conflicts.length} version conflict(s) reconciled.` : "No version conflicts.",
    ],
  };
}

/** Deterministic answer used when no LLM is available — still cited. */
function extractiveAnswer(items: Retrieved[]): string {
  const lead = items[0];
  const bullets = items
    .slice(0, 3)
    .map((i, n) => `- ${i.chunk.text} [[${n + 1}]]`)
    .join("\n");
  return (
    `Based on the connected records, here is what the plant's documents say:\n\n${bullets}\n\n` +
    `Most authoritative source: **${lead.doc.title}** (${lead.chunk.locator}). ` +
    `Open the cited documents for full context.`
  );
}
