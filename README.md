# Nexus — Unified Asset & Operations Brain

> **Nexus**: An AI-powered **Industrial Knowledge Intelligence** platform that ingests the
> heterogeneous documents scattered across a plant's 7–12 disconnected systems
> and makes their collective intelligence **queryable, cited, actionable, and
> continuously updated — at the point of need, on any device.**

Built for the challenge _"AI for Industrial Knowledge Intelligence."_ Demo plant:
**Bharat Refinery Ltd, Vadodara — Crude Distillation Unit (CDU-1)** (fictional,
realistic Indian-refinery corpus).

---

## The core story it tells

Pump **P-101A** failed its mechanical seal **three times in 28 months**. Each
failure lived in a different system: three CMMS work orders, one inspection
report, one near-miss incident report, an OEM manual limit, and a frustrated
email thread. **No single engineer ever saw them together** — so the seals kept
getting replaced while the real cause (a 0.35 mm shaft misalignment vs the OEM's
0.05 mm limit) went unfixed. Nexus connects those threads automatically and
surfaces the root cause, the compliance gap, and a proactive warning.

Also features a real-time **Fault Feed** where field agents can report issues with severity classes (Info/Warning/Critical), automatically tracked to their login session, with a 30-day retained history of resolved faults to prevent recurring blind spots.

## What's inside (all six tracks from the brief)

| Module | Route | Does |
|---|---|---|
| **Expert Knowledge Copilot** | `/copilot` | RAG chat, **inline citations + confidence score**, refuses to guess on safety, voice input, mobile-first |
| **Knowledge Graph Explorer** | `/graph` | Interactive force-directed graph of equipment, docs, regs, params, failure modes; focus + inspect |
| **Maintenance & RCA** | `/maintenance` | Agent fuses work orders + inspections + incidents into a **cross-system 5-Whys** |
| **Quality & Compliance** | `/compliance` | OISD / PESO / Factory Act mapped to real plant state; **gap matrix + one-click audit evidence pack** |
| **Lessons Learned** | `/lessons` | Detects **recurring failure signatures** and pushes proactive warnings |
| **Universal Ingestion** | `/ingest` | Paste/upload any PDF/Spreadsheet → entities extracted → **auto-linked into the graph live** |
| **Document Library** | `/documents` | Browse all unified files in one place — manuals, SOPs, and inspection reports |

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

## Roles & login

The app is split into a **user side** and an **admin side** behind a signed-cookie
login (`src/proxy.ts` gates every page and API). Real accounts live in a
scrypt-hashed user store (`src/lib/users.ts`, persisted to `data/users.json` —
the swap-point for Supabase/Postgres) with **self-service signup** (new accounts
join as users) and full admin team management (create / promote / delete).

| Account | Credentials | Sees |
|---|---|---|
| **Field Engineer (user)** | `user` / `user` | Overview, Copilot, Graph, Maintenance & RCA, Compliance (+ evidence pack), Lessons, Knowledge Gaps (view + capture), Documents (read-only) |
| **Knowledge Manager (admin)** | `admin` / `admin` | Everything above **plus** Admin Dashboard (corpus health, AI engine, team & roles, rebuild graph / backfill embeddings / reset demo), Ingest (paste, upload, URL, P&ID drawing digitisation), document deletion, gap dismissal |

Ingestion, vision, corpus maintenance, user management and deletions are
admin-only at the API level too (401/403 JSON for unauthorised calls).

## The differentiator: Knowledge Gap Register (`/gaps`)

The PS's "knowledge cliff": 25% of experienced engineers retire within a decade
and their undocumented knowledge goes with them. Nexus attacks this head-on:

1. Every question the copilot **cannot** answer from the corpus is logged as a
   knowledge gap automatically (with asker + times-asked counter).
2. Anyone who holds that knowledge clicks **"I know this"** and writes it down.
3. The capture is ingested through the normal pipeline — entity-extracted,
   graph-linked, embedded — and the gap closes.
