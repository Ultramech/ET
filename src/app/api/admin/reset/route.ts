import { NextResponse } from "next/server";
import { resetStore } from "@/lib/store";
import { invalidateIndex } from "@/lib/rag/retrieve";

export const runtime = "nodejs";

// Admin-only (enforced by the proxy). Restores the pristine seed corpus —
// used to reset the demo between runs. Ingested documents are discarded.
export async function POST() {
  resetStore();
  invalidateIndex();
  globalThis.__sutradhar_compliance = undefined;
  return NextResponse.json({ ok: true, message: "Corpus reset to seed state" });
}
