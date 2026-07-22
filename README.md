<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Orbitron&weight=700&size=32&pause=1000&color=3B82F6&background=00000000&center=true&vCenter=true&width=900&lines=Nexus;Unified+Asset+%26+Operations+Brain;Several+Disconnected+Systems+%E2%86%92+One+Brain;AI-Powered+Industrial+Knowledge+Intelligence" alt="Nexus Typing SVG" />

<br/>

### 🎥 Watch the Demo

[![Google Drive Demo](https://img.shields.io/badge/%F0%9F%8E%AC%20WATCH%20DEMO-Google%20Drive-4285F4?style=for-the-badge&labelColor=1a1a1a&logo=googledrive)](https://drive.google.com/file/d/18iPAkHn5JLbjVE_CbpeAOT29zypSQSda/view?usp=sharing)

<br/>

> **Indian plants run on 7–12 disconnected document systems.**
> Engineers waste ~35% of their time hunting across CMMS, manuals, SOPs, and incident reports.
> **Nexus unifies all of that — in under 3 seconds, from any device.**

<br/>

### 📹 **[Watch the video demo](https://drive.google.com/file/d/18iPAkHn5JLbjVE_CbpeAOT29zypSQSda/view?usp=sharing)** — See Nexus in action

<br/>

### ⬇️ Evaluating this project? Start here.

**Live App → [nexus-et.vercel.app](https://nexus-et.vercel.app/login)**

| Account | Username | Password | Access |
|:---:|:---:|:---:|:---|
| Field Engineer | `user` | `user` | Copilot · Graph · Maintenance · Compliance · Lessons |
| Knowledge Manager | `admin` | `admin` | Everything above + Ingest · Admin Dashboard · Team |

</div>

---

## 🏆 Try It in 3 Minutes

### Step 1 — Login
Go to **[nexus-et.vercel.app/login](https://nexus-et.vercel.app/login)** → sign in as `user` / `user`.

### Step 2 — Ask the Copilot (`/copilot`)
| Try asking | What you'll see |
|---|---|
| `"Why did P-101A fail three times?"` | Cross-doc synthesis: work orders + inspection + OEM limit |
| `"What does OISD-118 say about pump isolation?"` | Regulation-grounded answer, refuses to help bypass it |
| `"Seal flush plan for P-101A?"` | Cited answer with source document + confidence score |

> **No API key needed.** The offline fallback (BM25 + entity retrieval) runs the full demo without any key.

### Step 3 — Explore the Knowledge Graph (`/graph`)
Find **P-101A** — you'll see three CMMS work orders, one inspection report, and one OEM limit all converging on a single node. No engineer assembled this. Nexus did it automatically.

### Step 4 — Run an RCA (`/maintenance`)
Trigger Root Cause Analysis on P-101A. Nexus fuses 4 document types into a **5-Whys chain with cited evidence** at every step. Root cause: 0.35 mm shaft misalignment vs 0.05 mm OEM limit.

### Step 5 — Export an Evidence Pack (`/compliance`)
One click → print-ready audit report with OISD / PESO / Factory Act gap findings, citations, and sign-off blocks.

### What Judges Should Specifically Look For
1. **Cross-document synthesis** — P-101A RCA pulls from 5 different document types automatically
2. **Citation on every answer** — source document + locator on every Copilot response
3. **Safety refusal guardrail** — ask *"how do I bypass the P-101 interlock"* and watch it decline
4. **Live knowledge graph** — ingest a new doc (admin) and watch it auto-link into the graph
5. **Knowledge gap loop** — capture a gap answer → it becomes a searchable, cited document

---

## What Is Nexus?

> **The problem:** Pump P-101A failed its mechanical seal **three times in 28 months**. Each failure lived in a different system — three work orders, one inspection report, one near-miss, an OEM limit, an email thread. **No single engineer ever saw them together.** So the seals kept being replaced while the real cause (shaft misalignment) went unfixed.

Nexus connects those threads automatically. It ingests every document type a plant produces, builds a typed knowledge graph across all of them, and makes the collective intelligence **queryable, cited, and actionable in seconds** — with no hallucination.

---

## Why This Matters

| Problem | Today | Nexus |
|---|---|---|
| Time to find an answer | 20–40 min (7 systems) | < 3 seconds |
| Cross-document root cause | 2–3 engineer-days | Instant, cited |
| Compliance audit prep | 1–2 weeks | One-click evidence pack |
| Retiring expert knowledge | Lost forever | Captured, graph-linked, searchable |
| Hallucination risk | High (generic RAG) | Zero — answers cited or refused |

---

## Architecture

```
   Heterogeneous plant sources (P&IDs · SOPs · Work Orders · Inspections · OEM Manuals · Regs)
                                        │
                           Universal Ingestion Pipeline
                    (OCR · P&ID Vision · Chunking · Entity extraction · Auto-linking)
                                        │
              ┌─────────────────────────┴──────────────────────────┐
              │  Knowledge Graph              Vector Store          │
              │  (typed nodes + edges)        (BM25 + embeddings)   │
              └─────────────────────────┬──────────────────────────┘
                                        │  Hybrid Retrieval (BM25 + RRF)
                                        │
              ┌─────────────────────────┴──────────────────────────┐
              │   Expert Copilot · RCA Agent · Compliance Agent     │
              │   Lessons Engine · Knowledge Gap Register           │
              └─────────────────────────┬──────────────────────────┘
                                        │
              Mobile field copilot · Desktop graph explorer · Admin ingest
```

---

## Six Modules

| Module | Route | Does |
|---|---|---|
| **Expert Knowledge Copilot** | `/copilot` | RAG chat — inline citations + confidence, safety refusal, voice input |
| **Knowledge Graph** | `/graph` | Force-directed graph: equipment, docs, regs, failure modes, people |
| **Maintenance & RCA** | `/maintenance` | Cross-system 5-Whys with cited evidence across 5 doc types |
| **Quality & Compliance** | `/compliance` | OISD / PESO / Factory Act gap matrix + one-click audit evidence pack |
| **Lessons Learned** | `/lessons` | Recurring failure signature detection → proactive warnings |
| **Universal Ingestion** | `/ingest` | PDF / URL / P&ID image → entity-extract → auto-linked into graph live |

---

## AI Stack

| Layer | Always On | With `GEMINI_API_KEY` |
|---|---|---|
| Retrieval | BM25 + entity-tag boosting (deterministic) | + Gemini semantic embeddings + RRF |
| Copilot | Extractive answers, fully cited | + Gemini 2.5 Flash synthesis |
| RCA / Compliance | Rule-based graph traversal | + Agentic reasoning with thinking-budget |
| Ingestion | Regex ontology entity extraction | + P&ID vision (Gemini reads drawings) |

The sidebar badge shows **LLM** vs **Fallback** live.

---

## Getting Started

```bash
npm install
npm run dev        # http://localhost:3000 — no key needed
```

**To enable Gemini AI:**
```bash
cp .env.example .env.local
# set GEMINI_API_KEY=...   (aistudio.google.com)
# set AUTH_SECRET=...      (any random 256-bit string)
```

**Ingest real public documents:**
```bash
npm run ingest:real   # ~240 real OISD + CSB PDFs
npm run reindex       # rebuild graph
npm run embed         # backfill embeddings (needs GEMINI_API_KEY)
```

---

## Tech Stack

**Next.js 16** (App Router) · **React 19** · **TypeScript** · **Tailwind CSS v4** · **Vercel AI SDK v4** · `@ai-sdk/google` · Custom SVG force-directed graph · Web Speech API · Vercel deploy

---

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | _(blank)_ | Gemini key — empty = offline fallback |
| `Nexus_MODEL` | `gemini-2.5-flash` | Model for synthesis, RCA, vision |
| `AUTH_SECRET` | — | HMAC-SHA256 session signing secret |
| `AI_GATEWAY_API_KEY` | _(blank)_ | Vercel AI Gateway (text + embeddings) |

---

## Roles & Login

| Role | Credentials | Access |
|---|---|---|
| **Field Engineer** | `user` / `user` | Copilot, Graph, Maintenance, Compliance, Lessons, Gaps, Documents |
| **Knowledge Manager** | `admin` / `admin` | Everything above + Ingest, Admin Dashboard, team management |

Auth is signed-cookie sessions with scrypt-hashed user store (`data/users.json` → Postgres swap-point).

---

## Build Status

| Phase | Status |
|---|:---:|
| Auth gate + role-based access | ✅ |
| Seed corpus — Bharat Refinery Ltd, CDU-1 (8 doc types) | ✅ |
| BM25 hybrid retrieval + ontology entity extraction | ✅ |
| Expert Copilot — RAG + citations + safety refusal | ✅ |
| Knowledge Graph Explorer — force-directed SVG | ✅ |
| Cross-document RCA — 5-Whys with cited evidence | ✅ |
| Compliance gap matrix + one-click evidence pack | ✅ |
| Lessons Learned — recurring failure signatures | ✅ |
| Universal Ingestion — paste / upload / URL / P&ID vision | ✅ |
| Knowledge Gap Register — self-healing capture loop | ✅ |
| Real-time Fault Feed (Info / Warning / Critical) | ✅ |
| Admin Dashboard + team management | ✅ |
| Gemini agentic RCA + compliance reasoning | ✅ |
| P&ID computer vision via Gemini | ✅ |
| Production Neo4j / pgvector swap | 🔲 |
| SSO/OIDC per-plant auth | 🔲 |

---

<div align="center">

**Nexus — Turning every plant's scattered documents into one queryable brain.**

Built for the AI for Industrial Knowledge Intelligence challenge.

</div>
