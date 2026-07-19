import { z } from "zod";
import { geminiVisionJSON, caps } from "../ai/client";
import { ingestDocument } from "../ingest";
import { getStore, mergeGraph } from "../store";
import type { GraphNode, GraphEdge } from "../types";

// ---------------------------------------------------------------------------
// Engineering-drawing / P&ID computer vision. Gemini multimodal reads a scanned
// or exported P&ID and returns structured equipment tags, instrumentation and
// line topology — which we fold straight into the knowledge graph. This is the
// "Computer Vision (P&ID parsing, drawing digitisation)" capability from the PS.
// ---------------------------------------------------------------------------

export const PidSchema = z.object({
  drawingTitle: z.string().describe("title/number of the drawing if visible, else a short description"),
  unit: z.string().optional().describe("plant unit/area if identifiable"),
  equipment: z
    .array(
      z.object({
        tag: z.string().describe("equipment tag e.g. P-101A, E-101, C-101, V-100"),
        description: z.string().describe("what it is, e.g. 'crude charge pump'"),
      })
    )
    .max(60),
  instruments: z
    .array(
      z.object({
        tag: z.string().describe("ISA instrument tag e.g. TI-1011, PSV-101, FIC-200"),
        function: z.string().describe("measured/controlled variable and role"),
      })
    )
    .max(60),
  connections: z
    .array(
      z.object({
        from: z.string().describe("source equipment tag"),
        to: z.string().describe("destination equipment tag"),
        service: z.string().optional().describe("line service e.g. 'crude', 'discharge'"),
      })
    )
    .max(80),
  notes: z.array(z.string()).max(20).describe("set points, design notes, warnings visible on the drawing"),
});

export type PidExtraction = z.infer<typeof PidSchema>;

const PROMPT = `You are a process engineer digitising a Piping & Instrumentation Diagram (P&ID) / engineering drawing.
Read the drawing carefully and extract its content. Return ONLY JSON of exactly this shape:
{
  "drawingTitle": string,
  "unit": string,
  "equipment": [{ "tag": string, "description": string }],
  "instruments": [{ "tag": string, "function": string }],
  "connections": [{ "from": string, "to": string, "service": string }],
  "notes": [string]
}
Rules: use the exact tags as printed on the drawing. "connections" must follow the process/piping lines (which item feeds which). If a field is unknown use an empty string or empty array. If it is not a P&ID, still extract every readable tag, label and text.`;

export async function extractPid(imageBase64: string, mimeType: string): Promise<PidExtraction | null> {
  if (!caps().vision) return null;
  const raw = await geminiVisionJSON({
    imageBase64,
    mimeType,
    prompt: PROMPT,
    thinkingBudget: 0,
    timeoutMs: 70000,
  });
  if (!raw) return null;
  // tolerant validation — coerce/repair a slightly-off response
  const parsed = PidSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  const r = raw as Record<string, unknown>;
  return {
    drawingTitle: typeof r.drawingTitle === "string" ? r.drawingTitle : "Digitised P&ID",
    unit: typeof r.unit === "string" ? r.unit : undefined,
    equipment: Array.isArray(r.equipment) ? (r.equipment as PidExtraction["equipment"]).filter((e) => e?.tag) : [],
    instruments: Array.isArray(r.instruments) ? (r.instruments as PidExtraction["instruments"]).filter((e) => e?.tag) : [],
    connections: Array.isArray(r.connections) ? (r.connections as PidExtraction["connections"]).filter((c) => c?.from && c?.to) : [],
    notes: Array.isArray(r.notes) ? (r.notes as string[]).filter((n) => typeof n === "string") : [],
  };
}

/** Fold a P&ID extraction into the knowledge graph as a real, linked document. */
export async function ingestPid(extraction: PidExtraction, sourceUrl?: string) {
  const store = getStore();
  const existing = new Set(store.nodes.map((n) => n.id));

  // Build a text representation so the drawing is also RAG-retrievable.
  const text =
    `${extraction.drawingTitle}\n` +
    `Unit: ${extraction.unit ?? "unspecified"}\n\n` +
    `Equipment:\n${extraction.equipment.map((e) => `- ${e.tag}: ${e.description}`).join("\n")}\n\n` +
    `Instrumentation:\n${extraction.instruments.map((i) => `- ${i.tag}: ${i.function}`).join("\n")}\n\n` +
    `Connectivity:\n${extraction.connections.map((c) => `- ${c.from} -> ${c.to}${c.service ? ` (${c.service})` : ""}`).join("\n")}\n\n` +
    `Notes:\n${extraction.notes.map((n) => `- ${n}`).join("\n")}`;

  // Ingest as a P&ID document (also creates MENTIONS + embeddings/LLM if keyed).
  const res = await ingestDocument(
    {
      title: extraction.drawingTitle || "Digitised P&ID",
      type: "P&ID",
      unit: extraction.unit || "CDU-1",
      text,
      sourceUrl,
      origin: "vision",
      domain: "engineering drawing",
    },
    { useEmbeddings: false, useLLM: false }
  );

  // Add explicit CONNECTED_TO topology edges from the drawing (the real value).
  const newNodes: GraphNode[] = [];
  const newEdges: GraphEdge[] = [];
  let ec = store.edges.length + Math.floor(Math.random() * 1e6);
  const ensure = (tag: string, desc: string) => {
    if (!existing.has(tag) && !newNodes.some((n) => n.id === tag)) {
      newNodes.push({ id: tag, label: `${tag} · ${desc}`, type: "Equipment", sources: [res.document.id] });
    }
  };
  for (const e of extraction.equipment) ensure(e.tag.toUpperCase(), e.description);
  for (const c of extraction.connections) {
    const from = c.from.toUpperCase();
    const to = c.to.toUpperCase();
    ensure(from, "");
    ensure(to, "");
    newEdges.push({
      id: `EV${ec++}`,
      source: from,
      target: to,
      type: "CONNECTED_TO",
      evidence: [res.document.id],
      label: c.service,
    });
  }
  if (newNodes.length || newEdges.length) mergeGraph(newNodes, newEdges);

  return { document: res.document, extraction, addedEquipment: newNodes.length, addedConnections: newEdges.length };
}
