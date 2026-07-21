"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Badge, SectionTitle, StatTile } from "@/components/ui";
import {
  BrainCircuit,
  Loader2,
  Sparkles,
  Trash2,
  CheckCircle2,
  MessageCircleQuestion,
  PenLine,
} from "lucide-react";

interface Gap {
  id: string;
  question: string;
  askedBy: string;
  createdAt: string;
  timesAsked: number;
  status: "open" | "captured";
  capturedBy?: string;
  capturedAt?: string;
  capturedDocId?: string;
}

export default function GapsPage() {
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [capturing, setCapturing] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function refresh() {
    fetch("/api/gaps")
      .then((r) => r.json())
      .then((d) => setGaps(d.gaps ?? []));
  }
  useEffect(() => {
    refresh();
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setIsAdmin(d?.role === "admin"))
      .catch(() => {});
  }, []);

  async function capture(id: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/gaps/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setCapturing(null);
      setText("");
      refresh();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  async function dismiss(id: string) {
    if (!window.confirm("Dismiss this knowledge gap?")) return;
    await fetch(`/api/gaps?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    refresh();
  }

  const open = gaps.filter((g) => g.status === "open");
  const captured = gaps.filter((g) => g.status === "captured");

  return (
    <div className="space-y-5">
      <SectionTitle
        icon={<BrainCircuit size={18} />}
        title="Knowledge Gaps — Capture It Before It Retires"
        desc="Every question the copilot couldn't answer from the corpus lands here automatically. If you hold that knowledge, capture it — your answer becomes a cited, searchable document and the next person who asks gets a real answer. This is how the brain learns what the organisation is about to lose."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatTile label="Open gaps" value={open.length} sub="waiting for an expert" accent="text-rose-700 dark:text-rose-300" />
        <StatTile label="Knowledge captured" value={captured.length} sub="fed back into the brain" accent="text-emerald-700 dark:text-emerald-300" />
        <StatTile
          label="Most asked"
          value={Math.max(0, ...gaps.map((g) => g.timesAsked))}
          sub="times for one question"
          accent="text-amber-700 dark:text-amber-300"
        />
      </div>

      {open.length === 0 && captured.length === 0 && (
        <Card className="p-8 text-center text-sm text-[var(--color-muted)]">
          <MessageCircleQuestion className="mx-auto mb-2 opacity-40" />
          No knowledge gaps logged yet. When the copilot can&apos;t answer a question from the
          documents, it will appear here instead of being guessed at.
        </Card>
      )}

      {open.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
            Open — the brain doesn&apos;t know this yet ({open.length})
          </div>
          {open.map((g) => (
            <Card key={g.id} className="border-rose-400/20 p-4">
              <div className="flex flex-wrap items-start gap-2">
                <MessageCircleQuestion size={16} className="mt-0.5 shrink-0 text-rose-700 dark:text-rose-300" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{g.question}</div>
                  <div className="mt-0.5 text-[11px] text-[var(--color-muted)]">
                    Asked by {g.askedBy} · {new Date(g.createdAt).toLocaleDateString()}
                    {g.timesAsked > 1 && (
                      <Badge color="warn" className="ml-2">asked {g.timesAsked}×</Badge>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    onClick={() => {
                      setCapturing(capturing === g.id ? null : g.id);
                      setText("");
                      setError("");
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-emerald-400/30 px-2.5 py-1.5 text-xs text-emerald-700 dark:text-emerald-300 transition hover:bg-emerald-400/10"
                  >
                    <PenLine size={13} /> I know this
                  </button>
                  <button
                    onClick={() => dismiss(g.id)}
                    title="Dismiss gap"
                    className="rounded-lg border border-[var(--color-border)] p-1.5 text-[var(--color-muted)] transition hover:border-rose-400/40 hover:text-rose-700 dark:text-rose-300"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {capturing === g.id && (
                <div className="mt-3 space-y-2 rounded-lg border border-emerald-400/25 bg-emerald-400/[0.04] p-3 fade-up">
                  <p className="text-[11px] text-[var(--color-muted)]">
                    Write what you know — procedures, settings, history, who to ask. It will be
                    ingested as a document under your name, entity-linked into the graph, and cited
                    in future answers.
                  </p>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={4}
                    placeholder="e.g. The strainer on P-101B chokes during monsoon because… we always…"
                    className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] p-3 text-sm outline-none focus:border-emerald-400/50"
                  />
                  {error && <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p>}
                  <button
                    onClick={() => capture(g.id)}
                    disabled={busy || text.trim().length < 20}
                    className="flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 py-2 text-xs font-medium text-black transition hover:bg-emerald-300 disabled:opacity-50"
                  >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    Capture into the brain
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {captured.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
            Captured — tacit knowledge preserved ({captured.length})
          </div>
          {captured.map((g) => (
            <Card key={g.id} className="border-emerald-400/20 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-700 dark:text-emerald-300" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm">{g.question}</div>
                  <div className="mt-0.5 text-[11px] text-[var(--color-muted)]">
                    Captured by {g.capturedBy} ·{" "}
                    {g.capturedAt && new Date(g.capturedAt).toLocaleDateString()}
                  </div>
                </div>
                {g.capturedDocId && (
                  <Link href={`/documents?id=${g.capturedDocId}`}>
                    <Badge color="green" className="hover:bg-emerald-400/20">view document →</Badge>
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
