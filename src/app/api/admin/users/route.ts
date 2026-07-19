import { NextRequest, NextResponse } from "next/server";
import { verifyToken, SESSION_COOKIE, type Role } from "@/lib/session";
import { listUsers, createUser, deleteUser, updateUserRole } from "@/lib/users";

export const runtime = "nodejs";

// Admin-only (enforced by the proxy): team management.

export async function GET() {
  return NextResponse.json({ users: listUsers() });
}

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const { username, password, role, displayName, title } = body ?? {};
  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "username and password required" }, { status: 400 });
  }
  const result = createUser({
    username,
    password,
    role: role === "admin" ? "admin" : "user",
    displayName,
    title,
  });
  if (result.error || !result.user) {
    return NextResponse.json({ error: result.error ?? "create failed" }, { status: 400 });
  }
  return NextResponse.json(result.user, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const { username, role } = body ?? {};
  if (typeof username !== "string" || (role !== "admin" && role !== "user")) {
    return NextResponse.json({ error: "username and role (admin|user) required" }, { status: 400 });
  }
  const result = updateUserRole(username, role as Role);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username) return NextResponse.json({ error: "username required" }, { status: 400 });
  const session = await verifyToken(req.cookies.get(SESSION_COOKIE)?.value);
  const result = deleteUser(username, session?.username ?? "");
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
