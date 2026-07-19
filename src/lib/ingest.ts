import type {
  Document,
  DocChunk,
  GraphNode,
  GraphEdge,
  DocType,
  EntityType,
} from "./types";
import { EXTRACTORS } from "./ontology";
import { addDocument, getStore } from "./store";
import { embedTexts, llmObject, caps } from "./ai/client";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Universal ingestion pipeline.
//   text -> sentence-aware chunks -> entity extraction (ontology regex + LLM)
//        -> relationship inference -> embeddings -> graph linkage -> persist
//
// The ontology/regex path is always-on and fast (used for bulk corpus loads).
// LLM extraction + embeddings are opt-in enrichments that light up when a
// provider key is present. Nothing here throws on a bad chunk.
// ---------------------------------------------------------------------------

const MAX_CHUNKS = 120; // bound per-document size for very large PDFs
const TARGET = 900; // target chunk size (chars)
const OVERLAP = 140; // overlap between chunks (chars)

export function chunkText(text: string, docId: string): DocChunk[] {
  const clean = text.replace(/\s+\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
  // sentence-ish segmentation preserving structure
  const sentences = clean
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])|\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: DocChunk[] = [];
  let buf = "";
  let idx = 0;
  const flush = () => {
    if (!buf.trim()) return;
    idx++;
    chunks.push({
      id: `${docId}#c${idx}`,
      docId,
      locator: `§${idx}`,
      text: buf.trim(),
      entities: [],
    });
    // carry overlap
    buf = buf.length > OVERLAP ? buf.slice(-OVERLAP) : "";
  };

  for (const s of sentences) {
    if ((buf + " " + s).length > TARGET) {
      flush();
      if (chunks.length >= MAX_CHUNKS) break;
    }
    buf = buf ? buf + " " + s : s;
  }
  if (chunks.length < MAX_CHUNKS) flush();
  return chunks;
}

function extractByOntology(text: string): { id: string; type: EntityType }[] {
  const found = new Map<string, EntityType>();
  for (const ex of EXTRACTORS) {
    for (const m of text.matchAll(ex.re)) {
      const raw = (m[1] ?? m[0]).trim();
      const id = ex.normalize ? ex.normalize(raw) : raw;
      if (id.length < 2 || id.length > 60) continue;
      if (!found.has(id)) found.set(id, ex.type);
    }
  }
  return Array.from(found, ([id, type]) => ({ id, type }));
}

// LLM enrichment schema — extra entities + typed relations the regex misses.
const LLMExtract = z.object({
  entities: z
    .array(
      z.object({
        name: z.string(),
        type: z.enum([
          "Equipment",
          "Parameter",
          "Regulation",
          "Person",
          "FailureMode",
          "Unit",
        ]),
      })
    )
    .max(30),
  relations: z
    .array(
      z.object({
        source: z.string(),
        target: z.string(),
        type: z.enum([
          "CONNECTED_TO",
          "GOVERNS",
          "EXHIBITS",
          "APPLIES_TO",
          "PART_OF",
          "PERFORMED_ON",
          "INVOLVES",
        ]),
      })
    )
    .max(30),
  domain: z.string().describe("2-4 word topic, e.g. 'rotating equipment safety'"),
});

async function llmEnrich(title: string, sample: string) {
  if (!caps().llm) return null;
  return llmObject({
    system:
      "You are an industrial knowledge engineer. Extract domain entities and their relationships from the document excerpt. " +
      "Use canonical equipment tags where present. Only include entities actually grounded in the text.",
    prompt: `Title: ${title}\n\nExcerpt:\n${sample.slice(0, 6000)}`,
    schema: LLMExtract,
    timeoutMs: 35000,
  });
}

export interface IngestInput {
  title: string;
  type?: DocType;
  unit?: string;
  text: string;
  author?: string;
  date?: string;
  sourceUrl?: string;
  origin?: Document["origin"];
  domain?: string;
  pages?: number;
  bytes?: number;
}

export interface IngestResult {
  document: Pick<Document, "id" | "title" | "type" | "sourceUrl" | "domain"> & {
    chunks: number;
  };
  newEntities: { id: string; type: EntityType; isNew: boolean }[];
  newEdges: number;
  linkedToExisting: string[];
  embedded: boolean;
  llmEnriched: boolean;
}

/** Heuristic document-type classifier for untyped (e.g. crawled) documents. */
export function classifyType(title: string, text: string): DocType {
  const s = (title + " " + text.slice(0, 500)).toLowerCase();
  if (/\bp&id\b|piping and instrumentation|instrument diagram/.test(s)) return "P&ID";
  if (/incident|accident|investigation report|near[- ]miss|rupture|explosion|fire/.test(s)) return "Incident";
  if (/inspection|ndt|thickness|corrosion|integrity/.test(s)) return "Inspection";
  if (/oisd|api std|api rp|standard|regulation|factory act|peso|statutory|code of practice/.test(s)) return "Regulation";
  if (/work order|maintenance record|repair|overhaul/.test(s)) return "WorkOrder";
  if (/procedure|sop|operating instruction|startup|shutdown/.test(s)) return "SOP";
  if (/datasheet|data sheet|specification|rated|nameplate/.test(s)) return "Datasheet";
  if (/manual|o&m|operation and maintenance|handbook/.test(s)) return "OEM Manual";
  return "OEM Manual";
}

