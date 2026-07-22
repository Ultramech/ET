import { NextResponse } from "next/server";
import { getStore, warmStore } from "@/lib/store";
import { caps } from "@/lib/ai/client";
import { PLANT } from "@/lib/data/seed";

export const runtime = "nodejs";

export async function GET() {
  await warmStore();
  const store = getStore();
  const byType: Record<string, number> = {};
  for (const d of store.documents) byType[d.type] = (byType[d.type] ?? 0) + 1;

  const byOrigin: Record<string, number> = {};
  for (const d of store.documents) byOrigin[d.origin ?? "seed"] = (byOrigin[d.origin ?? "seed"] ?? 0) + 1;

  const entityCounts: Record<string, number> = {};
  for (const n of store.nodes) entityCounts[n.type] = (entityCounts[n.type] ?? 0) + 1;

  const totalChunks = store.documents.reduce((s, d) => s + d.chunks.length, 0);
  const c = caps();

  return NextResponse.json({
    plant: PLANT,
    documents: store.documents.length,
    docsByType: byType,
    docsByOrigin: byOrigin,
    realIngested: store.documents.filter((d) => d.origin === "url" || d.origin === "vision").length,
    chunks: totalChunks,
    embeddedChunks: Object.keys(store.embeddings).length,
    nodes: store.nodes.length,
    edges: store.edges.length,
    entities: entityCounts,
    crossDocLinks: store.edges.filter((e) => e.type === "MENTIONS").length,
    llm: c.llm,
    ai: { provider: c.provider, model: c.model, vision: c.vision, embeddings: c.embeddings },
  });
}
