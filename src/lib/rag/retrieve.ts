import type { DocChunk, Document, Citation } from "../types";
import { getStore } from "../store";
import { embedQuery, caps } from "../ai/client";

// ---------------------------------------------------------------------------
// Hybrid retrieval at scale.
//   • Lexical BM25 over a cached inverted index (rebuilt only when the corpus
//     changes) — fast even at tens of thousands of chunks, always available.
//   • Semantic vector search over chunk embeddings (when a provider key exists).
//   • Reciprocal Rank Fusion (RRF) merges the two rankings.
// Entity-tag exact matches and superseded-doc demotion are folded into BM25.
// ---------------------------------------------------------------------------

const STOP = new Set(
  "the a an of to for in on at is are be and or with without into from this that we our it its as by will shall must can may not no if then than been being have has had do does".split(
    " "
  )
);

function tokenize(s: string): string[] {
  return (s.toLowerCase().match(/[a-z0-9]+(?:-[a-z0-9]+)*/g) ?? []).filter(
    (t) => t.length > 1 && !STOP.has(t)
  );
}

function extractTags(s: string): string[] {
  return (
    s.toUpperCase().match(/\b[A-Z]{1,4}-[A-Z]*\d{2,4}[A-Z]?\b|OISD[- ]?\w*[- ]?\d{2,3}|API\s?\d{2,3}/g) ?? []
  );
}

// -- cached inverted index ---------------------------------------------------
interface IndexedChunk {
  chunk: DocChunk;
  doc: Document;
  tf: Map<string, number>;
  len: number;
  tags: Set<string>;
}
interface Index {
  size: number;
  chunks: IndexedChunk[];
  df: Map<string, number>;
  N: number;
  avgLen: number;
}
declare global {
  // eslint-disable-next-line no-var
  var __Nexus_index: Index | undefined;
}

function buildIndex(): Index {
  const store = getStore();
  const chunks: IndexedChunk[] = [];
  const df = new Map<string, number>();
  let totalLen = 0;
  for (const doc of store.documents) {
    for (const chunk of doc.chunks) {
      const tokens = tokenize(chunk.text);
      const tf = new Map<string, number>();
      for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
      for (const t of tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
      totalLen += tokens.length;
      chunks.push({
        chunk,
        doc,
        tf,
        len: tokens.length || 1,
        tags: new Set([...extractTags(chunk.text), ...chunk.entities.map((e) => e.toUpperCase())]),
      });
    }
  }
  return { size: store.documents.length, chunks, df, N: chunks.length || 1, avgLen: totalLen / (chunks.length || 1) || 1 };
}

function getIndex(): Index {
  const store = getStore();
  if (!globalThis.__Nexus_index || globalThis.__Nexus_index.size !== store.documents.length) {
    globalThis.__Nexus_index = buildIndex();
  }
  return globalThis.__Nexus_index;
}

/** Invalidate the cached index (call after mutating the corpus mid-request). */
export function invalidateIndex() {
  globalThis.__Nexus_index = undefined;
}

export interface Retrieved {
  chunk: DocChunk;
  doc: Document;
  score: number;
}

function bm25Rank(query: string): { item: IndexedChunk; score: number }[] {
  const idx = getIndex();
  const qTokens = new Set(tokenize(query));
  const qTags = extractTags(query);
  const k1 = 1.5;
  const b = 0.75;
  const out: { item: IndexedChunk; score: number }[] = [];
  for (const item of idx.chunks) {
    let score = 0;
    for (const q of qTokens) {
      const f = item.tf.get(q) ?? 0;
      if (!f) continue;
      const dfq = idx.df.get(q) ?? 0;
      const idf = Math.log(1 + (idx.N - dfq + 0.5) / (dfq + 0.5));
      score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + b * (item.len / idx.avgLen))));
    }
    for (const t of qTags) if (item.tags.has(t)) score += 6;
    for (const ent of item.chunk.entities) {
      const et = tokenize(ent);
      if (et.some((x) => qTokens.has(x))) score += 1.2;
    }
    const titleTokens = new Set(tokenize(`${item.doc.title} ${item.doc.type}`));
    for (const q of qTokens) if (titleTokens.has(q)) score += 2.2;
    if (item.doc.revision?.toUpperCase().includes("SUPERSEDED")) score *= 0.6;
    if (score > 0) out.push({ item, score });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0,
    na = 0,
    nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

async function vectorRank(query: string): Promise<{ id: string; score: number }[] | null> {
  const store = getStore();
  const ids = Object.keys(store.embeddings);
  if (!ids.length || !caps().embeddings) return null;
  const qv = await embedQuery(query);
  if (!qv) return null;
  const scored = ids.map((id) => ({ id, score: cosine(qv, store.embeddings[id]) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 100);
}

// Strong-match reference scale for BM25 → used to derive an ABSOLUTE relevance
// (so an irrelevant query scores low, rather than being falsely normalised up).
const BM25_STRONG = 14;

/** Reciprocal-rank-fusion hybrid retrieval. Returns absolute relevance (0..1). */
export async function retrieve(query: string, k = 6): Promise<Retrieved[]> {
  const idx = getIndex();
  const byId = new Map(idx.chunks.map((c) => [c.chunk.id, c]));
  const bm = bm25Rank(query);
  const vec = await vectorRank(query);

  // absolute per-chunk signals
  const bmRaw = new Map<string, number>(bm.map((r) => [r.item.chunk.id, r.score]));
  const cos = new Map<string, number>((vec ?? []).map((r) => [r.id, r.score]));

  const RRF = 60;
  const fused = new Map<string, { item: IndexedChunk; rrf: number }>();
  bm.slice(0, 100).forEach((r, rank) => {
    fused.set(r.item.chunk.id, { item: r.item, rrf: 1 / (RRF + rank) });
  });
  if (vec) {
    vec.forEach((r, rank) => {
      const item = byId.get(r.id);
      if (!item) return;
      const prev = fused.get(r.id);
      const add = 1 / (RRF + rank);
      if (prev) prev.rrf += add;
      else fused.set(r.id, { item, rrf: add });
    });
  }

  const ranked = [...fused.values()].sort((a, b) => b.rrf - a.rrf).slice(0, k);
  // absolute relevance = best of (lexical strength, semantic similarity), 0..1
  return ranked.map((r) => {
    const bmNorm = Math.min(1, (bmRaw.get(r.item.chunk.id) ?? 0) / BM25_STRONG);
    const cosSim = Math.max(0, cos.get(r.item.chunk.id) ?? 0);
    return {
      chunk: r.item.chunk,
      doc: r.item.doc,
      score: Math.max(bmNorm, cosSim), // 0..1 absolute relevance
    };
  });
}

export function toCitations(items: Retrieved[]): Citation[] {
  const max = Math.max(...items.map((i) => i.score), 1);
  return items.map((i) => ({
    docId: i.doc.id,
    docTitle: i.doc.title,
    docType: i.doc.type,
    locator: i.chunk.locator,
    snippet: i.chunk.text.length > 260 ? i.chunk.text.slice(0, 257) + "…" : i.chunk.text,
    score: Math.round((i.score / max) * 100) / 100,
  }));
}
