import fs from "fs";
import path from "path";
import type { Document, GraphNode, GraphEdge, ComplianceItem } from "./types";

// ---------------------------------------------------------------------------
// Disk persistence for the corpus. Ingested documents, the graph and chunk
// embeddings survive restarts. In a read-only serverless FS we fall back to
// /tmp and, failing that, stay in-memory — reads/writes never throw.
// ---------------------------------------------------------------------------

export interface PersistedCorpus {
  documents: Document[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  compliance: ComplianceItem[];
  embeddings: Record<string, number[]>;
  version: number;
}

function resolveDir(): string {
  const primary = path.join(process.cwd(), "data", "corpus");
  try {
    fs.mkdirSync(primary, { recursive: true });
    fs.accessSync(primary, fs.constants.W_OK);
    return primary;
  } catch {
    const tmp = path.join("/tmp", "Nexus-corpus");
    try {
      fs.mkdirSync(tmp, { recursive: true });
      return tmp;
    } catch {
      return primary; // reads may still work; writes will no-op
    }
  }
}

const DIR = resolveDir();
const FILE = path.join(DIR, "corpus.json");

export function corpusPath(): string {
  return FILE;
}

export function loadCorpus(): PersistedCorpus | null {
  try {
    if (!fs.existsSync(FILE)) return null;
    const raw = fs.readFileSync(FILE, "utf-8");
    const data = JSON.parse(raw) as PersistedCorpus;
    if (!data.documents) return null;
    data.embeddings = data.embeddings || {};
    data.compliance = data.compliance || [];
    return data;
  } catch (e) {
    console.error("[persist] loadCorpus failed:", (e as Error).message);
    return null;
  }
}

/** Synchronous write — safe for serverless (completes before response is sent). */
export function saveCorpus(data: PersistedCorpus): void {
  try {
    fs.writeFileSync(FILE, JSON.stringify(data), "utf-8");
  } catch (e) {
    console.error("[persist] saveCorpus failed:", (e as Error).message);
  }
}

/** Synchronous flush — used by the seeding script so it can exit cleanly. */
export function saveCorpusSync(data: PersistedCorpus): void {
  try {
    fs.writeFileSync(FILE, JSON.stringify(snapshotStable(data)), "utf-8");
  } catch (e) {
    console.error("[persist] saveCorpusSync failed:", (e as Error).message);
  }
}

function snapshotStable(d: PersistedCorpus): PersistedCorpus {
  return { ...d, version: (d.version || 0) + 1 };
}
