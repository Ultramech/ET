import { NextRequest, NextResponse } from "next/server";
import { getStore, warmStore } from "@/lib/store";

export const runtime = "nodejs";

// Lightweight node search over the whole graph (scales past the render cap).
export async function GET(req: NextRequest) {
  await warmStore();
  const q = (req.nextUrl.searchParams.get("q") || "").toLowerCase().trim();
  if (!q) return NextResponse.json({ results: [] });
  const store = getStore();
  const results = store.nodes
    .filter((n) => n.id.toLowerCase().includes(q) || n.label.toLowerCase().includes(q))
    .sort((a, b) => a.id.length - b.id.length) // prefer exact-ish tag hits
    .slice(0, 10)
    .map((n) => ({ id: n.id, label: n.label, type: n.type }));
  return NextResponse.json({ results });
}
