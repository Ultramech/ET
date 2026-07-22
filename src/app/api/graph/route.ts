import { NextRequest, NextResponse } from "next/server";
import { getStore, warmStore } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  await warmStore();
  const store = getStore();
  const focus = req.nextUrl.searchParams.get("focus");
  const depth = Number(req.nextUrl.searchParams.get("depth") ?? 1);

  // No focus → return a bounded, meaningful default view (the operating-plant
  // neighbourhood) rather than all ~1200 nodes, which would swamp the layout.
  // The full graph is explorable via search/focus.
  if (!focus) {
    const seedDocIds = new Set(
      store.documents.filter((d) => d.origin === "seed" || !d.origin).map((d) => d.id)
    );
    const keep = new Set<string>();
    for (const n of store.nodes) {
      if (n.type === "Document" && seedDocIds.has(n.id)) keep.add(n.id);
      else if (n.type !== "Document" && (n.sources ?? []).some((s) => seedDocIds.has(s))) keep.add(n.id);
      else if (["Unit", "FailureMode"].includes(n.type)) keep.add(n.id);
    }
    // include curated seed entities referenced by seed edges
    for (const e of store.edges) {
      if (keep.has(e.source)) keep.add(e.target);
      if (keep.has(e.target)) keep.add(e.source);
    }
    const capped = [...keep].slice(0, 140);
    const capSet = new Set(capped);
    return NextResponse.json({
      nodes: store.nodes.filter((n) => capSet.has(n.id)),
      edges: store.edges.filter((e) => capSet.has(e.source) && capSet.has(e.target)),
      total: { nodes: store.nodes.length, edges: store.edges.length },
      view: "plant-neighbourhood",
    });
  }

  // BFS neighbourhood around a focus node
  const keep = new Set<string>([focus]);
  let frontier = [focus];
  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const edge of store.edges) {
      if (keep.has(edge.source) && !keep.has(edge.target)) {
        keep.add(edge.target);
        next.push(edge.target);
      }
      if (keep.has(edge.target) && !keep.has(edge.source)) {
        keep.add(edge.source);
        next.push(edge.source);
      }
    }
    frontier = next;
    if (!frontier.length) break;
  }
  const capped = new Set([...keep].slice(0, 160));
  return NextResponse.json({
    nodes: store.nodes.filter((n) => capped.has(n.id)),
    edges: store.edges.filter((e) => capped.has(e.source) && capped.has(e.target)),
  });
}
