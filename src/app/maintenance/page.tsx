"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { RcaResult } from "@/lib/types";
import { Card, Badge, SectionTitle } from "@/components/ui";
import { Wrench, Play, GitBranch, Target, CheckCircle2, FileText, Loader2 } from "lucide-react";

interface Candidate {
  id: string;
  label: string;
  failures: string[];
}

export default function MaintenancePage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [rca, setRca] = useState<RcaResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/rca")
      .then((r) => r.json())
      .then((d) => setCandidates(d.candidates ?? []));
  }, []);

  async function run(id: string) {
    setActive(id);
    setLoading(true);
    setRca(null);
    const res = await fetch(`/api/rca?equipment=${encodeURIComponent(id)}`);
    const data = await res.json();
    setRca(data);
    setLoading(false);
  }

  return (
    <div className="space-y-5">
      <SectionTitle
        icon={<Wrench size={18} />}
        title="Maintenance Intelligence & RCA"
        desc="The agent fuses work orders, inspection findings, incident reports and OEM limits — records that live in four different systems — into a single Root Cause Analysis no individual could assemble alone."
      />

      {/* Candidates */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {candidates.map((c) => (
          <Card key={c.id} className={`p-4 ${active === c.id ? "border-cyan-400/40" : ""}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold">{c.label.split("·")[0].trim()}</div>
                <div className="text-xs text-[var(--color-muted)]">{c.label.split("·")[1]?.trim()}</div>
              </div>
              <Badge color="danger">{c.failures.length} modes</Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {c.failures.map((f) => (
                <Badge key={f} color="warn">{f}</Badge>
              ))}
            </div>
            <button
              onClick={() => run(c.id)}
              disabled={loading && active === c.id}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-cyan-400 py-2 text-xs font-medium text-black transition hover:bg-cyan-300 disabled:opacity-60"
            >
              {loading && active === c.id ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              Run Root Cause Analysis
            </button>
          </Card>
        ))}
      </div>

      {/* RCA result */}
      {loading && !rca && (
        <Card className="p-6 text-center text-sm text-[var(--color-muted)]">
          <Loader2 className="mx-auto mb-2 animate-spin text-cyan-700 dark:text-cyan-300" />
          Fusing work orders, inspections and incidents across systems…
        </Card>
      )}

      {rca && (
        <div className="space-y-4 fade-up">
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge color="danger">Problem</Badge>
              <h2 className="text-sm font-semibold">{rca.problem}</h2>
              <span className="ml-auto text-xs text-[var(--color-muted)]">
                confidence {Math.round(rca.confidence * 100)}%
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="text-xs text-[var(--color-muted)]">Fused from:</span>
              {rca.connectedSources.map((s) => (
                <Link key={s} href={`/documents?id=${s}`}>
                  <Badge color="muted" className="hover:bg-white/10">{s}</Badge>
                </Link>
              ))}
            </div>
          </Card>

          {/* 5 Whys chain */}
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <GitBranch size={16} className="text-cyan-700 dark:text-cyan-300" /> 5-Whys Analysis
            </div>
            <ol className="relative space-y-3 border-l border-[var(--color-border)] pl-5">
              {rca.whys.map((w, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[26px] grid h-5 w-5 place-items-center rounded-full border border-cyan-400/40 bg-[var(--color-panel)] text-[10px] font-semibold text-cyan-700 dark:text-cyan-300">
                    {i + 1}
                  </span>
                  <div className="text-xs font-medium text-cyan-700 dark:text-cyan-200">{w.question}</div>
                  <div className="mt-0.5 text-sm text-[var(--color-fg)]/90">{w.answer}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {w.evidence.map((e) => (
                      <Link key={e} href={`/documents?id=${e}`}>
                        <Badge color="muted" className="text-[10px] hover:bg-white/10">
                          <FileText size={9} /> {e}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          {/* Root cause + recommendation */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-rose-400/30 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-200">
                <Target size={16} /> Root Cause
              </div>
              <p className="text-sm text-[var(--color-fg)]/90">{rca.rootCause}</p>
            </Card>
            <Card className="border-emerald-400/30 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-200">
                <CheckCircle2 size={16} /> Recommended Permanent Fix
              </div>
              <p className="text-sm text-[var(--color-fg)]/90">{rca.recommendation}</p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
