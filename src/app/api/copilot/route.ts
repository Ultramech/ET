import { NextRequest, NextResponse } from "next/server";
import { answerQuery } from "@/lib/rag/copilot";
import { recordGapAsync } from "@/lib/gaps";
import { warmStore } from "@/lib/store";
import { verifyToken, SESSION_COOKIE } from "@/lib/session";
import { getUser } from "@/lib/users";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const query = body?.query;
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return NextResponse.json({ error: "query (non-empty string) required" }, { status: 400 });
  }
  if (query.length > 2000) {
    return NextResponse.json({ error: "query too long (2000 char cap)" }, { status: 413 });
  }
  try {
    await warmStore();
    const started = Date.now();
    const result = await answerQuery(query);

    // Unanswerable + not a safety refusal → this is missing organisational
    // knowledge. Log it in the gap register so someone can capture it.
    let gapId: string | undefined;
    if (result.band === "insufficient" && !result.refused) {
      const session = await verifyToken(req.cookies.get(SESSION_COOKIE)?.value);
      const asker = session ? getUser(session.username)?.displayName ?? session.username : "unknown";
      const gap = await recordGapAsync(query, asker);
      gapId = gap.id;
    }

    return NextResponse.json({ ...result, gapId, latencyMs: Date.now() - started });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

