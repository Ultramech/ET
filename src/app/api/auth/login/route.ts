import { NextRequest, NextResponse } from "next/server";
import { createToken, SESSION_COOKIE, SESSION_MAX_AGE, COOKIE_OPTS } from "@/lib/session";
import { verifyCredentials } from "@/lib/users";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const { username, password } = body ?? {};
  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "username and password required" }, { status: 400 });
  }
  const user = verifyCredentials(username, password);
  if (!user) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }
  const token = await createToken(user.username, user.role);
  const res = NextResponse.json(user);
  res.cookies.set(SESSION_COOKIE, token, { ...COOKIE_OPTS, maxAge: SESSION_MAX_AGE });
  return res;
}
