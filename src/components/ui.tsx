import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/* ─── Card — Google Material You elevated surface ──────────────────────── */
export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("card-md", className)}>
      {children}
    </div>
  );
}

/* ─── Badge ─────────────────────────────────────────────────────────────── */
export function Badge({
  children,
  color = "muted",
  className,
}: {
  children: ReactNode;
  color?: "muted" | "accent" | "green" | "warn" | "danger" | "purple";
  className?: string;
}) {
  const map: Record<string, string> = {
    muted:  "bg-[var(--color-muted)]/15 text-[var(--color-muted)] border-[var(--color-muted)]/30",
    accent: "bg-[var(--color-accent)]/15 text-[var(--color-accent)] border-[var(--color-accent)]/30",
    green:  "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    warn:   "bg-[var(--color-warn)]/15 text-[var(--color-warn)] border-[var(--color-warn)]/30",
    danger: "bg-[var(--color-danger)]/15 text-[var(--color-danger)] border-[var(--color-danger)]/30",
    purple: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
        map[color],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ─── Stat Tile — uniform surface, accent number ───────────────────────── */
export function StatTile({
  label,
  value,
  sub,
  accent = "text-[#1A73E8]",
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="card-md flex flex-col justify-between p-4" style={{ minWidth: 160 }}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">{label}</p>
      <div className={cn("mt-2 text-3xl font-bold tabular-nums leading-none text-[var(--color-fg)]", accent)}>{value}</div>
      {sub && <p className="mt-1.5 text-[11px] font-medium text-[var(--color-muted)]">{sub}</p>}
    </div>
  );
}

/* ─── Section Title ─────────────────────────────────────────────────────── */
export function SectionTitle({
  title,
  desc,
  icon,
}: {
  title: string;
  desc?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      {icon && (
        <div
          className="mt-0.5 rounded-xl p-2.5 text-white bg-[var(--color-accent)] shadow-[var(--color-accent)]/30"
          style={{
            boxShadow: "0 2px 8px var(--color-accent)",
          }}
        >
          {icon}
        </div>
      )}
      <div>
        <h1 className="text-lg font-bold text-[var(--color-fg)]">{title}</h1>
        {desc && <p className="mt-0.5 max-w-2xl text-sm leading-relaxed text-[var(--color-muted)]">{desc}</p>}
      </div>
    </div>
  );
}

/* ─── Confidence Meter ──────────────────────────────────────────────────── */
export function ConfidenceMeter({ value, band }: { value: number; band: string }) {
  const pct = Math.round(value * 100);
  const color =
    band === "high"   ? "bg-emerald-500"
    : band === "medium" ? "bg-amber-500"
    : band === "low"    ? "bg-orange-500"
    :                     "bg-rose-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#E0E4EE]">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums text-[var(--color-muted)]">
        {pct}% · {band}
      </span>
    </div>
  );
}
