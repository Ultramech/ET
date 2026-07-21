import fs from "fs";
import path from "path";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { Role } from "./session";

// ---------------------------------------------------------------------------
// User store — real accounts with scrypt-hashed passwords, persisted to disk
// (data/users.json). This is the swap-point for a hosted DB: replace the
// load/save pair with Supabase/Postgres queries and every route keeps working,
// since callers only see the exported functions.
// ---------------------------------------------------------------------------

export interface UserRecord {
  username: string;
  passwordHash: string; // hex scrypt
  salt: string; // hex
  role: Role;
  displayName: string;
  title: string;
  createdAt: string; // ISO
}

export type PublicUser = Omit<UserRecord, "passwordHash" | "salt">;

function resolveFile(): string {
  const primary = path.join(process.cwd(), "data");
  try {
    fs.mkdirSync(primary, { recursive: true });
    fs.accessSync(primary, fs.constants.W_OK);
    return path.join(primary, "users.json");
  } catch {
    const tmp = path.join("/tmp", "Nexus-data");
    fs.mkdirSync(tmp, { recursive: true });
    return path.join(tmp, "users.json");
  }
}

const FILE = resolveFile();

function hash(password: string, salt: string): string {
  return scryptSync(password, salt, 32).toString("hex");
}

function makeUser(
  username: string,
  password: string,
  role: Role,
  displayName: string,
  title: string
): UserRecord {
  const salt = randomBytes(16).toString("hex");
  return {
    username,
    salt,
    passwordHash: hash(password, salt),
    role,
    displayName,
    title,
    createdAt: new Date().toISOString(),
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __Nexus_users: UserRecord[] | undefined;
}

function seedUsers(): UserRecord[] {
  return [
    makeUser("admin", "admin", "admin", "A. Mehta", "Knowledge Manager"),
    makeUser("user", "user", "user", "R. Sharma", "Field Engineer"),
  ];
}

function load(): UserRecord[] {
  if (globalThis.__Nexus_users) return globalThis.__Nexus_users;
  try {
    if (fs.existsSync(FILE)) {
      const data = JSON.parse(fs.readFileSync(FILE, "utf-8")) as UserRecord[];
      if (Array.isArray(data) && data.length) {
        globalThis.__Nexus_users = data;
        return data;
      }
    }
  } catch (e) {
    console.error("[users] load failed:", (e as Error).message);
  }
  const seeded = seedUsers();
  globalThis.__Nexus_users = seeded;
  save();
  return seeded;
}

function save() {
  try {
    fs.writeFileSync(FILE, JSON.stringify(globalThis.__Nexus_users ?? [], null, 2), "utf-8");
  } catch (e) {
    console.error("[users] save failed:", (e as Error).message);
  }
}

function toPublic(u: UserRecord): PublicUser {
  return {
    username: u.username,
    role: u.role,
    displayName: u.displayName,
    title: u.title,
    createdAt: u.createdAt,
  };
}

export function getUser(username: string): PublicUser | null {
  const u = load().find((x) => x.username === username.toLowerCase().trim());
  return u ? toPublic(u) : null;
}

export function verifyCredentials(username: string, password: string): PublicUser | null {
  const u = load().find((x) => x.username === username.toLowerCase().trim());
  if (!u) return null;
  const candidate = Buffer.from(hash(password, u.salt), "hex");
  const stored = Buffer.from(u.passwordHash, "hex");
  if (candidate.length !== stored.length || !timingSafeEqual(candidate, stored)) return null;
  return toPublic(u);
}

export function listUsers(): PublicUser[] {
  return load().map(toPublic);
}

const USERNAME_RE = /^[a-z0-9_-]{3,20}$/;

export function createUser(input: {
  username: string;
  password: string;
  role?: Role;
  displayName?: string;
  title?: string;
}): { user?: PublicUser; error?: string } {
  const username = input.username.toLowerCase().trim();
  if (!USERNAME_RE.test(username))
    return { error: "Username must be 3–20 chars: a-z, 0-9, - or _" };
  if (input.password.length < 4) return { error: "Password must be at least 4 characters" };
  const users = load();
  if (users.some((u) => u.username === username)) return { error: "Username already taken" };
  const user = makeUser(
    username,
    input.password,
    input.role ?? "user",
    (input.displayName || username).trim().slice(0, 60),
    (input.title || "Field Engineer").trim().slice(0, 60)
  );
  users.push(user);
  save();
  return { user: toPublic(user) };
}

export function updateUserRole(username: string, role: Role): { ok?: true; error?: string } {
  const users = load();
  const u = users.find((x) => x.username === username.toLowerCase().trim());
  if (!u) return { error: "User not found" };
  if (u.role === "admin" && role !== "admin" && users.filter((x) => x.role === "admin").length === 1)
    return { error: "Cannot demote the last admin" };
  u.role = role;
  save();
  return { ok: true };
}

export function deleteUser(username: string, actor: string): { ok?: true; error?: string } {
  const users = load();
  const name = username.toLowerCase().trim();
  const u = users.find((x) => x.username === name);
  if (!u) return { error: "User not found" };
  if (name === actor) return { error: "You cannot delete your own account" };
  if (u.role === "admin" && users.filter((x) => x.role === "admin").length === 1)
    return { error: "Cannot delete the last admin" };
  globalThis.__Nexus_users = users.filter((x) => x.username !== name);
  save();
  return { ok: true };
}
