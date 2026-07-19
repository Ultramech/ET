"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, Badge, StatTile, SectionTitle } from "@/components/ui";
import {
  Gauge,
  Upload,
  FileText,
  ScanEye,
  RefreshCcw,
  Database,
  RotateCcw,
  Loader2,
  Cpu,
  ArrowRight,
  Users,
  ShieldCheck,
  HardHat,
  Trash2,
  UserPlus,
} from "lucide-react";

interface Stats {
  documents: number;
  chunks: number;
  embeddedChunks: number;
  nodes: number;
  edges: number;
  realIngested: number;
  docsByType: Record<string, number>;
  docsByOrigin: Record<string, number>;
  llm: boolean;
  ai: { provider: string; model: string; vision: boolean; embeddings: boolean };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const refresh = useCallback(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);
  useEffect(refresh, [refresh]);

  const push = (m: string) =>
    setLog((l) => [`${new Date().toLocaleTimeString()} — ${m}`, ...l].slice(0, 8));

  async function run(name: string, url: string, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(name);
    try {
      const res = await fetch(url, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (name === "reindex") push(`Graph rebuilt — ${data.nodes} nodes, ${data.edges} edges.`);
      else if (name === "embed")
        push(`Embeddings: +${data.embedded} chunks embedded, ${data.remaining} still pending.`);
      else if (name === "reset") push("Corpus reset to the pristine seed plant.");
      else push(`${name}: done.`);
      refresh();
    } catch (e) {
      push(`${name} failed: ${(e as Error).message}`);
    }
    setBusy(null);
  }

  return (
    <div className="space-y-5">
      <SectionTitle
        icon={<Gauge size={18} />}
        title="Admin Dashboard"
        desc="Knowledge-base operations: corpus health, AI engine status, ingestion and maintenance controls. Only administrators see this page."
      />

      {/* Corpus health */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatTile label="Documents" value={stats?.documents ?? "…"} sub={`${stats?.realIngested ?? 0} real ingested`} />
        <StatTile label="Chunks indexed" value={stats?.chunks ?? "…"} sub="BM25 searchable" accent="text-emerald-700 dark:text-emerald-300" />
        <StatTile
          label="Embedded"
          value={stats?.embeddedChunks ?? "…"}
          sub="semantic vectors"
          accent="text-purple-300"
        />
        <StatTile label="Graph nodes" value={stats?.nodes ?? "…"} sub="entities + docs" accent="text-cyan-700 dark:text-cyan-300" />
        <StatTile label="Graph edges" value={stats?.edges ?? "…"} sub="typed links" accent="text-amber-700 dark:text-amber-300" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* AI engine */}
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Cpu size={16} className="text-cyan-700 dark:text-cyan-300" /> AI engine
          </div>
          {stats ? (
            <div className="space-y-2 text-sm">
              <Row k="Provider" v={<Badge color={stats.llm ? "green" : "warn"}>{stats.ai.provider}</Badge>} />
              <Row k="Model" v={<span className="font-mono text-xs">{stats.ai.model}</span>} />
              <Row
                k="Vision (P&ID digitisation)"
                v={<Badge color={stats.ai.vision ? "green" : "warn"}>{stats.ai.vision ? "available" : "needs Gemini key"}</Badge>}
              />
              <Row
                k="Embeddings (semantic search)"
                v={<Badge color={stats.ai.embeddings ? "green" : "warn"}>{stats.ai.embeddings ? "available" : "unavailable"}</Badge>}
              />
            </div>
          ) : (
            <Loader2 className="animate-spin text-[var(--color-muted)]" size={18} />
          )}
        </Card>

        {/* Maintenance controls */}
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Database size={16} className="text-emerald-700 dark:text-emerald-300" /> Corpus maintenance
          </div>
          <div className="space-y-2">
            <ControlButton
              icon={<RefreshCcw size={14} />}
              label="Rebuild knowledge graph"
              desc="Re-runs entity extraction over every stored chunk with the current ontology."
              busy={busy === "reindex"}
              disabled={!!busy}
              onClick={() => run("reindex", "/api/admin/reindex")}
            />
            <ControlButton
              icon={<Database size={14} />}
              label="Backfill embeddings"
              desc="Embeds not-yet-vectorised chunks so semantic retrieval covers more of the corpus."
              busy={busy === "embed"}
              disabled={!!busy}
              onClick={() => run("embed", "/api/admin/embed")}
            />
            <ControlButton
              icon={<RotateCcw size={14} />}
              label="Reset demo corpus"
              desc="Discards all ingested documents and restores the pristine seed plant."
              danger
              busy={busy === "reset"}
              disabled={!!busy}
              onClick={() =>
                run(
                  "reset",
                  "/api/admin/reset",
                  "Reset the corpus to the seed plant? All ingested documents will be discarded."
                )
              }
            />
          </div>
          {log.length > 0 && (
            <div className="mt-3 space-y-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] p-2.5">
              {log.map((l, i) => (
                <div key={i} className="text-[11px] text-[var(--color-muted)]">{l}</div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Corpus composition */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 text-sm font-semibold">Documents by type</div>
          <BarList data={stats?.docsByType ?? {}} />
        </Card>
        <Card className="p-4">
          <div className="mb-3 text-sm font-semibold">Documents by origin</div>
          <BarList
            data={stats?.docsByOrigin ?? {}}
            labels={{ seed: "seed plant", url: "ingested from URL", vision: "P&ID vision", upload: "uploaded" }}
          />
        </Card>
      </div>

      <UserManagement />

      {/* Admin actions */}
      <div className="grid gap-3 md:grid-cols-3">
        <ActionCard
          href="/ingest"
          icon={<Upload size={18} />}
          title="Ingest documents"
          desc="Paste, upload or pull from a URL — chunked, extracted and auto-linked live."
        />
        <ActionCard
          href="/ingest#drawing"
          icon={<ScanEye size={18} />}
          title="Digitise a P&ID drawing"
          desc="Computer vision reads an engineering drawing into tags, instruments and topology."
        />
        <ActionCard
          href="/documents"
          icon={<FileText size={18} />}
          title="Manage documents"
          desc="Browse the corpus; delete stale or mistakenly ingested documents."
        />
      </div>
    </div>
  );
}

interface TeamUser {
  username: string;
  role: "admin" | "user";
  displayName: string;
  title: string;
  createdAt: string;
}

function UserManagement() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [me, setMe] = useState<string>("");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", displayName: "", title: "", role: "user" });
  const [busy, setBusy] = useState(false);

  function refresh() {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []));
  }
  useEffect(() => {
    refresh();
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setMe(d.username))
      .catch(() => {});
  }, []);

  async function call(method: string, url: string, body?: unknown) {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      refresh();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Users size={16} className="text-amber-700 dark:text-amber-300" /> Team &amp; roles
        <button
          onClick={() => setAdding((v) => !v)}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-muted)] transition hover:border-cyan-400/40 hover:text-cyan-700 dark:text-cyan-200"
        >
          <UserPlus size={13} /> Add user
        </button>
      </div>

      {adding && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (await call("POST", "/api/admin/users", form)) {
              setForm({ username: "", password: "", displayName: "", title: "", role: "user" });
              setAdding(false);
            }
          }}
          className="mb-3 grid gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] p-3 sm:grid-cols-2 lg:grid-cols-5"
        >
          <input
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="username"
            className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-2.5 text-xs outline-none focus:border-cyan-400/50"
          />
          <input
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="password"
            type="password"
            className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-2.5 text-xs outline-none focus:border-cyan-400/50"
          />
          <input
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            placeholder="display name"
            className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-2.5 text-xs outline-none focus:border-cyan-400/50"
          />
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="title"
            className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-2.5 text-xs outline-none focus:border-cyan-400/50"
          />
          <div className="flex gap-2">
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="h-9 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-2 text-xs outline-none"
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
            <button
              type="submit"
              disabled={busy || !form.username || !form.password}
              className="rounded-lg bg-cyan-400 px-3 text-xs font-medium text-black disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </form>
      )}
      {error && <p className="mb-2 text-xs text-rose-700 dark:text-rose-300">{error}</p>}

      <div className="space-y-1.5">
        {users.map((u) => (
          <div
            key={u.username}
            className="flex items-center gap-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 py-2"
          >
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border ${
                u.role === "admin"
                  ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300"
                  : "border-cyan-400/40 bg-cyan-400/10 text-cyan-700 dark:text-cyan-300"
              }`}
            >
              {u.role === "admin" ? <ShieldCheck size={13} /> : <HardHat size={13} />}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-xs font-medium">
                {u.displayName} <span className="text-[var(--color-muted)]">@{u.username}</span>
                {u.username === me && <Badge color="accent" className="ml-1.5">you</Badge>}
              </div>
              <div className="truncate text-[10px] text-[var(--color-muted)]">
                {u.title} · joined {new Date(u.createdAt).toLocaleDateString()}
              </div>
            </div>
            <select
              value={u.role}
              disabled={busy}
              onChange={(e) => call("PATCH", "/api/admin/users", { username: u.username, role: e.target.value })}
              title="Role (applies at next sign-in)"
              className="h-7 rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-1.5 text-[11px] outline-none"
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
            <button
              disabled={busy || u.username === me}
              onClick={() => {
                if (window.confirm(`Delete account @${u.username}?`)) call("DELETE", `/api/admin/users?username=${encodeURIComponent(u.username)}`);
              }}
              title={u.username === me ? "You cannot delete yourself" : "Delete user"}
              className="rounded-md p-1.5 text-[var(--color-muted)] transition hover:bg-rose-400/10 hover:text-rose-700 dark:text-rose-300 disabled:opacity-30"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-[var(--color-muted)]">
        Role changes take effect at the user&apos;s next sign-in. Passwords are scrypt-hashed at rest.
      </p>
    </Card>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-[var(--color-muted)]">{k}</span>
      {v}
    </div>
  );
}

function ControlButton({
  icon,
  label,
  desc,
  onClick,
  busy,
  disabled,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  onClick: () => void;
  busy: boolean;
  disabled: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition disabled:opacity-50 ${
        danger
          ? "border-rose-400/25 hover:bg-rose-400/10"
          : "border-[var(--color-border)] hover:border-cyan-400/40 hover:bg-white/5"
      }`}
    >
      <span className={`mt-0.5 ${danger ? "text-rose-700 dark:text-rose-300" : "text-cyan-700 dark:text-cyan-300"}`}>
        {busy ? <Loader2 size={14} className="animate-spin" /> : icon}
      </span>
      <span>
        <span className="block text-xs font-medium">{label}</span>
        <span className="block text-[11px] text-[var(--color-muted)]">{desc}</span>
      </span>
    </button>
  );
}

function BarList({ data, labels = {} }: { data: Record<string, number>; labels?: Record<string, string> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  if (!entries.length)
    return <div className="text-xs text-[var(--color-muted)]">No data yet.</div>;
  return (
    <div className="space-y-1.5">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-center gap-2 text-xs">
          <span className="w-32 shrink-0 truncate text-[var(--color-muted)]">{labels[k] ?? k}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400/70 to-emerald-400/70"
              style={{ width: `${(v / max) * 100}%` }}
            />
          </div>
          <span className="w-10 text-right tabular-nums">{v}</span>
        </div>
      ))}
    </div>
  );
}

function ActionCard({ href, icon, title, desc }: { href: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link href={href}>
      <Card className="group h-full p-4 transition hover:border-cyan-400/40 hover:bg-[var(--color-panel-2)]">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] p-2 text-cyan-700 dark:text-cyan-300 w-fit">
          {icon}
        </div>
        <div className="mt-3 flex items-center gap-1 text-sm font-semibold">
          {title}
          <ArrowRight size={14} className="opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">{desc}</p>
      </Card>
    </Link>
  );
}
