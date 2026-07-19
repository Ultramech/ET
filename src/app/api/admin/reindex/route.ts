import { NextResponse } from "next/server";
import { rebuildGraph } from "@/lib/reindex";

export const runtime = "nodejs";
export const maxDuration = 120;

// Rebuilds the graph from persisted chunk text with the current extractors.
export async function POST() {
  const result = rebuildGraph();
  return NextResponse.json({ ok: true, ...result });
}
