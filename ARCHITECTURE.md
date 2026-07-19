# Sutradhar — Architecture

Sutradhar is the "Unified Asset & Operations Brain": one queryable, cited,
continuously-updated knowledge layer over the 7–12 disconnected document systems
a large plant runs on.

## 1. System diagram

```mermaid
flowchart TB
    subgraph SRC["Heterogeneous plant sources (7–12 systems)"]
        A1[P&IDs / drawings]
        A2[SOPs & operating instructions]
        A3[Work orders / CMMS]
        A4[Inspection & incident reports]
        A5[OEM manuals & datasheets]
        A6[Regulations: OISD / PESO / Factory Act]
        A7[Email archives]
    end

    subgraph ING["Universal Ingestion Pipeline"]
        B1[OCR / Doc Intelligence<br/>scanned + handwritten]
        B2[P&ID computer vision<br/>tag + topology extraction]
        B3[Chunking + normalisation<br/>units, language hi/en]
        B4[Ontology entity extraction<br/>tags · params · regs · people]
        B5[Auto-linking & version/<br/>supersession detection]
    end

    subgraph KNOW["Unified Knowledge Layer"]
        C1[(Knowledge Graph<br/>nodes + typed edges)]
        C2[(Vector store<br/>chunk embeddings)]
        C3[(Document store<br/>source of truth + citations)]
    end

    subgraph INT["Intelligence / Agents"]
        D1[Expert Copilot<br/>RAG + citations + confidence]
        D2[Maintenance & RCA agent<br/>cross-doc 5-Whys]
        D3[Compliance agent<br/>gap matrix + evidence packs]
        D4[Lessons-Learned engine<br/>recurring-signature detection]
    end

    subgraph UI["Delivery — any device / function"]
        E1[Mobile field copilot<br/>voice · big targets · offline cache]
        E2[Engineer desktop<br/>graph explorer · RCA · audits]
        E3[Proactive push<br/>warnings to ops]
    end

    SRC --> ING --> KNOW --> INT --> UI
    D1 -.grounded in.-> C1 & C2 & C3
    E1 -.new field reports.-> ING
```

## 2. Prototype ↔ production mapping

| Concern | This prototype | Production |
|---|---|---|
| Document store | `src/lib/store.ts` in-memory, `globalThis`-persisted | Postgres / S3 (immutable source of truth) |
| Vector search | Deterministic BM25 + entity-tag boosting (`rag/retrieve.ts`) | pgvector / Upstash + BM25 hybrid re-rank |
| Knowledge graph | Typed nodes/edges in memory (`data/seed.ts`, `ingest.ts`) | Neo4j / Neptune with the same ontology |
| Entity extraction | Ontology regex extractors (`ontology.ts`) + optional LLM | Same ontology + fine-tuned NER + P&ID CV |
| Answer synthesis | Vercel AI Gateway (`ai/client.ts`) with offline extractive fallback | Same gateway, streaming, per-tenant model routing |
| Ingestion input | Text paste / `.txt` upload / URL / P&ID image | OCR (scanned/handwritten), CV for P&IDs, spreadsheet & email parsers |
| Auth & roles | Signed-cookie sessions, `proxy.ts` gate, demo users (admin / user) | SSO/OIDC per plant, same role interface |

The interfaces are identical — only the backing implementations swap. Every
answer already carries `docId` + `locator` citations, so provenance survives the
migration.

## 3. Design principles (why it scores)

1. **Trust by construction.** Answers are cited or refused. A safety-critical
   intent (bypass/override a protection) is *always* declined and redirected to
   Management-of-Change — because this is a safety system, not a chatbot.
   (`rag/copilot.ts`, `ontology.ts` `SAFETY_INTENT`)
2. **The graph is the moat.** Value is in *linkage*, not retrieval. Three work
   orders, an inspection, an incident and an email all converge on one root
   cause no single engineer had assembled. (`rag/rca.ts`, `lessons.ts`)
3. **Offline-first reliability.** Zero-dependency retrieval + rule engines mean
   the demo never hard-fails; the LLM is an enhancement, not a crutch.
4. **Field reality.** Mobile bottom-nav, voice input, big touch targets,
   version-conflict flagging, messy-scan/handwriting/Hindi awareness.
5. **Continuously updated.** New documents extract + auto-link into the existing
   graph live (`/ingest`), so the brain compounds instead of going stale.

## 4. Data model (ontology)

- **Entities:** `Equipment`, `Parameter`, `Regulation`, `Person`, `FailureMode`,
  `Document`, `Unit`.
- **Edges:** `MENTIONS`, `CONNECTED_TO`, `GOVERNS`, `PERFORMED_ON`, `INVOLVES`,
  `EXHIBITS`, `APPLIES_TO`, `AUTHORED`, `SUPERSEDES`, `PART_OF`.

See `src/lib/types.ts` for the full schema.
