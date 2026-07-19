import type { GraphNode, GraphEdge, EntityType } from "./types";
import { getStore, persist } from "./store";
import { SEED_NODES, SEED_EDGES } from "./data/seed";
import { EXTRACTORS } from "./ontology";
import { invalidateIndex } from "./rag/retrieve";

// ---------------------------------------------------------------------------
// Rebuilds the entire knowledge graph from persisted chunk text using the
// current ontology extractors — no re-fetching. Preserves the curated seed
// graph (topology, failure edges, people) and re-derives entities/links for
// every ingested document. Used after tightening extractors or on demand.
// ---------------------------------------------------------------------------

function extract(text: string): { id: string; type: EntityType }[] {
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

export function rebuildGraph() {
  const store = getStore();

  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  let ec = 1;

  // 1) seed graph is authoritative for the curated narrative
  for (const n of SEED_NODES) nodes.set(n.id, { ...n });
  for (const e of SEED_EDGES) edges.push({ ...e, id: `S${ec++}` });
  const seedDocIds = new Set(store.documents.filter((d) => d.origin === "seed" || !d.origin).map((d) => d.id));

  const addNode = (id: string, type: EntityType, docId: string) => {
    const cur = nodes.get(id);
    if (cur) {
      cur.sources = Array.from(new Set([...(cur.sources ?? []), docId]));
    } else {
      nodes.set(id, { id, label: id, type, sources: [docId] });
    }
  };

  // 2) re-derive entities/links for every ingested document
  for (const doc of store.documents) {
    if (seedDocIds.has(doc.id)) continue; // keep seed as-is
    if (!nodes.has(doc.id)) {
      nodes.set(doc.id, { id: doc.id, label: `${doc.type}: ${doc.title}`, type: "Document", meta: { type: doc.type } });
    }
    const mentioned = new Set<string>();
    for (const chunk of doc.chunks) {
      const ents = extract(chunk.text);
      chunk.entities = ents.map((e) => e.id); // refresh chunk-level tags too
      for (const e of ents) {
        addNode(e.id, e.type, doc.id);
        mentioned.add(e.id);
      }
    }
    for (const id of mentioned) {
      edges.push({ id: `E${ec++}`, source: doc.id, target: id, type: "MENTIONS" });
    }
    if (doc.author) {
      addNode(doc.author, "Person", doc.id);
      edges.push({ id: `E${ec++}`, source: doc.author, target: doc.id, type: "AUTHORED" });
    }
  }

  store.nodes = [...nodes.values()];
  store.edges = edges;
  invalidateIndex();
  persist();

  const byType: Record<string, number> = {};
  for (const n of store.nodes) byType[n.type] = (byType[n.type] ?? 0) + 1;
  return { nodes: store.nodes.length, edges: store.edges.length, byType };
}
