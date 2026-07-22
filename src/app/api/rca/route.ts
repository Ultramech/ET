import { NextRequest, NextResponse } from "next/server";
import { runRca, runFaultRca, rcaCandidates } from "@/lib/rag/rca";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const faultId = req.nextUrl.searchParams.get("faultId");
  if (faultId) {
    const result = await runFaultRca(faultId);
    if (!result) return NextResponse.json({ error: "unknown fault" }, { status: 404 });
    return NextResponse.json(result);
  }

  const equipment = req.nextUrl.searchParams.get("equipment");
  if (!equipment) {
    return NextResponse.json({ candidates: rcaCandidates() });
  }
  const result = await runRca(equipment);
  if (!result) return NextResponse.json({ error: "unknown equipment" }, { status: 404 });
  return NextResponse.json(result);
}
