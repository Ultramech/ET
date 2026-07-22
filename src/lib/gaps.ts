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
//
// Persistence strategy:
//   - When UPSTASH (KV_REST_API_URL + KV_REST_API_TOKEN) is available, all
//     reads/writes go to Redis. This is the production Vercel path where the
//     filesystem is ephemeral and serverless instances don't share memory.
//   - Otherwise, falls back to a local JSON file (dev / self-hosted).
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

const REDIS_KEY = "nexus:gaps";

// ── Redis helpers (used only when KV env vars are present) ──────────────────

function getRedis() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  // Lazy-import to avoid crashing when package is absent in local dev
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Redis } = require("@upstash/redis");
    return new Redis({ url, token }) as import("@upstash/redis").Redis;
  } catch {
    return null;
  }
}

async function redisLoad(): Promise<KnowledgeGap[] | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const data = await redis.get<KnowledgeGap[]>(REDIS_KEY);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("[gaps] redis load failed:", (e as Error).message);
    return null;
  }
}

async function redisSave(gaps: KnowledgeGap[]): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    await redis.set(REDIS_KEY, gaps);
    return true;
  } catch (e) {
    console.error("[gaps] redis save failed:", (e as Error).message);
    return false;
  }
}

// ── File-system fallback (local dev / self-hosted) ──────────────────────────

import fs from "fs";
import path from "path";

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

function fileLoad(): KnowledgeGap[] {
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
    console.error("[gaps] file load failed:", (e as Error).message);
  }
  globalThis.__Nexus_gaps = [];
  return globalThis.__Nexus_gaps;
}

function fileSave(gaps: KnowledgeGap[]) {
  globalThis.__Nexus_gaps = gaps;
  try {
    fs.writeFileSync(FILE, JSON.stringify(gaps, null, 2), "utf-8");
  } catch (e) {
    console.error("[gaps] file save failed:", (e as Error).message);
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

const normalize = (q: string) =>
  q.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

/** Log an unanswerable question. Repeat questions bump the counter instead. */
export async function recordGapAsync(question: string, askedBy: string): Promise<KnowledgeGap> {
  // Try Redis first
  const fromRedis = await redisLoad();
  if (fromRedis !== null) {
    const norm = normalize(question);
    const existing = fromRedis.find((g) => normalize(g.question) === norm && g.status === "open");
    if (existing) {
      existing.timesAsked += 1;
      await redisSave(fromRedis);
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
    fromRedis.unshift(gap);
    await redisSave(fromRedis);
    return gap;
  }

  // Filesystem fallback
  const gaps = fileLoad();
  const norm = normalize(question);
  const existing = gaps.find((g) => normalize(g.question) === norm && g.status === "open");
  if (existing) {
    existing.timesAsked += 1;
    fileSave(gaps);
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
  fileSave(gaps);
  return gap;
}

/** Synchronous shim used by the copilot route (fire-and-forget the async write). */
export function recordGap(question: string, askedBy: string): KnowledgeGap {
  // Synchronously return a gap object; persist asynchronously
  const gap: KnowledgeGap = {
    id: `GAP-${Date.now().toString(36).toUpperCase()}`,
    question: question.slice(0, 300),
    askedBy,
    createdAt: new Date().toISOString(),
    timesAsked: 1,
    status: "open",
  };
  // Fire-and-forget the async upsert (handles deduplication + persistence)
  recordGapAsync(question, askedBy).catch((e) =>
    console.error("[gaps] async record failed:", e)
  );
  return gap;
}

export async function listGaps(): Promise<KnowledgeGap[]> {
  const fromRedis = await redisLoad();
  if (fromRedis !== null) return fromRedis;
  return fileLoad();
}

export async function openGapCount(): Promise<number> {
  const gaps = await listGaps();
  return gaps.filter((g) => g.status === "open").length;
}

/** Capture the missing knowledge: ingest it as a real document, close the gap. */
export async function captureGap(
  id: string,
  input: { text: string; title?: string; capturedBy: string }
): Promise<{ gap?: KnowledgeGap; docId?: string; error?: string }> {
  const gaps = await listGaps();
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

  const fromRedis = await redisLoad();
  if (fromRedis !== null) {
    const idx = fromRedis.findIndex((g) => g.id === id);
    if (idx !== -1) fromRedis[idx] = gap;
    await redisSave(fromRedis);
  } else {
    fileSave(gaps);
  }

  invalidateIndex();
  return { gap, docId: result.document.id };
}

export async function deleteGap(id: string): Promise<boolean> {
  const gaps = await listGaps();
  const filtered = gaps.filter((g) => g.id !== id);
  if (filtered.length === gaps.length) return false;

  const fromRedis = await redisLoad();
  if (fromRedis !== null) {
    await redisSave(filtered);
  } else {
    fileSave(filtered);
  }
  return true;
}
