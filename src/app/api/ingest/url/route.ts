import { NextRequest, NextResponse } from "next/server";
import { fetchAndExtract, FetchError } from "@/lib/fetchers/url";
import { ingestDocument, classifyType } from "@/lib/ingest";
import { findDocBySourceUrl } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 120;

// Ingest a real document straight from a public URL (PDF or HTML).
export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const { url, type } = body ?? {};
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }
  // idempotent: skip if we already ingested this exact source
  const existing = findDocBySourceUrl(url);
  if (existing) {
    return NextResponse.json({
      duplicate: true,
      document: { id: existing.id, title: existing.title, type: existing.type, sourceUrl: url, chunks: existing.chunks.length },
      newEntities: [],
      newEdges: 0,
      linkedToExisting: [],
      embedded: false,
      llmEnriched: false,
    });
  }
  try {
    const fetched = await fetchAndExtract(url, { timeoutMs: 40000 });
    const result = await ingestDocument(
      {
        title: fetched.title,
        type: type || classifyType(fetched.title, fetched.text),
        text: fetched.text,
        sourceUrl: fetched.url,
        origin: "url",
        pages: fetched.pages,
        bytes: fetched.bytes,
      },
      { useLLM: true, useEmbeddings: true }
    );
    return NextResponse.json({ ...result, source: { url: fetched.url, pages: fetched.pages, contentType: fetched.contentType } });
  } catch (e) {
    const status = e instanceof FetchError ? 422 : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
