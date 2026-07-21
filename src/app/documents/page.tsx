"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Document, DocType } from "@/lib/types";
import { Card, Badge, SectionTitle } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { FileText, ArrowLeft, ScanLine, PenLine, Languages, Trash2, Loader2 } from "lucide-react";

const TYPE_COLOR: Record<string, "accent" | "green" | "warn" | "danger" | "purple" | "muted"> = {
  "P&ID": "accent",
  SOP: "green",
  WorkOrder: "warn",
  Inspection: "purple",
  Incident: "danger",
  "OEM Manual": "muted",
  Regulation: "danger",
  Email: "muted",
  Datasheet: "muted",
};

interface DocMeta {
  id: string;
  title: string;
  type: DocType;
  unit: string;
  revision?: string;
  date: string;
  author?: string;
  ingestQuality?: string;
  language?: string;
  summary: string;
  chunks: number;
}

function DocsInner() {
  const params = useSearchParams();
  const id = params.get("id");
  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [detail, setDetail] = useState<Document | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/documents")
      .then((r) => r.json())
      .then((d) => setDocs(d.documents));
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setIsAdmin(d?.role === "admin"))
      .catch(() => {});
  }, []);

  async function deleteDoc(docId: string, title: string) {
    if (!window.confirm(`Delete "${title}" and unlink it from the knowledge graph?`)) return;
    setDeleting(docId);
    const res = await fetch(`/api/documents?id=${encodeURIComponent(docId)}`, { method: "DELETE" });
    if (res.ok) setDocs((ds) => ds.filter((d) => d.id !== docId));
    setDeleting(null);
  }

  useEffect(() => {
    if (id) {
      fetch(`/api/documents?id=${id}`)
        .then((r) => r.json())
        .then(setDetail);
    } else {
      setDetail(null);
    }
  }, [id]);

  if (id && detail) return <DocDetail doc={detail} />;

  const types = ["all", ...Array.from(new Set(docs.map((d) => d.type)))];
  const shown = filter === "all" ? docs : docs.filter((d) => d.type === filter);

  return (
    <div className="space-y-4">
      <SectionTitle
        icon={<FileText size={18} />}
        title="Document Corpus"
        desc="The heterogeneous sources Nexus has unified — P&IDs, SOPs, work orders, inspections, incidents, OEM manuals, regulations and email. Including messy scanned and handwritten records."
      />

      <div className="flex flex-wrap gap-1.5">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`rounded-lg border px-2.5 py-1 text-xs ${
              filter === t ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-700 dark:text-cyan-300" : "border-[var(--color-border)] text-[var(--color-muted)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {shown.map((d) => (
          <Link key={d.id} href={`/documents?id=${d.id}`}>
            <Card className="h-full p-4 transition hover:border-cyan-400/40">
              <div className="flex items-center gap-2">
                <Badge color={TYPE_COLOR[d.type] ?? "muted"}>{d.type}</Badge>
                {d.revision && <Badge color="muted">{d.revision}</Badge>}
                <span className="ml-auto text-[11px] text-[var(--color-muted)]">{formatDate(d.date)}</span>
                {isAdmin && (
                  <button
                    title="Delete document"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      deleteDoc(d.id, d.title);
                    }}
                    className="rounded-md p-1 text-[var(--color-muted)] transition hover:bg-rose-400/10 hover:text-rose-700 dark:text-rose-300"
                  >
                    {deleting === d.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                )}
              </div>
              <h3 className="mt-2 text-sm font-medium leading-snug">{d.title}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-[var(--color-muted)]">{d.summary}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-muted)]">
                <span>{d.unit}</span>
                {d.author && <span>· {d.author}</span>}
                {d.ingestQuality === "scanned" && <Badge color="warn"><ScanLine size={9} /> scanned OCR</Badge>}
                {d.ingestQuality === "handwritten" && <Badge color="danger"><PenLine size={9} /> handwritten</Badge>}
                {d.language === "mixed" && <Badge color="purple"><Languages size={9} /> Hindi/En</Badge>}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function DocDetail({ doc }: { doc: Document }) {
  return (
    <div className="space-y-4">
      <Link href="/documents" className="inline-flex items-center gap-1 text-xs text-[var(--color-muted)] hover:text-cyan-700 dark:text-cyan-300">
        <ArrowLeft size={13} /> Back to corpus
      </Link>
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge color={TYPE_COLOR[doc.type] ?? "muted"}>{doc.type}</Badge>
          {doc.revision && <Badge color="muted">{doc.revision}</Badge>}
          <Badge color="muted">{doc.unit}</Badge>
          <span className="ml-auto text-xs text-[var(--color-muted)]">{formatDate(doc.date)}</span>
        </div>
        <h1 className="mt-2 text-lg font-semibold">{doc.title}</h1>
        {doc.author && <p className="mt-0.5 text-xs text-[var(--color-muted)]">Authored by {doc.author}</p>}
        <p className="mt-2 text-sm text-[var(--color-fg)]/80">{doc.summary}</p>
      </Card>

      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
          Extracted chunks & entities ({doc.chunks.length})
        </div>
        {doc.chunks.map((c) => (
          <Card key={c.id} className="p-4">
            <div className="mb-1.5 flex items-center gap-2">
              <Badge color="accent">{c.locator}</Badge>
            </div>
            <p className="text-sm leading-relaxed text-[var(--color-fg)]/90">{c.text}</p>
            {c.entities.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {c.entities.map((e) => (
                  <Link key={e} href={`/graph?focus=${encodeURIComponent(e)}`}>
                    <Badge color="green" className="hover:bg-emerald-400/20">{e}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-[var(--color-muted)]">Loading…</div>}>
      <DocsInner />
    </Suspense>
  );
}
