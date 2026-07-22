import { NextRequest, NextResponse } from "next/server";
import { ingestDocument } from "@/lib/ingest";
import { warmStore } from "@/lib/store";
import type { DocType } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  await warmStore();
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const { title, type, text, unit, author, date } = body ?? {};
  if (!title || typeof title !== "string" || !text || typeof text !== "string") {
    return NextResponse.json({ error: "title and text (strings) required" }, { status: 400 });
  }
  if (text.length > 2_000_000) {
    return NextResponse.json({ error: "text too large (2MB cap)" }, { status: 413 });
  }
  try {
    const result = await ingestDocument(
      { title, type: type as DocType | undefined, text, unit, author, date, origin: "upload" },
      { useLLM: true, useEmbeddings: true }
    );
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
