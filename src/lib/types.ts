// ---------------------------------------------------------------------------
// Nexus — core domain types for the Unified Asset & Operations Brain
// ---------------------------------------------------------------------------

/** The kinds of source documents an asset-intensive plant actually holds. */
export type DocType =
  | "P&ID"
  | "SOP"
  | "WorkOrder"
  | "Inspection"
  | "Incident"
  | "OEM Manual"
  | "Regulation"
  | "Datasheet"
  | "Email";

/** Entity categories in the industrial ontology (the "nouns" of a plant). */
export type EntityType =
  | "Equipment"
  | "Parameter"
  | "Regulation"
  | "Person"
  | "FailureMode"
  | "Document"
  | "Unit"; // a plant unit/area, e.g. CDU, DHDS

export type EdgeType =
  | "MENTIONS" // document -> entity
  | "CONNECTED_TO" // equipment -> equipment (P&ID topology)
  | "GOVERNS" // procedure/regulation -> equipment
  | "PERFORMED_ON" // work order/inspection -> equipment
  | "INVOLVES" // incident -> equipment
  | "EXHIBITS" // equipment -> failure mode
  | "APPLIES_TO" // regulation -> equipment/procedure/unit
  | "AUTHORED" // person -> document
  | "SUPERSEDES" // document -> document (versioning)
  | "PART_OF"; // equipment -> unit

export interface GraphNode {
  id: string;
  label: string;
  type: EntityType;
  /** free-form domain attributes surfaced in the UI */
  meta?: Record<string, string | number>;
  /** which documents evidence this node */
  sources?: string[];
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  /** the document id(s) that establish this relationship */
  evidence?: string[];
  label?: string;
}

export interface DocChunk {
  id: string;
  docId: string;
  text: string;
  /** page or section for citation precision */
  locator: string;
  /** entity ids referenced in this chunk (linkage) */
  entities: string[];
}

export interface Document {
  id: string;
  title: string;
  type: DocType;
  unit: string; // plant unit / area
  revision?: string;
  date: string; // ISO
  author?: string;
  /** raw scan quality — simulates messy field data */
  ingestQuality?: "clean" | "scanned" | "handwritten";
  language?: "en" | "hi" | "mixed";
  /** id of a document this one supersedes (version awareness) */
  supersedes?: string;
  chunks: DocChunk[];
  summary: string;
  /** provenance — where this document actually came from */
  sourceUrl?: string;
  origin?: "seed" | "upload" | "url" | "vision" | "capture";
  pages?: number;
  bytes?: number;
  /** high-level category for corpus analytics */
  domain?: string;
}

export interface Citation {
  docId: string;
  docTitle: string;
  docType: DocType;
  locator: string;
  snippet: string;
  score: number;
}

export type ConfidenceBand = "high" | "medium" | "low" | "insufficient";

export interface CopilotAnswer {
  answer: string;
  citations: Citation[];
  confidence: number; // 0..1
  band: ConfidenceBand;
  /** entity ids the answer touches — used to highlight the graph */
  relatedEntities: string[];
  /** true when the system deliberately refuses on a safety-critical gap */
  refused: boolean;
  reasoning?: string[];
  engine: "llm" | "retrieval-fallback";
  /** conflicting/superseded sources detected, surfaced to the user */
  conflicts?: string[];
}

export interface ComplianceItem {
  id: string;
  regulation: string; // e.g. OISD-116 Clause 7.4
  requirement: string;
  appliesTo: string[]; // equipment/unit ids
  status: "compliant" | "gap" | "at-risk";
  evidence?: string; // doc id supporting compliance
  finding: string;
  severity: "critical" | "major" | "minor";
  dueDate?: string;
}

export interface RcaResult {
  problem: string;
  equipmentId: string;
  whys: { question: string; answer: string; evidence: string[] }[];
  rootCause: string;
  recommendation: string;
  confidence: number;
  connectedSources: string[]; // doc ids fused across functions
}

export interface Fault {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "warning" | "success" | "info";
  status: "pending" | "approved" | "resolved" | "resolve_requested";
  timestamp: number;
  reportedBy: string;
}
