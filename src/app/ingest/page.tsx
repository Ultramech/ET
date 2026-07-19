"use client";

import { useState } from "react";
import Link from "next/link";
import type { DocType, EntityType } from "@/lib/types";
import { Card, Badge, SectionTitle } from "@/components/ui";
import { ENTITY_STYLE } from "@/lib/ontology";
import { Upload, Sparkles, Link2, PlusCircle, Loader2, FileUp, ScanEye, ImageUp, Globe } from "lucide-react";

interface IngestResult {
  document: { id: string; title: string; type: string; chunks: number };
  newEntities: { id: string; type: EntityType; isNew: boolean }[];
  newEdges: number;
  linkedToExisting: string[];
  embedded?: boolean;
  llmEnriched?: boolean;
}

const PRESETS: { label: string; type: DocType; title: string; text: string }[] = [
  {
    label: "New work order (P-101A)",
    type: "WorkOrder",
    title: "Work Order WO-2025-0034 — P-101A Vibration Check",
    text: "During routine round on P-101A, elevated vibration noted at 1450 rpm. Bearing temperature TI-1011 reading 78 degC, below the 85 degC alarm. Discharge pressure steady at 18 bar. Recommend trending per OISD-GDN-119 and verifying the baseplate re-grouting from INS-2024-P101 is complete. Assigned to R. Sharma.",
  },
  {
    label: "New equipment datasheet (P-205)",
    type: "Datasheet",
    title: "Datasheet — P-205 Naphtha Transfer Pump",
    text: "P-205 is a horizontal centrifugal naphtha transfer pump in unit NHT. Rated 220 m3/hr at 12 bar, 2900 rpm. Fitted with API 682 mechanical seal, API Plan 53B flush. Maximum alignment offset 0.05 mm. Relief protection via PSV-205. Governed by OISD-STD-116 for fire protection.",
  },
  {
    label: "Inspection finding (E-101)",
    type: "Inspection",
    title: "Inspection INS-2025-E101 — E-101 Post-Clean Verification",
    text: "Post chemical-cleaning verification of E-101. Crude-side pressure drop restored to design. Tube fouling cleared. F-101 fired-heater duty back to baseline. Next inspection due 2026-04.",
  },
];

