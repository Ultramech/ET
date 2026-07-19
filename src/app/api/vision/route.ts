import { NextRequest, NextResponse } from "next/server";
import { extractPid, ingestPid } from "@/lib/vision/pid";
import { caps } from "@/lib/ai/client";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_IMG = 12 * 1024 * 1024;

export async function POST(req: NextRequest) {
  if (!caps().vision) {
    return NextResponse.json(
      { error: "Vision requires a Gemini key (multimodal). Set GEMINI_API_KEY." },
      { status: 503 }
    );
  }
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const { imageUrl, imageBase64, mimeType, ingest } = body ?? {};

  let b64 = imageBase64 as string | undefined;
  let mime = (mimeType as string) || "image/png";
  let sourceUrl: string | undefined;

  try {
    if (!b64 && imageUrl) {
      if (!/^https?:\/\//.test(imageUrl)) return NextResponse.json({ error: "invalid imageUrl" }, { status: 400 });
      const res = await fetch(imageUrl, { headers: { "User-Agent": "SutradharBot/1.0" }, signal: AbortSignal.timeout(30000) });
      if (!res.ok) return NextResponse.json({ error: `image fetch HTTP ${res.status}` }, { status: 422 });
      mime = res.headers.get("content-type") || mime;
      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.byteLength > MAX_IMG) return NextResponse.json({ error: "image too large" }, { status: 413 });
      b64 = Buffer.from(buf).toString("base64");
      sourceUrl = imageUrl;
    }
    if (!b64) return NextResponse.json({ error: "imageUrl or imageBase64 required" }, { status: 400 });

    const started = Date.now();
    const extraction = await extractPid(b64, mime);
    if (!extraction) return NextResponse.json({ error: "vision extraction failed" }, { status: 502 });

    if (ingest) {
      const result = await ingestPid(extraction, sourceUrl);
      return NextResponse.json({ ...result, latencyMs: Date.now() - started });
    }
    return NextResponse.json({ extraction, latencyMs: Date.now() - started });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