export async function ingestDocument(
  input: IngestInput,
  opts: { useLLM?: boolean; useEmbeddings?: boolean } = {}
): Promise<IngestResult> {
  const store = getStore();
  const docId = `DOC-${(input.origin === "url" ? "URL" : "UP")}-${Date.now().toString(36).toUpperCase()}-${Math.floor(
    Math.random() * 1e4
  ).toString(36)}`;
  const chunks = chunkText(input.text, docId);
  const type = input.type ?? classifyType(input.title, input.text);

  const existingIds = new Set(store.nodes.map((n) => n.id));
  const allEntities = new Map<string, EntityType>();
  const linkedToExisting: string[] = [];

  for (const chunk of chunks) {
    const ents = extractByOntology(chunk.text);
    chunk.entities = ents.map((e) => e.id);
    for (const e of ents) {
      if (!allEntities.has(e.id)) allEntities.set(e.id, e.type);
      if (existingIds.has(e.id) && !linkedToExisting.includes(e.id)) linkedToExisting.push(e.id);
    }
  }

  // ---- optional LLM enrichment ------------------------------------------
  let llmEnriched = false;
  const llmRelations: { source: string; target: string; type: GraphEdge["type"] }[] = [];
  let domain = input.domain;
  if (opts.useLLM && caps().llm) {
    const sample = chunks.slice(0, 8).map((c) => c.text).join("\n");
    const enrich = await llmEnrich(input.title, sample);
    if (enrich) {
      llmEnriched = true;
      domain = domain || enrich.domain;
      for (const e of enrich.entities) {
        const id = e.name.trim();
        if (id.length < 2 || id.length > 60) continue;
        if (!allEntities.has(id)) allEntities.set(id, e.type as EntityType);
        if (existingIds.has(id) && !linkedToExisting.includes(id)) linkedToExisting.push(id);
      }
      for (const r of enrich.relations) {
        if (allEntities.has(r.source) && allEntities.has(r.target)) {
          llmRelations.push({ source: r.source, target: r.target, type: r.type });
        }
      }
    }
  }

  const doc: Document = {
    id: docId,
    title: input.title,
    type,
    unit: input.unit || "External Reference",
    date: input.date || new Date().toISOString().slice(0, 10),
    author: input.author,
    ingestQuality: "clean",
    language: "en",
    summary: chunks[0]?.text.slice(0, 200) ?? input.title,
    chunks,
    sourceUrl: input.sourceUrl,
    origin: input.origin ?? "upload",
    domain,
    pages: input.pages,
    bytes: input.bytes,
  };

  // ---- nodes & edges -----------------------------------------------------
  const newNodes: GraphNode[] = [
    { id: docId, label: `${type}: ${input.title}`, type: "Document", meta: { type } },
  ];
  const newEntityReport: IngestResult["newEntities"] = [];
  for (const [id, etype] of allEntities) {
    const isNew = !existingIds.has(id);
    newEntityReport.push({ id, type: etype, isNew });
    newNodes.push({ id, label: id, type: etype, sources: [docId] });
  }

  let ec = store.edges.length + Math.floor(Math.random() * 1e6);
  const newEdges: GraphEdge[] = [];
  for (const [id] of allEntities) {
    newEdges.push({ id: `EU${ec++}`, source: docId, target: id, type: "MENTIONS" });
  }
  for (const r of llmRelations) {
    newEdges.push({ id: `EU${ec++}`, source: r.source, target: r.target, type: r.type, evidence: [docId] });
  }
  if (input.author) {
    if (!existingIds.has(input.author))
      newNodes.push({ id: input.author, label: input.author, type: "Person" });
    newEdges.push({ id: `EU${ec++}`, source: input.author, target: docId, type: "AUTHORED" });
  }

  // ---- embeddings --------------------------------------------------------
  let embedded = false;
  const embeddings: Record<string, number[]> = {};
  if (opts.useEmbeddings && caps().embeddings) {
    const vecs = await embedTexts(chunks.map((c) => c.text));
    if (vecs) {
      embedded = true;
      chunks.forEach((c, i) => {
        if (vecs[i]) embeddings[c.id] = vecs[i];
      });
    }
  }

  addDocument(doc, newNodes, newEdges, embedded ? embeddings : undefined);

  return {
    document: { id: docId, title: input.title, type, sourceUrl: input.sourceUrl, domain, chunks: chunks.length },
    newEntities: newEntityReport,
    newEdges: newEdges.length,
    linkedToExisting,
    embedded,
    llmEnriched,
  };
}
