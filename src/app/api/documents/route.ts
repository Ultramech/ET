import { NextRequest, NextResponse } from "next/server";
import { getStore, persist } from "@/lib/store";
import { invalidateIndex } from "@/lib/rag/retrieve";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const store = getStore();
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const doc = store.documents.find((d) => d.id === id);
    if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(doc);
  }
  return NextResponse.json({
    documents: store.documents.map((d) => ({
      id: d.id,
      title: d.title,
      type: d.type,
      unit: d.unit,
      revision: d.revision,
      date: d.date,
      author: d.author,
      ingestQuality: d.ingestQuality,
      language: d.language,
      summary: d.summary,
      chunks: d.chunks.length,
    })),
  });
}

// Admin-only (enforced by the proxy): remove a document and everything that
// only existed because of it — its chunks' embeddings, its graph node, edges
// that touch it, and entity nodes left orphaned with no other source.
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const store = getStore();
  const doc = store.documents.find((d) => d.id === id);
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });

  store.documents = store.documents.filter((d) => d.id !== id);
  for (const c of doc.chunks) delete store.embeddings[c.id];

  const removedEdges = store.edges.filter((e) => e.source === id || e.target === id);
  store.edges = store.edges.filter((e) => e.source !== id && e.target !== id);
  for (const e of store.edges) {
    if (e.evidence?.includes(id)) e.evidence = e.evidence.filter((x) => x !== id);
  }

  const referenced = new Set(store.edges.flatMap((e) => [e.source, e.target]));
  const orphaned: string[] = [];
  store.nodes = store.nodes.filter((n) => {
    if (n.id === id) return false;
    if (!n.sources?.includes(id)) return true;
    n.sources = n.sources.filter((s) => s !== id);
    if (n.sources.length === 0 && !referenced.has(n.id)) {
      orphaned.push(n.id);
      return false;
    }
    return true;
  });

  invalidateIndex();
  persist();
  return NextResponse.json({
    ok: true,
    deleted: id,
    removedEdges: removedEdges.length,
    prunedNodes: orphaned.length,
  });
}
