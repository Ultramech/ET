import { NextRequest, NextResponse } from "next/server";
import { createToken, SESSION_COOKIE, SESSION_MAX_AGE, COOKIE_OPTS } from "@/lib/session";
import { createUser } from "@/lib/users";

export const runtime = "nodejs";

// Self-service signup. New accounts always get the "user" role — only an
// existing admin can promote them (POST/PATCH /api/admin/users).
export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const { username, password, displayName, title } = body ?? {};
  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "username and password required" }, { status: 400 });
  }
  const result = createUser({ username, password, displayName, title, role: "user" });
  if (result.error || !result.user) {
    return NextResponse.json({ error: result.error ?? "signup failed" }, { status: 400 });
  }
  const token = await createToken(result.user.username, result.user.role);
  const res = NextResponse.json(result.user, { status: 201 });
  res.cookies.set(SESSION_COOKIE, token, { ...COOKIE_OPTS, maxAge: SESSION_MAX_AGE });
  return res;
}
