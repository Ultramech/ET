import type { Document, GraphNode, GraphEdge, ComplianceItem, Fault } from "./types";
import { SEED_DOCUMENTS, SEED_NODES, SEED_EDGES, SEED_FAULTS } from "./data/seed";
import { loadCorpus, saveCorpus, type PersistedCorpus } from "./persist";

// ---------------------------------------------------------------------------
// Process-wide knowledge store. On first access it hydrates from the persisted
// disk corpus (real ingested documents) if present, otherwise from the seed
// refinery narrative. New ingests append and flush to disk. Chunk embeddings
// live alongside for hybrid semantic retrieval.
// ---------------------------------------------------------------------------

export interface KnowledgeStore {
  documents: Document[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  compliance: ComplianceItem[];
  embeddings: Record<string, number[]>;
  faults: Fault[];
}

declare global {
  // eslint-disable-next-line no-var
  var __Nexus_store: KnowledgeStore | undefined;
}

// ── Redis helpers for corpus overflow ────────────────────────────────────────
const CORPUS_REDIS_KEY = "nexus:corpus";

function getRedis() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Redis } = require("@upstash/redis");
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

export async function loadCorpusFromRedis(): Promise<PersistedCorpus | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    return (await redis.get(CORPUS_REDIS_KEY)) as PersistedCorpus | null;
  } catch (e) {
    console.error("[store] redis load failed:", (e as Error).message);
    return null;
  }
}

export async function saveCorpusToRedis(data: PersistedCorpus): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    // Store without embeddings (too large) — embeddings are rebuilt in-memory
    const slim = { ...data, embeddings: {} };
    await redis.set(CORPUS_REDIS_KEY, slim);
  } catch (e) {
    console.error("[store] redis save failed:", (e as Error).message);
  }
}
// ─────────────────────────────────────────────────────────────────────────────

function seedStore(): KnowledgeStore {
  return {
    documents: [...SEED_DOCUMENTS],
    nodes: [...SEED_NODES],
    edges: [...SEED_EDGES],
    compliance: [],
    embeddings: {},
    faults: [...SEED_FAULTS],
  };
}

function hydrate(): KnowledgeStore {
  const disk = loadCorpus();
  if (disk) {
    return {
      documents: disk.documents,
      nodes: disk.nodes,
      edges: disk.edges,
      compliance: disk.compliance ?? [],
      embeddings: disk.embeddings ?? {},
      faults: (disk as any).faults ?? [...SEED_FAULTS],
    };
  }
  return seedStore();
}

export function getStore(): KnowledgeStore {
  if (!globalThis.__Nexus_store) {
    globalThis.__Nexus_store = hydrate();
  }
  return globalThis.__Nexus_store;
}

/** Called once per cold-start by API routes: merges Redis corpus on top of seed/disk data. */
export async function warmStore(): Promise<void> {
  // Hydrate from disk first (works locally; no-op on Vercel)
  if (!globalThis.__Nexus_store) {
    globalThis.__Nexus_store = hydrate();
  }
  // On Vercel, disk is empty so we fall back to seed. Overlay Redis corpus.
  const redisDisk = await loadCorpusFromRedis();
  if (!redisDisk) return; // no redis data yet, seed is fine
  const store = globalThis.__Nexus_store!;
  // Only apply if Redis has MORE documents than we currently have
  if (redisDisk.documents.length > store.documents.length) {
    store.documents = redisDisk.documents;
    store.nodes = redisDisk.nodes;
    store.edges = redisDisk.edges;
    store.compliance = redisDisk.compliance ?? store.compliance;
    store.faults = (redisDisk as any).faults ?? store.faults;
    // Embeddings are not stored in Redis (too large); they stay empty until re-embedded
    console.log(`[store] warm: loaded ${store.documents.length} docs from Redis`);
  }
}

function toPersisted(s: KnowledgeStore): PersistedCorpus {
  return {
    documents: s.documents,
    nodes: s.nodes,
    edges: s.edges,
    compliance: s.compliance,
    embeddings: s.embeddings,
    faults: s.faults,
    version: Date.now(),
  } as any;
}

export function persist() {
  const data = toPersisted(getStore());
  saveCorpus(data);
  // Also push to Redis so other serverless instances can pick it up
  saveCorpusToRedis(data).catch((e) =>
    console.error("[store] redis async persist failed:", e)
  );
}

/** Merge nodes/edges (and optional embeddings) into the graph, deduping nodes. */
export function mergeGraph(
  newNodes: GraphNode[],
  newEdges: GraphEdge[],
  embeddings?: Record<string, number[]>
) {
  const store = getStore();
  const existing = new Set(store.nodes.map((n) => n.id));
  for (const n of newNodes) {
    if (!existing.has(n.id)) {
      store.nodes.push(n);
      existing.add(n.id);
    } else {
      const cur = store.nodes.find((x) => x.id === n.id)!;
      cur.sources = Array.from(new Set([...(cur.sources ?? []), ...(n.sources ?? [])]));
      if (n.meta) cur.meta = { ...(cur.meta ?? {}), ...n.meta };
    }
  }
  store.edges.push(...newEdges);
  if (embeddings) Object.assign(store.embeddings, embeddings);
  persist();
}

export function addDocument(
  doc: Document,
  newNodes: GraphNode[],
  newEdges: GraphEdge[],
  embeddings?: Record<string, number[]>
) {
  const store = getStore();
  store.documents.push(doc);
  mergeGraph(newNodes, newEdges, embeddings);
}

export function findDocBySourceUrl(url: string) {
  return getStore().documents.find((d) => d.sourceUrl === url);
}

export function resetStore() {
  globalThis.__Nexus_store = seedStore();
  persist();
}
