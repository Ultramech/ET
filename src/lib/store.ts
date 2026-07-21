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
  saveCorpus(toPersisted(getStore()));
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
