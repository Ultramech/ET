"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { GraphNode, GraphEdge } from "@/lib/types";
import { GraphCanvas } from "@/components/GraphCanvas";
import { Card, Badge, SectionTitle } from "@/components/ui";
import { ENTITY_STYLE } from "@/lib/ontology";
import { Share2, Search, X, FileText, Crosshair, Loader2 } from "lucide-react";

interface View {
  nodes: GraphNode[];
  edges: GraphEdge[];
  total?: { nodes: number; edges: number };
}

function GraphInner() {
  const params = useSearchParams();
  const focusParam = params.get("focus");
  const [view, setView] = useState<View>({ nodes: [], edges: [] });
  const [focus, setFocus] = useState<string | null>(focusParam);
  const [depth, setDepth] = useState(2);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<{ id: string; label: string; type: GraphNode["type"] }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (focusParam) setFocus(focusParam);
  }, [focusParam]);

  // server-driven view — scales past the render cap
  useEffect(() => {
    setLoading(true);
    const url = focus ? `/api/graph?focus=${encodeURIComponent(focus)}&depth=${depth}` : `/api/graph`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => setView(d))
      .finally(() => setLoading(false));
  }, [focus, depth]);

  // debounced server-side search over the whole graph
  useEffect(() => {
    if (!q.trim()) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/graph/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => setSuggestions(d.results ?? []));
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  const neighbours = useMemo(() => {
    if (!selected) return [];
    return view.edges
      .filter((e) => e.source === selected.id || e.target === selected.id)
      .map((e) => ({
        edge: e,
        other: e.source === selected.id ? e.target : e.source,
        dir: e.source === selected.id ? "→" : "←",
      }));
  }, [selected, view.edges]);

  return (
    <div className="space-y-4">
      <SectionTitle
        icon={<Share2 size={18} />}
        title="Knowledge Graph Explorer"
        desc="Visually explore how your equipment, manuals, and safety regulations are all connected."
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={15} className="absolute left-2.5 top-2.5 text-[var(--color-muted)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search any tag (P-101A, OISD, corrosion)…"
            className="h-9 w-64 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] pl-8 pr-3 text-sm outline-none focus:border-cyan-400/50"
          />
          {suggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-80 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] p-1 shadow-xl">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setFocus(s.id);
                    setQ("");
                    setSuggestions([]);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-white/5"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: ENTITY_STYLE[s.type].color }} />
                  <span className="truncate">{s.label}</span>
                  <Badge color="muted" className="ml-auto shrink-0">{s.type}</Badge>
                </button>
              ))}
            </div>
          )}
        </div>

        {focus && (
          <Badge color="accent" className="gap-1.5">
            <Crosshair size={12} /> {focus}
            <button onClick={() => setFocus(null)} className="ml-1">
              <X size={12} />
            </button>
          </Badge>
        )}
        {focus && (
          <div className="flex items-center gap-1 text-xs text-[var(--color-muted)]">
            depth
            {[1, 2, 3].map((d) => (
              <button
                key={d}
                onClick={() => setDepth(d)}
                className={`h-7 w-7 rounded-md border text-xs ${
                  depth === d ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-700 dark:text-cyan-300" : "border-[var(--color-border)]"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        )}
        <span className="ml-auto flex items-center gap-2 text-xs text-[var(--color-muted)]">
          {loading && <Loader2 size={12} className="animate-spin" />}
          {view.nodes.length} shown
          {view.total && !focus ? ` · ${view.total.nodes} total in graph` : ""}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <GraphCanvas
          nodes={view.nodes}
          edges={view.edges}
          highlight={focus ? view.nodes.map((n) => n.id) : []}
          onSelect={setSelected}
          height={560}
        />

        <Card className="h-fit p-4">
          {!selected ? (
            <div className="py-8 text-center text-xs text-[var(--color-muted)]">
              {focus ? "Click a node to inspect its cross-document connections." : "Showing the operating-plant neighbourhood. Search or click to explore the full corpus graph."}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: ENTITY_STYLE[selected.type].color }} />
                <Badge color="muted">{selected.type}</Badge>
              </div>
              <h3 className="text-sm font-semibold leading-tight">{selected.label}</h3>

              {selected.meta && (
                <div className="space-y-1 rounded-lg bg-[var(--color-panel-2)] p-2.5 text-xs">
                  {Object.entries(selected.meta).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2">
                      <span className="text-[var(--color-muted)]">{k}</span>
                      <span className="text-right font-medium">{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <div className="mb-1.5 text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
                  Connections in view ({neighbours.length})
                </div>
                <div className="max-h-72 space-y-1 overflow-y-auto">
                  {neighbours.map(({ edge, other, dir }, i) => {
                    const node = view.nodes.find((n) => n.id === other);
                    return (
                      <button
                        key={i}
                        onClick={() => setFocus(other)}
                        className="flex w-full min-w-0 items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-panel-2)] px-2 py-1.5 text-left text-xs hover:border-cyan-400/40"
                      >
                        <span className="shrink-0 text-[10px] font-medium text-cyan-700 dark:text-cyan-300">{edge.type}</span>
                        <span className="shrink-0 text-[var(--color-muted)]">{dir}</span>
                        <span className="flex-1">{node?.label ?? other}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => setFocus(selected.id)}
                className="flex w-full items-center justify-center gap-1 rounded-lg border border-cyan-400/30 py-2 text-xs text-cyan-700 dark:text-cyan-300 hover:bg-cyan-400/10"
              >
                <Crosshair size={13} /> Focus this neighbourhood
              </button>
              {selected.type === "Document" && (
                <Link
                  href={`/documents?id=${selected.id}`}
                  className="flex items-center justify-center gap-1 rounded-lg border border-[var(--color-border)] py-2 text-xs text-[var(--color-muted)] hover:text-cyan-700 dark:text-cyan-300"
                >
                  <FileText size={13} /> Open document
                </Link>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function GraphPage() {
  return (
    <Suspense fallback={<div className="text-sm text-[var(--color-muted)]">Loading graph…</div>}>
      <GraphInner />
    </Suspense>
  );
}
