import Link from "next/link";
import { deriveLessons } from "@/lib/lessons";
import { Card, Badge, SectionTitle } from "@/components/ui";
import { Lightbulb, Bell, Repeat, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default function LessonsPage() {
  const lessons = deriveLessons();
  return (
    <div className="space-y-5">
      <SectionTitle
        icon={<Lightbulb size={18} />}
        title="Lessons Learned & Failure Intelligence"
        desc="Scans incident reports, work orders and inspections for recurring signatures — patterns invisible to any single review — and pushes proactive warnings before the same conditions recur."
      />

      {lessons.length === 0 && (
        <Card className="p-6 text-center text-sm text-[var(--color-muted)]">
          No recurring patterns detected yet. As more records are ingested, systemic signatures surface here.
        </Card>
      )}

      <div className="space-y-3">
        {lessons.map((l) => (
          <Card
            key={l.id}
            className={`p-4 ${
              l.severity === "high" ? "border-rose-400/30" : l.severity === "medium" ? "border-amber-400/20" : ""
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Repeat size={15} className={l.severity === "high" ? "text-[var(--color-danger)]" : "text-[var(--color-warn)]"} />
              <span className="text-sm font-semibold">{l.title}</span>
              <Badge color={l.severity === "high" ? "danger" : l.severity === "medium" ? "warn" : "muted"}>
                {l.severity}
              </Badge>
              <Badge color="muted">{l.occurrences}× observed</Badge>
              <div className="ml-auto flex flex-wrap gap-1">
                {l.equipment.map((e) => (
                  <Link key={e} href={`/graph?focus=${encodeURIComponent(e)}`}>
                    <Badge color="accent">{e}</Badge>
                  </Link>
                ))}
              </div>
            </div>

            <p className="mt-2 text-sm text-[var(--color-fg)]/90">{l.pattern}</p>

            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <div className="rounded-lg border border-rose-400/20 bg-[var(--color-danger)]/5 p-2.5">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-[var(--color-danger)]">
                  <Bell size={12} /> Proactive warning (pushed to ops)
                </div>
                <p className="text-xs text-[var(--color-fg)]/85">{l.proactiveWarning}</p>
              </div>
              <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-2.5">
                <div className="mb-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">Recommendation</div>
                <p className="text-xs text-[var(--color-fg)]/85">{l.recommendation}</p>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1">
              <span className="text-[11px] text-[var(--color-muted)]">Evidence:</span>
              {l.sources.map((s) => (
                <Link key={s} href={`/documents?id=${s}`}>
                  <Badge color="muted" className="hover:bg-white/10">
                    <FileText size={9} /> {s}
                  </Badge>
                </Link>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
