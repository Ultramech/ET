import { NextRequest, NextResponse } from "next/server";
import { verifyToken, SESSION_COOKIE } from "@/lib/session";
import { getUser } from "@/lib/users";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await verifyToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ authenticated: false }, { status: 401 });
  const profile = getUser(session.username);
  return NextResponse.json({
    authenticated: true,
    username: session.username,
    role: session.role,
    displayName: profile?.displayName ?? session.username,
    title: profile?.title ?? "",
    createdAt: profile?.createdAt,
  });
}
