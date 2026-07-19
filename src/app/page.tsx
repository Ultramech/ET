import Link from "next/link";
import { cookies } from "next/headers";
import { getStore } from "@/lib/store";
import { PLANT } from "@/lib/data/seed";
import { deriveLessons } from "@/lib/lessons";
import { openGapCount } from "@/lib/gaps";
import { isLLMAvailable } from "@/lib/ai/client";
import { verifyToken, SESSION_COOKIE } from "@/lib/session";
import { Badge, StatTile } from "@/components/ui";
import { DragScroll } from "@/components/DragScroll";
import { FaultFeed } from "@/components/FaultFeed";
import {
  MessagesSquare,
  Share2,
  Wrench,
  ShieldCheck,
  Lightbulb,
  Upload,
  ArrowRight,
  AlertTriangle,
  Clock,
  Layers,
  Search,
} from "lucide-react";

export const dynamic = "force-dynamic";

/* ── Constants removed in favor of CSS variables ─── */

export default async function Dashboard() {
  const session = await verifyToken((await cookies()).get(SESSION_COOKIE)?.value);
  const isAdmin = session?.role === "admin";
  const store = getStore();
  const lessons = deriveLessons();
  const gaps = store.compliance.filter((c) => c.status !== "compliant");
  const docTypes = new Set(store.documents.map((d) => d.type)).size;

  return (
    <div className="space-y-8">

      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="fade-up">
        {/* <div className="flex flex-wrap items-center gap-2">
          <Badge color="accent">Industrial Knowledge Intelligence</Badge>
          <Badge color={isLLMAvailable() ? "green" : "warn"}>
            {isLLMAvailable() ? "LLM online" : "Offline-safe fallback"}
          </Badge>
        </div> */}
        <h1 className="mt-3 text-[28px] font-bold leading-tight tracking-tight text-[var(--color-fg)] md:text-[32px]">
          One brain for every plant document.
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-muted)]">
          {PLANT.name} · {PLANT.unit} · {PLANT.capacity}. Sutradhar has ingested{" "}
          {store.documents.length} documents from {docTypes} disconnected systems and woven them
          into a single, cited, continuously-updated knowledge graph — surfacing answers, root
          causes and compliance gaps no single team could see alone.
        </p>
      </div>

      {/* ── Fault Feed — replaces old proactive alert ─── */}
      <FaultFeed faults={store.faults} isAdmin={isAdmin} />

      {/* ── Module Cards — 2-row horizontal scroll grid ──────── */}
      <section>
        <p className="section-label">Modules</p>
        <DragScroll variant="grid2">
          {/* Row 1 fills top cells, row 2 fills bottom — grid-auto-flow: column */}
          <ModuleCard href="/copilot" icon={<MessagesSquare size={18} />} title="Expert Copilot" desc="Ask anything across the corpus. Cited, confidence-scored, refuses to guess on safety." tag="RAG · mobile-first" />
          <ModuleCard href="/compliance" icon={<ShieldCheck size={18} />} title="Compliance Intelligence" desc="Maps OISD / PESO / Factory Act against real plant state, auto-builds audit evidence." tag={`${gaps.length} gaps`} />
          <ModuleCard href="/graph" icon={<Share2 size={18} />} title="Knowledge Graph" desc="Interactive map of equipment, documents, regulations and failure modes." tag="Ontology · linkage" />
          <ModuleCard href="/lessons" icon={<Lightbulb size={18} />} title="Lessons Learned" desc="Detects recurring failure signatures across the fleet and pushes warnings before they recur." tag={`${lessons.length} patterns`} />
          <ModuleCard href="/maintenance" icon={<Wrench size={18} />} title="Maintenance & RCA" desc="Fuses work orders, inspections and incidents into a 5-Whys root cause across departments." tag="Agentic" />
          {isAdmin ? (
            <ModuleCard href="/ingest" icon={<Upload size={18} />} title="Universal Ingestion" desc="Drop in any document — chunked, entities extracted, auto-linked into the graph live." tag="Watch it link" />
          ) : (
            <ModuleCard href="/documents" icon={<Upload size={18} />} title="Document Corpus" desc="Browse every unified source — P&IDs, SOPs, work orders, inspections and regulations." tag={`${store.documents.length} docs`} />
          )}
        </DragScroll>
      </section>

      {/* ── Value Tiles — horizontal scroll ──────────────── */}
      <section>
        <p className="section-label">Why Sutradhar</p>
        <DragScroll>
          <ValueTile icon={<Clock size={20} />} big="~35% → seconds" small="of working hours spent searching, reclaimed" />
          <ValueTile icon={<Layers size={20} />} big="7–12 → 1" small="disconnected systems unified into one brain" />
          <ValueTile icon={<Search size={20} />} big="0 hallucinations" small="answers are cited or the system says 'I don't know'" />
        </DragScroll>
      </section>

      {/* ── Stats — moved to bottom, less critical ────────── */}
      <section>
        <p className="section-label">Knowledge Base Stats</p>
        <DragScroll>
          <StatTile label="Documents unified" value={store.documents.length} sub={`${docTypes} formats`} />
          <StatTile label="Entities in graph" value={store.nodes.filter((n) => n.type !== "Document").length} sub="tags · params · regs" accent="text-emerald-600" />
          <StatTile label="Cross-doc links" value={store.edges.length} sub="relationships mapped" accent="text-purple-600" />
          <StatTile label="Open compliance gaps" value={gaps.length} sub="needs action" accent="text-rose-600" />
          <StatTile label="Knowledge gaps" value={openGapCount()} sub="capture before it retires" accent="text-amber-600" />
        </DragScroll>
      </section>

    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Module Card — Google-style: uniform white surface, single blue accent
   ───────────────────────────────────────────────────────────────────────── */
