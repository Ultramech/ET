"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ComplianceItem } from "@/lib/types";
import { Card, Badge, StatTile, SectionTitle } from "@/components/ui";
import { ShieldCheck, FileText, Download, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

interface Data {
  items: ComplianceItem[];
  summary: { total: number; compliant: number; gap: number; atRisk: number; critical: number };
}

const STATUS = {
  compliant: { color: "green" as const, icon: CheckCircle2, label: "Compliant" },
  "at-risk": { color: "warn" as const, icon: Clock, label: "At risk" },
  gap: { color: "danger" as const, icon: AlertTriangle, label: "Gap" },
};

export default function CompliancePage() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    fetch("/api/compliance")
      .then((r) => r.json())
      .then(setData);
  }, []);

  // Server-rendered, print-ready evidence pack (open in a new tab → print to PDF).
  function downloadPack() {
    window.open("/api/compliance/evidence", "_blank");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionTitle
          icon={<ShieldCheck size={18} />}
          title="Quality & Regulatory Compliance"
          desc="Regulatory requirements (OISD, PESO, Factory Act, QMS) mapped against actual procedures, equipment state and inspection records — with gaps flagged before they escalate."
        />
        <button
          onClick={downloadPack}
          className="flex items-center gap-1.5 rounded-lg border border-cyan-400/30 px-3 py-2 text-xs text-cyan-700 dark:text-cyan-300 hover:bg-cyan-400/10"
        >
          <Download size={14} /> Auto-generate audit pack
        </button>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Requirements" value={data.summary.total} />
            <StatTile label="Compliant" value={data.summary.compliant} accent="text-emerald-700 dark:text-emerald-300" />
            <StatTile label="At risk" value={data.summary.atRisk} accent="text-amber-700 dark:text-amber-300" />
            <StatTile label="Critical gaps" value={data.summary.critical} accent="text-rose-700 dark:text-rose-300" />
          </div>

          <div className="space-y-3">
            {data.items.map((i) => {
              const s = STATUS[i.status];
              const Icon = s.icon;
              return (
                <Card
                  key={i.id}
                  className={`p-4 ${
                    i.status === "gap"
                      ? "border-rose-400/25"
                      : i.status === "at-risk"
                      ? "border-amber-400/20"
                      : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Icon
                      size={16}
                      className={
                        i.status === "compliant"
                          ? "text-emerald-700 dark:text-emerald-300"
                          : i.status === "at-risk"
                          ? "text-amber-700 dark:text-amber-300"
                          : "text-rose-700 dark:text-rose-300"
                      }
                    />
                    <span className="text-sm font-semibold">{i.regulation}</span>
                    <Badge color={s.color}>{s.label}</Badge>
                    <Badge color={i.severity === "critical" ? "danger" : i.severity === "major" ? "warn" : "muted"}>
                      {i.severity}
                    </Badge>
                    <div className="ml-auto flex flex-wrap gap-1">
                      {i.appliesTo.map((a) => (
                        <Link key={a} href={`/graph?focus=${encodeURIComponent(a)}`}>
                          <Badge color="accent">{a}</Badge>
                        </Link>
                      ))}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-fg)]/90">{i.requirement}</p>
                  <p className="mt-1.5 text-xs text-[var(--color-muted)]">
                    <span className="font-medium text-[var(--color-fg)]/70">Finding: </span>
                    {i.finding}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-[var(--color-muted)]">
                    {i.evidence && (
                      <Link href={`/documents?id=${i.evidence}`}>
                        <Badge color="muted" className="hover:bg-white/10">
                          <FileText size={10} /> {i.evidence}
                        </Badge>
                      </Link>
                    )}
                    {i.dueDate && i.status !== "compliant" && (
                      <span className="text-rose-700 dark:text-rose-300">Overdue since {i.dueDate}</span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
