// ---------------------------------------------------------------------------
// Demo-grade signed-cookie sessions for the admin/user role split.
// HMAC-SHA256 via Web Crypto so the same code verifies tokens in the proxy
// and in Node route handlers. Credentials live in the user store (users.ts);
// swap that for a hosted DB / SSO and this session layer stays identical.
// ---------------------------------------------------------------------------

export type Role = "admin" | "user";

export interface Session {
  username: string;
  role: Role;
  exp: number; // unix seconds
}

export const SESSION_COOKIE = "sutradhar_session";
const SESSION_HOURS = 8;

// Signing secret comes from the environment. The fallback keeps a keyless
// clone bootable, but any real deployment must set AUTH_SECRET — we warn loudly.
const SECRET = process.env.AUTH_SECRET || "sutradhar-demo-secret-change-me";
if (!process.env.AUTH_SECRET) {
  console.warn("[auth] AUTH_SECRET not set — using an insecure development fallback. Set it in .env.local.");
}

/** Cookie attributes shared by login/register/logout. Secure in production. */
export const COOKIE_OPTS = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array | null {
  try {
    const pad = s.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(pad + "=".repeat((4 - (pad.length % 4)) % 4));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmac(data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}

export async function createToken(username: string, role: Role): Promise<string> {
  const payload: Session = {
    username,
    role,
    exp: Math.floor(Date.now() / 1000) + SESSION_HOURS * 3600,
  };
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = b64url(await hmac(body));
  return `${body}.${sig}`;
}

export async function verifyToken(token: string | undefined | null): Promise<Session | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = b64url(await hmac(body));
  if (sig !== expected) return null;
  const raw = fromB64url(body);
  if (!raw) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(raw)) as Session;
    if (!payload.username || !payload.role) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = SESSION_HOURS * 3600;
