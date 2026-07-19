import { NextRequest, NextResponse } from "next/server";
import { computeCompliance } from "@/lib/compliance";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const refresh = req.nextUrl.searchParams.get("refresh") === "1";
  const items = await computeCompliance(refresh);
  const summary = {
    total: items.length,
    compliant: items.filter((i) => i.status === "compliant").length,
    gap: items.filter((i) => i.status === "gap").length,
    atRisk: items.filter((i) => i.status === "at-risk").length,
    critical: items.filter((i) => i.severity === "critical" && i.status !== "compliant").length,
  };
  return NextResponse.json({ items, summary });
}