4. The next person who asks gets a **cited, high-confidence answer** from the
   captured document. The brain learns from its own blind spots.

Also: one-click **audit evidence pack** (`/api/compliance/evidence`) — a
print-ready compliance report with findings, evidence citations and sign-off
blocks, straight from the live gap matrix.

No keys required — it runs on a **deterministic offline fallback** (BM25 + entity
retrieval, extractive answers, rule-based RCA) so the demo never breaks.

**To enable real AI** — Gemini synthesis, agentic RCA/compliance reasoning,
semantic embeddings and **multimodal P&ID vision**:

```bash
cp .env.example .env.local
# set GEMINI_API_KEY=...        (get one at aistudio.google.com)
```

Also works with `AI_GATEWAY_API_KEY` (Vercel AI Gateway). The sidebar badge shows
**LLM** vs **Fallback** live; `/api/stats` reports the active provider/model.

## The AI backend (what's real)

- **Multi-provider AI layer** (`src/lib/ai/client.ts`): Gemini → AI Gateway →
  offline fallback. Thinking-budget control keeps the copilot at ~2–3 s while RCA
  and compliance spend a reasoning budget. Vision and batch-embeddings call
  Gemini directly (robust against AI-SDK edge cases).
- **Hybrid retrieval** (`src/lib/rag/retrieve.ts`): cached BM25 inverted index +
  semantic vector search fused with Reciprocal Rank Fusion. Scales to 10 k+
  chunks; degrades to pure BM25 without a key.
- **Agentic RCA & Compliance**: reasoned by the LLM over the *actual* retrieved
  records (5-Whys with cited evidence; regulatory gap analysis) — not scripted.
- **P&ID / drawing vision** (`src/lib/vision/pid.ts`, `POST /api/vision`): Gemini
  reads an engineering drawing and extracts equipment tags, instruments and line
  topology straight into the knowledge graph.

## Ingesting real documents

The app ships with a seed refinery plus a script that ingests **real public
industrial PDFs** (OISD standards, U.S. CSB incident investigations, ~200
engineering references) through the exact runtime pipeline — every doc keeps its
`sourceUrl`.

```bash
# with `npm run dev` running in another terminal:
npm run ingest:real          # fetch + extract + graph-link ~240 real docs
npm run reindex              # rebuild the graph with current extractors
npm run embed                # backfill embeddings (seed docs; more as quota allows)
```

You can also ingest any single URL at runtime: `POST /api/ingest/url { "url": … }`,
paste/upload on `/ingest`, or drop a P&ID image at `POST /api/vision`.

## How it maps to the judging criteria

- **Innovation (25%)** — the unified knowledge graph + cross-document RCA is the
  differentiator vs generic "chat-over-PDF"; version-conflict reconciliation and
  a hard safety-refusal guardrail are novel for this space.
- **Business Impact (25%)** — reclaims the ~35% of hours lost to searching,
  attacks the 18–22% of downtime from fragmented context, captures retiring
  experts' tacit knowledge, and makes audits evidence-ready.
- **Technical Excellence (20%)** — domain ontology extraction across 8 doc types,
  hybrid retrieval, graph linkage, cited/confidence-scored RAG, agentic RCA.
- **Scalability (15%)** — clean prototype→production interface swap (see
  `ARCHITECTURE.md`); ingestion compounds the graph automatically.
- **User Experience (15%)** — mobile bottom-nav + voice for field techs, desktop
  graph explorer for engineers, zero-hallucination trust model.

## Edge cases handled (beyond the brief)

Superseded/conflicting document versions · safety-critical refusal (won't help
bypass a seal flush / interlock) · "I don't know" on weak grounding · equipment-tag
disambiguation · scanned + **handwritten** + Hindi/English mixed records ·
audit-trail-ready citations on every answer · offline reliability.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Vercel AI SDK +
AI Gateway · custom SVG force-directed graph. Deployable to Vercel as-is.

See **`ARCHITECTURE.md`** for the system diagram and the prototype↔production map.
