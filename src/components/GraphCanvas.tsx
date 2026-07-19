"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { GraphNode, GraphEdge } from "@/lib/types";
import { ENTITY_STYLE } from "@/lib/ontology";

interface Sim {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fixed?: boolean;
}

export function GraphCanvas({
  nodes,
  edges,
  highlight = [],
  onSelect,
  height = 520,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  highlight?: string[];
  onSelect?: (node: GraphNode | null) => void;
  height?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<Map<string, Sim>>(new Map());
  const rafRef = useRef<number>(0);
  const dragRef = useRef<string | null>(null);
  const [, force] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState({ w: 800, h: height });
  const hi = new Set(highlight);

  // (re)seed simulation when the node set changes
  useEffect(() => {
    const w = wrapRef.current?.clientWidth ?? 800;
    setView({ w, h: height });
    const sim = simRef.current;
    const keep = new Set(nodes.map((n) => n.id));
    for (const id of sim.keys()) if (!keep.has(id)) sim.delete(id);
    nodes.forEach((n, i) => {
      if (!sim.has(n.id)) {
        const a = (i / Math.max(nodes.length, 1)) * Math.PI * 2;
        sim.set(n.id, {
          id: n.id,
          x: w / 2 + Math.cos(a) * (120 + (i % 5) * 30),
          y: height / 2 + Math.sin(a) * (120 + (i % 5) * 30),
          vx: 0,
          vy: 0,
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.map((n) => n.id).join(","), height]);

  // physics loop
  useEffect(() => {
    const step = () => {
      const sim = simRef.current;
      const arr = [...sim.values()];
      const cx = view.w / 2;
      const cy = view.h / 2;
      const REPULSE = 5200;
      const SPRING = 0.02;
      const LINK = 96;
      const CENTER = 0.006;
      const DAMP = 0.86;

      for (let i = 0; i < arr.length; i++) {
        const a = arr[i];
        if (a.id === dragRef.current) continue;
        for (let j = i + 1; j < arr.length; j++) {
          const b = arr[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 0.01) {
            dx = Math.random();
            dy = Math.random();
            d2 = 1;
          }
          const f = REPULSE / d2;
          const d = Math.sqrt(d2);
          const fx = (dx / d) * f;
          const fy = (dy / d) * f;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
        a.vx += (cx - a.x) * CENTER;
        a.vy += (cy - a.y) * CENTER;
      }
      for (const e of edges) {
        const a = sim.get(typeof e.source === "string" ? e.source : "");
        const b = sim.get(typeof e.target === "string" ? e.target : "");
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = (d - LINK) * SPRING;
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        if (a.id !== dragRef.current) {
          a.vx += fx;
          a.vy += fy;
        }
        if (b.id !== dragRef.current) {
          b.vx -= fx;
          b.vy -= fy;
        }
      }
      for (const n of arr) {
        if (n.id === dragRef.current) continue;
        n.vx *= DAMP;
        n.vy *= DAMP;
        n.x += Math.max(-8, Math.min(8, n.vx));
        n.y += Math.max(-8, Math.min(8, n.vy));
        n.x = Math.max(24, Math.min(view.w - 24, n.x));
        n.y = Math.max(24, Math.min(view.h - 24, n.y));
      }
      force((v) => v + 1);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edges, view.w, view.h]);

  const pointer = useCallback((clientX: number, clientY: number) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const onDown = (id: string) => (ev: React.PointerEvent) => {
    ev.preventDefault();
    dragRef.current = id;
    setSelected(id);
    onSelect?.(nodes.find((n) => n.id === id) ?? null);
    const move = (e: PointerEvent) => {
      const p = pointer(e.clientX, e.clientY);
      const s = simRef.current.get(id);
      if (s) {
        s.x = p.x;
        s.y = p.y;
        s.vx = s.vy = 0;
      }
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const sim = simRef.current;
  const pos = (id: string) => sim.get(id);

  return (
    <div
      ref={wrapRef}
      className="relative w-full overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-panel-2)]"
      style={{ height }}
    >
      <svg width={view.w} height={view.h} className="absolute inset-0">
        {/* edges */}
        {edges.map((e) => {
          const a = pos(e.source as string);
          const b = pos(e.target as string);
          if (!a || !b) return null;
          const active = hi.size === 0 || (hi.has(e.source as string) && hi.has(e.target as string));
          return (
            <line
              key={e.id}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={active ? "#3b4a63" : "#1c2432"}
              strokeWidth={active ? 1.3 : 0.8}
              opacity={active ? 0.9 : 0.35}
            />
          );
        })}
        {/* nodes */}
        {nodes.map((n) => {
          const p = pos(n.id);
          if (!p) return null;
          const style = ENTITY_STYLE[n.type];
          const isHi = hi.has(n.id);
          const dim = hi.size > 0 && !isHi;
          const isSel = selected === n.id;
          const r = n.type === "Document" ? 6 : n.type === "Equipment" ? 10 : 8;
          return (
            <g
              key={n.id}
              transform={`translate(${p.x},${p.y})`}
              onPointerDown={onDown(n.id)}
              style={{ cursor: "grab", opacity: dim ? 0.28 : 1 }}
            >
              {(isHi || isSel) && (
                <circle r={r + 7} fill="none" stroke={style.ring} strokeWidth={1.5} opacity={0.5} />
              )}
              <circle
                r={r}
                fill={style.color}
                stroke={isSel ? "#fff" : style.ring}
                strokeWidth={isSel ? 2 : 1}
              />
              <text
                x={0}
                y={r + 12}
                textAnchor="middle"
                fontSize={n.type === "Equipment" ? 10.5 : 9}
                fill={dim ? "var(--color-muted)" : "var(--color-fg)"}
                style={{ pointerEvents: "none", userSelect: "none", opacity: dim ? 0.5 : 1 }}
              >
                {shortLabel(n)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* legend */}
      <div className="pointer-events-none absolute bottom-2 left-2 max-w-[calc(100%-1rem)] flex flex-wrap gap-x-3 gap-y-1 rounded-lg bg-[var(--color-bg)]/70 px-2.5 py-1.5 text-[10px] backdrop-blur">
        {Object.entries(ENTITY_STYLE).map(([k, v]) => (
          <span key={k} className="inline-flex items-center gap-1 text-[var(--color-muted)]">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: v.color }} />
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}

function shortLabel(n: GraphNode) {
  if (n.type === "Document") return "";
  if (n.type === "Equipment") return n.id;
  const base = n.label.split("·")[0].trim();
  return base.length > 22 ? base.slice(0, 20) + "…" : base;
}
