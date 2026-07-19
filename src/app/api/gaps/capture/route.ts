import { NextRequest, NextResponse } from "next/server";
import { captureGap } from "@/lib/gaps";
import { verifyToken, SESSION_COOKIE } from "@/lib/session";
import { getUser } from "@/lib/users";

export const runtime = "nodejs";
export const maxDuration = 60;

// Any signed-in user can capture knowledge — field engineers are exactly the
// people who hold the undocumented answers.
export async function POST(req: NextRequest) {
  const session = await verifyToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "authentication required" }, { status: 401 });
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const { id, text, title } = body ?? {};
  if (typeof id !== "string" || typeof text !== "string") {
    return NextResponse.json({ error: "id and text required" }, { status: 400 });
  }
  const profile = getUser(session.username);
  const result = await captureGap(id, {
    text,
    title,
    capturedBy: profile?.displayName ?? session.username,
  });
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