function ModuleCard({
  href,
  icon,
  title,
  desc,
  tag,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  tag: string;
}) {
  return (
    <Link href={href} className="group block" style={{ minWidth: 260, maxWidth: 300 }}>
      <div className="card-md flex h-full flex-col p-5 transition-all duration-200 group-hover:-translate-y-1">
        {/* Top row: icon + tag */}
        <div className="flex items-start justify-between gap-2">
          <div
            className="rounded-2xl p-3 bg-[var(--color-accent)]/10 text-[var(--color-accent)] shadow-sm"
          >
            {icon}
          </div>
          <span
            className="mt-1 rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-2.5 py-0.5 text-[11px] font-bold text-[var(--color-accent)]"
          >
            {tag}
          </span>
        </div>

        {/* Title */}
        <div className="mt-4 flex items-center gap-1.5 text-[14px] font-bold text-[var(--color-fg)]">
          {title}
          <ArrowRight
            size={14}
            className="opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100 text-[var(--color-accent)]"
          />
        </div>

        {/* Description */}
        <p className="mt-1.5 flex-1 text-[12px] leading-relaxed text-[var(--color-muted)]">{desc}</p>

        {/* Bottom: animated blue line */}
        <div
          className="mt-4 h-[3px] w-6 rounded-full transition-all duration-300 group-hover:w-full bg-[var(--color-accent)]/30"
        />
      </div>
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Value Tile — uniform white, blue icon, same surface as other cards
   ───────────────────────────────────────────────────────────────────────── */
function ValueTile({
  icon,
  big,
  small,
}: {
  icon: React.ReactNode;
  big: string;
  small: string;
}) {
  return (
    <div className="card-md flex flex-col p-5" style={{ minWidth: 220 }}>
      <div
        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-white bg-[var(--color-accent)] shadow-[var(--color-accent)]/30"
        style={{
          boxShadow: "0 2px 8px var(--color-accent)",
        }}
      >
        {icon}
      </div>
      <div className="mt-3 text-[22px] font-bold leading-tight text-[var(--color-fg)]">{big}</div>
      <div className="mt-1 text-[12px] leading-relaxed text-[var(--color-muted)]">{small}</div>
    </div>
  );
}
