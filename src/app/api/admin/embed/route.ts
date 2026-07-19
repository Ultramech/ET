import { NextRequest, NextResponse } from "next/server";
import { backfillEmbeddings } from "@/lib/embed-backfill";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const seedOnly = req.nextUrl.searchParams.get("all") !== "1";
  const result = await backfillEmbeddings({ seedOnly });
  return NextResponse.json(result);
}
