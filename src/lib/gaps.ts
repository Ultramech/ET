import fs from "fs";
import path from "path";
import { ingestDocument } from "./ingest";
import { invalidateIndex } from "./rag/retrieve";

// ---------------------------------------------------------------------------
// Knowledge Gap Register — the answer to the PS "knowledge cliff" (25% of
// experienced engineers retiring, undocumented tacit knowledge lost forever).
//
// Every question the copilot could NOT answer from the corpus is logged here
// automatically. Anyone in the plant who holds that knowledge can capture it
// in one step — the captured answer is ingested through the normal pipeline
// and becomes a first-class, cited, graph-linked document. The next person
// who asks gets a real answer: the brain learns from its own blind spots.
// ---------------------------------------------------------------------------

export interface KnowledgeGap {
  id: string;
  question: string;
  askedBy: string; // display name
  createdAt: string; // ISO
  timesAsked: number;
  status: "open" | "captured";
  capturedBy?: string;
  capturedAt?: string;
  capturedDocId?: string;
}

function resolveFile(): string {
  const primary = path.join(process.cwd(), "data");
  try {
    fs.mkdirSync(primary, { recursive: true });
    fs.accessSync(primary, fs.constants.W_OK);
    return path.join(primary, "gaps.json");
  } catch {
    const tmp = path.join("/tmp", "Nexus-data");
    fs.mkdirSync(tmp, { recursive: true });
    return path.join(tmp, "gaps.json");
  }
}

const FILE = resolveFile();

declare global {
  // eslint-disable-next-line no-var
  var __Nexus_gaps: KnowledgeGap[] | undefined;
}

function load(): KnowledgeGap[] {
  if (globalThis.__Nexus_gaps) return globalThis.__Nexus_gaps;
  try {
    if (fs.existsSync(FILE)) {
      const data = JSON.parse(fs.readFileSync(FILE, "utf-8")) as KnowledgeGap[];
      if (Array.isArray(data)) {
        globalThis.__Nexus_gaps = data;
        return data;
      }
    }
  } catch (e) {
    console.error("[gaps] load failed:", (e as Error).message);
  }
  globalThis.__Nexus_gaps = [];
  return globalThis.__Nexus_gaps;
}

function save() {
  try {
    fs.writeFileSync(FILE, JSON.stringify(globalThis.__Nexus_gaps ?? [], null, 2), "utf-8");
  } catch (e) {
    console.error("[gaps] save failed:", (e as Error).message);
  }
}

const normalize = (q: string) => q.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

/** Log an unanswerable question. Repeat questions bump the counter instead. */
export function recordGap(question: string, askedBy: string): KnowledgeGap {
  const gaps = load();
  const norm = normalize(question);
  const existing = gaps.find((g) => normalize(g.question) === norm && g.status === "open");
  if (existing) {
    existing.timesAsked += 1;
    save();
    return existing;
  }
  const gap: KnowledgeGap = {
    id: `GAP-${Date.now().toString(36).toUpperCase()}`,
    question: question.slice(0, 300),
    askedBy,
    createdAt: new Date().toISOString(),
    timesAsked: 1,
    status: "open",
  };
  gaps.unshift(gap);
  save();
  return gap;
}

export function listGaps(): KnowledgeGap[] {
  return load();
}

export function openGapCount(): number {
  return load().filter((g) => g.status === "open").length;
}

/** Capture the missing knowledge: ingest it as a real document, close the gap. */
export async function captureGap(
  id: string,
  input: { text: string; title?: string; capturedBy: string }
): Promise<{ gap?: KnowledgeGap; docId?: string; error?: string }> {
  const gaps = load();
  const gap = gaps.find((g) => g.id === id);
  if (!gap) return { error: "gap not found" };
  if (gap.status === "captured") return { error: "already captured" };
  if (!input.text || input.text.trim().length < 20)
    return { error: "please write at least a couple of sentences" };

  const result = await ingestDocument(
    {
      title: input.title?.trim() || `Field Knowledge: ${gap.question.slice(0, 80)}`,
      type: "SOP",
      unit: "CDU-1",
      text: `Q: ${gap.question}\n\nCaptured answer (${input.capturedBy}): ${input.text.trim()}`,
      author: input.capturedBy,
      origin: "capture",
      domain: "captured tacit knowledge",
    },
    { useLLM: true, useEmbeddings: true }
  );

  gap.status = "captured";
  gap.capturedBy = input.capturedBy;
  gap.capturedAt = new Date().toISOString();
  gap.capturedDocId = result.document.id;
  save();
  invalidateIndex();
  return { gap, docId: result.document.id };
}

export function deleteGap(id: string): boolean {
  const gaps = load();
  const before = gaps.length;
  globalThis.__Nexus_gaps = gaps.filter((g) => g.id !== id);
  save();
  return globalThis.__Nexus_gaps.length < before;
}
