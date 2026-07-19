import { NextRequest, NextResponse } from "next/server";
import { listGaps, deleteGap } from "@/lib/gaps";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ gaps: listGaps() });
}

// Dismiss a gap (admin-only, enforced by the proxy).
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (!deleteGap(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
