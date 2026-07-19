import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, SESSION_COOKIE } from "@/lib/session";

// ---------------------------------------------------------------------------
// Role gate for the whole app.
//   public:      /login, /api/auth/*
//   admin-only:  /admin*, /ingest, /api/ingest*, /api/vision, /api/admin/*,
//                any non-GET on /api/documents
//   any session: everything else
// Pages redirect to /login; APIs answer 401/403 JSON.
// ---------------------------------------------------------------------------

const ADMIN_PAGES = [/^\/admin(\/|$)/, /^\/ingest(\/|$)/];
const ADMIN_APIS = [/^\/api\/ingest(\/|$)/, /^\/api\/vision(\/|$)/, /^\/api\/admin(\/|$)/];

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  const isPublic = path === "/login" || path.startsWith("/api/auth/");
  if (isPublic) {
    // already signed in → bounce off the login page
    if (path === "/login") {
      const session = await verifyToken(req.cookies.get(SESSION_COOKIE)?.value);
      if (session) return NextResponse.redirect(new URL("/", req.nextUrl));
    }
    return NextResponse.next();
  }

  const session = await verifyToken(req.cookies.get(SESSION_COOKIE)?.value);
  const isApi = path.startsWith("/api/");

  if (!session) {
    if (isApi) return NextResponse.json({ error: "authentication required" }, { status: 401 });
    const login = new URL("/login", req.nextUrl);
    if (path !== "/") login.searchParams.set("from", path);
    return NextResponse.redirect(login);
  }

  const needsAdmin =
    (isApi ? ADMIN_APIS : ADMIN_PAGES).some((re) => re.test(path)) ||
    (path.startsWith("/api/documents") && req.method !== "GET") ||
    (path === "/api/gaps" && req.method === "DELETE");

  if (needsAdmin && session.role !== "admin") {
    if (isApi) return NextResponse.json({ error: "admin role required" }, { status: 403 });
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|svg|ico)$).*)"],
};
