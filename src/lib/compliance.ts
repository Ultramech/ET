import type { ComplianceItem } from "./types";
import { getStore } from "./store";
import { SEED_COMPLIANCE } from "./data/seed";
import { llmObject, caps } from "./ai/client";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Quality & Regulatory Compliance agent. Instead of a static checklist, this
// maps regulatory REQUIREMENTS (from ingested standards) against the plant's
// actual procedures, equipment state and inspection/incident records, and
// reasons about where the gaps are. LLM-driven when a key is present; falls
// back to the curated baseline analysis otherwise. Result is cached.
// ---------------------------------------------------------------------------

const Schema = z.object({
  items: z
    .array(
      z.object({
        regulation: z.string(),
        requirement: z.string(),
        appliesTo: z.array(z.string()),
        status: z.enum(["compliant", "gap", "at-risk"]),
        finding: z.string(),
        severity: z.enum(["critical", "major", "minor"]),
        evidence: z.string().optional(),
        dueDate: z.string().optional(),
      })
    )
    .min(3)
    .max(12),
});

declare global {
  // eslint-disable-next-line no-var
  var __Nexus_compliance: ComplianceItem[] | undefined;
}

export async function computeCompliance(refresh = false): Promise<ComplianceItem[]> {
  const store = getStore();
  if (!refresh && store.compliance.length) return store.compliance;
  if (!refresh && globalThis.__Nexus_compliance) return globalThis.__Nexus_compliance;

  // focus on the operating plant (seed unit) so findings are coherent & grounded
  const plantDocs = store.documents.filter(
    (d) => d.origin === "seed" || /CDU|plant-wide/i.test(d.unit)
  );
  const regs = plantDocs.filter((d) => d.type === "Regulation");
  const evidenceDocs = plantDocs.filter((d) =>
    ["SOP", "Inspection", "Incident", "WorkOrder", "OEM Manual", "Datasheet"].includes(d.type)
  );

  if (caps().llm && regs.length && evidenceDocs.length) {
    const regText = regs
      .map((d) => `[${d.id}] ${d.title}\n` + d.chunks.map((c) => `${c.locator}: ${c.text}`).join("\n"))
      .join("\n\n")
      .slice(0, 6000);
    const stateText = evidenceDocs
      .map((d) => `[${d.id}] ${d.type} — ${d.title} (${d.date})\n` + d.chunks.map((c) => c.text).join(" "))
      .join("\n\n")
      .slice(0, 8000);

    const out = await llmObject({
      system:
        "You are a QA/HSE compliance auditor for an Indian refinery. Map each regulatory REQUIREMENT against the plant's actual " +
        "procedures, equipment state and inspection/incident records. Decide status: 'compliant', 'at-risk', or 'gap'. " +
        "Cite the specific clause in 'regulation' (e.g. 'OISD-STD-116 Cl. 7.4'), reference supporting document ids in 'evidence', " +
        "and list affected equipment tags in 'appliesTo'. Be specific and only assert findings grounded in the records.",
      prompt: `REGULATIONS:\n${regText}\n\nPLANT STATE / RECORDS:\n${stateText}`,
      schema: Schema,
      timeoutMs: 60000,
      thinkingBudget: 3072, // reason each requirement against the evidence
    });

    if (out) {
      const items: ComplianceItem[] = out.items.map((it, i) => ({
        id: `CMP-${i + 1}`,
        regulation: it.regulation,
        requirement: it.requirement,
        appliesTo: it.appliesTo,
        status: it.status,
        finding: it.finding,
        severity: it.severity,
        evidence: it.evidence,
        dueDate: it.dueDate,
      }));
      store.compliance = items;
      globalThis.__Nexus_compliance = items;
      return items;
    }
  }

  // deterministic curated baseline
  globalThis.__Nexus_compliance = SEED_COMPLIANCE;
  return SEED_COMPLIANCE;
}