export default function IngestPage() {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<DocType>("WorkOrder");
  const [text, setText] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IngestResult | null>(null);
  const [error, setError] = useState("");

  function loadPreset(p: (typeof PRESETS)[number]) {
    setTitle(p.title);
    setType(p.type);
    setText(p.text);
    setResult(null);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const t = await f.text();
    setText(t);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  async function ingest() {
    setLoading(true);
    setResult(null);
    setError("");
    try {
      // URL mode: the server fetches + extracts the PDF/HTML itself.
      const res = docUrl
        ? await fetch("/api/ingest/url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: docUrl }),
          })
        : await fetch("/api/ingest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, type, text }),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-5">
      <SectionTitle
        icon={<Upload size={18} />}
        title="Universal Document Ingestion"
        desc="Paste or upload any document. Sutradhar chunks it, extracts equipment tags, parameters, regulations and people using the industrial ontology, and auto-links them into the existing knowledge graph in real time."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Input */}
        <Card className="p-4">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => loadPreset(p)}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] px-2.5 py-1 text-[11px] text-[var(--color-muted)] hover:border-cyan-400/40 hover:text-cyan-700 dark:text-cyan-200"
              >
                {p.label}
              </button>
            ))}
          </div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document title"
            className="mb-2 h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 text-sm outline-none focus:border-cyan-400/50"
          />
          <div className="mb-2 flex gap-2">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as DocType)}
              className="h-10 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] px-2 text-sm outline-none"
            >
              {["WorkOrder", "Inspection", "Incident", "SOP", "Datasheet", "OEM Manual", "Regulation", "Email", "P&ID"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <label className="flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 text-xs text-[var(--color-muted)] hover:text-cyan-700 dark:text-cyan-200">
              <FileUp size={14} /> Upload .txt
              <input type="file" accept=".txt,.md,.csv" className="hidden" onChange={onFile} />
            </label>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste document text… (try a preset above)"
            rows={12}
            className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] p-3 text-sm outline-none focus:border-cyan-400/50"
          />
          <div className="my-2 flex items-center gap-2 text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
            <div className="h-px flex-1 bg-[var(--color-border)]" /> or ingest from a URL (PDF / HTML)
            <div className="h-px flex-1 bg-[var(--color-border)]" />
          </div>
          <input
            value={docUrl}
            onChange={(e) => setDocUrl(e.target.value)}
            placeholder="https://…/standard.pdf"
            className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 text-sm outline-none focus:border-cyan-400/50"
          />
          <button
            onClick={ingest}
            disabled={loading || (!docUrl && (!title || !text))}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 py-2.5 text-sm font-medium text-black transition hover:bg-cyan-300 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Ingest & auto-link
          </button>
          {error && <p className="mt-2 text-xs text-rose-700 dark:text-rose-300">{error}</p>}
        </Card>

        {/* Result */}
        <Card className="p-4">
          {!result ? (
            <div className="grid h-full place-items-center py-10 text-center text-xs text-[var(--color-muted)]">
              <div>
                <Upload className="mx-auto mb-2 opacity-40" />
                Extraction results and new graph links appear here.
              </div>
            </div>
          ) : (
            <div className="space-y-4 fade-up">
              <div className="flex items-center gap-2">
                <Badge color="green">Ingested</Badge>
                <span className="text-sm font-medium">{result.document.title}</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Mini label="Chunks" value={result.document.chunks} />
                <Mini label="Entities" value={result.newEntities.length} />
                <Mini label="New links" value={result.newEdges} />
              </div>

              {result.linkedToExisting.length > 0 && (
                <div className="rounded-lg border border-cyan-400/25 bg-cyan-400/[0.06] p-3">
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-cyan-700 dark:text-cyan-200">
                    <Link2 size={13} /> Connected to existing knowledge ({result.linkedToExisting.length})
                  </div>
                  <p className="mb-2 text-[11px] text-[var(--color-muted)]">
                    These tags already existed in the graph — the new document is now linked to their full history.
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {result.linkedToExisting.map((e) => (
                      <Link key={e} href={`/graph?focus=${encodeURIComponent(e)}`}>
                        <Badge color="accent" className="hover:bg-cyan-400/20">{e}</Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="mb-1.5 text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
                  Extracted entities
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result.newEntities.map((e) => (
                    <span
                      key={e.id}
                      className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px]"
                      style={{
                        borderColor: ENTITY_STYLE[e.type].ring + "55",
                        color: ENTITY_STYLE[e.type].color,
                        background: ENTITY_STYLE[e.type].color + "12",
                      }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: ENTITY_STYLE[e.type].color }} />
                      {e.id}
                      {e.isNew ? <PlusCircle size={10} /> : <Link2 size={10} />}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-[var(--color-muted)]">
                  <PlusCircle size={10} className="inline" /> new node · <Link2 size={10} className="inline" /> merged into existing
                </p>
              </div>

              <Link
                href="/graph"
                className="flex items-center justify-center gap-1.5 rounded-lg border border-cyan-400/30 py-2 text-xs text-cyan-700 dark:text-cyan-300 hover:bg-cyan-400/10"
              >
                View it in the knowledge graph →
              </Link>
            </div>
          )}
        </Card>
      </div>

      <DrawingIngest />
    </div>
  );
}

interface VisionResult {
  document?: { id: string; title: string };
  extraction: {
    drawingTitle: string;
    unit?: string;
    equipment: { tag: string; description: string }[];
    instruments: { tag: string; function: string }[];
    connections: { from: string; to: string; service?: string }[];
    notes: string[];
  };
  addedEquipment?: number;
  addedConnections?: number;
  latencyMs?: number;
  error?: string;
}

/** P&ID / engineering-drawing digitisation via multimodal vision. */
function DrawingIngest() {
  const [preview, setPreview] = useState<string | null>(null);
  const [payload, setPayload] = useState<{ imageBase64: string; mimeType: string } | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VisionResult | null>(null);
  const [error, setError] = useState("");

  async function onImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const buf = await f.arrayBuffer();
    let bin = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    const b64 = btoa(bin);
    setPayload({ imageBase64: b64, mimeType: f.type || "image/png" });
    setPreview(URL.createObjectURL(f));
    setImageUrl("");
    setResult(null);
    setError("");
  }

  async function digitise() {
    if (!payload && !imageUrl) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          payload ? { ...payload, ingest: true } : { imageUrl, ingest: true }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  }

  return (
    <div id="drawing" className="space-y-4">
      <SectionTitle
        icon={<ScanEye size={18} />}
        title="Digitise an Engineering Drawing (P&ID)"
        desc="Upload a P&ID or any scanned engineering drawing. Multimodal vision reads the equipment tags, instruments and line topology off the sheet and folds them straight into the knowledge graph."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <label className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-panel-2)] text-xs text-[var(--color-muted)] transition hover:border-cyan-400/40">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="drawing preview" className="h-full w-full rounded-lg object-contain p-1" />
            ) : (
              <>
                <ImageUp size={22} className="opacity-50" />
                Click to upload a drawing image (PNG / JPG)
              </>
            )}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onImage} />
          </label>
          <div className="my-2 flex items-center gap-2 text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
            <div className="h-px flex-1 bg-[var(--color-border)]" /> or from a URL
            <div className="h-px flex-1 bg-[var(--color-border)]" />
          </div>
          <div className="flex gap-2">
            <div className="flex h-10 flex-1 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3">
              <Globe size={14} className="shrink-0 text-[var(--color-muted)]" />
              <input
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setPayload(null);
                  setPreview(null);
                }}
                placeholder="https://…/drawing.png"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </div>
          <button
            onClick={digitise}
            disabled={loading || (!payload && !imageUrl)}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 py-2.5 text-sm font-medium text-black transition hover:bg-cyan-300 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ScanEye size={16} />}
            {loading ? "Reading the drawing…" : "Digitise & add to graph"}
          </button>
          {error && <p className="mt-2 text-xs text-rose-700 dark:text-rose-300">{error}</p>}
        </Card>

        <Card className="p-4">
          {!result ? (
            <div className="grid h-full place-items-center py-10 text-center text-xs text-[var(--color-muted)]">
              <div>
                <ScanEye className="mx-auto mb-2 opacity-40" />
                Extracted tags, instruments and pipe topology appear here.
              </div>
            </div>
          ) : (
            <div className="space-y-3 fade-up">
              <div className="flex flex-wrap items-center gap-2">
                <Badge color="green">Digitised</Badge>
                <span className="text-sm font-medium">{result.extraction.drawingTitle}</span>
                {result.latencyMs && (
                  <span className="ml-auto text-[11px] text-[var(--color-muted)]">
                    {(result.latencyMs / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Mini label="Equipment" value={result.extraction.equipment.length} />
                <Mini label="Instruments" value={result.extraction.instruments.length} />
                <Mini label="Connections" value={result.extraction.connections.length} />
              </div>
              {result.extraction.equipment.length > 0 && (
                <div>
                  <div className="mb-1 text-[11px] uppercase tracking-wide text-[var(--color-muted)]">Equipment tags</div>
                  <div className="flex flex-wrap gap-1">
                    {result.extraction.equipment.slice(0, 16).map((e) => (
                      <Link key={e.tag} href={`/graph?focus=${encodeURIComponent(e.tag.toUpperCase())}`}>
                        <Badge color="accent" className="hover:bg-cyan-400/20">{e.tag}</Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {result.extraction.connections.length > 0 && (
                <div>
                  <div className="mb-1 text-[11px] uppercase tracking-wide text-[var(--color-muted)]">Line topology</div>
                  <div className="max-h-32 space-y-0.5 overflow-y-auto text-xs text-[var(--color-muted)]">
                    {result.extraction.connections.slice(0, 20).map((c, i) => (
                      <div key={i}>
                        <span className="text-cyan-700 dark:text-cyan-300">{c.from}</span> → <span className="text-cyan-700 dark:text-cyan-300">{c.to}</span>
                        {c.service && <span> · {c.service}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {result.document && (
                <Link
                  href="/graph"
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-cyan-400/30 py-2 text-xs text-cyan-700 dark:text-cyan-300 hover:bg-cyan-400/10"
                >
                  View the drawing in the knowledge graph →
                </Link>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] p-2.5 text-center">
      <div className="text-lg font-semibold text-cyan-700 dark:text-cyan-300">{value}</div>
      <div className="text-[10px] uppercase text-[var(--color-muted)]">{label}</div>
    </div>
  );
}
