import type {
  Document,
  GraphNode,
  GraphEdge,
  ComplianceItem,
  Fault,
} from "../types";

// ---------------------------------------------------------------------------
// SEED CORPUS — "Bharat Refinery Ltd, Vadodara" · Crude Distillation Unit (CDU)
//
// A deliberately realistic, fictional plant. Documents live in the 7–12
// disconnected systems the problem statement describes (DMS, CMMS, QMS, email).
// The whole point of Sutradhar is that these were NEVER connected before — the
// central thread here is the crude charge pump P-101A and its recurring
// mechanical-seal failures, a story that spans six document types and four
// departments and that no single engineer had ever seen end-to-end.
// ---------------------------------------------------------------------------

export const PLANT = {
  name: "Bharat Refinery Ltd — Vadodara",
  unit: "Crude Distillation Unit (CDU-1)",
  capacity: "6.0 MMTPA",
};

export const SEED_DOCUMENTS: Document[] = [
  // ---- OEM MANUAL --------------------------------------------------------
  {
    id: "DOC-OEM-P101",
    title: "KSB HGM 200-400 Crude Charge Pump — O&M Manual",
    type: "OEM Manual",
    unit: "CDU-1",
    revision: "Ed. 4",
    date: "2019-06-01",
    ingestQuality: "clean",
    language: "en",
    summary:
      "Manufacturer operation & maintenance manual for pump P-101A/B including seal plan, alignment and minimum-flow limits.",
    chunks: [
      {
        id: "DOC-OEM-P101#c1",
        docId: "DOC-OEM-P101",
        locator: "§5.3 Mechanical Seal",
        text: "P-101A/B is fitted with a cartridge mechanical seal per API 682. A seal flush of API Plan 53B (pressurised barrier fluid) is MANDATORY during operation. Operating the pump without an active seal flush will cause rapid seal-face degradation and loss of containment of hydrocarbon. Barrier fluid pressure must be maintained at minimum 2 bar above seal chamber pressure.",
        entities: ["P-101A", "P-101B", "API 682", "2 bar"],
      },
      {
        id: "DOC-OEM-P101#c2",
        docId: "DOC-OEM-P101",
        locator: "§6.1 Coupling Alignment",
        text: "Shaft-to-shaft alignment must be verified with a laser alignment tool. Maximum permissible parallel offset is 0.05 mm and angular offset 0.05 mm/100mm. Misalignment beyond these limits is the leading cause of premature bearing and seal failure and must be corrected before commissioning.",
        entities: ["0.05 mm", "Coupling Misalignment"],
      },
      {
        id: "DOC-OEM-P101#c3",
        docId: "DOC-OEM-P101",
        locator: "§4.2 Minimum Flow",
        text: "Continuous minimum flow is 30 % of BEP (Best Efficiency Point). Operating below minimum flow causes internal recirculation, cavitation and bearing overheat. A minimum-flow recirculation line to V-100 must remain in service at all times. Rated discharge pressure is 18 bar at 1450 rpm.",
        entities: ["30 %", "V-100", "18 bar", "1450 rpm", "Cavitation"],
      },
    ],
  },

  // ---- P&ID --------------------------------------------------------------
  {
    id: "DOC-PID-CDU-001",
    title: "P&ID — CDU-1 Crude Charge & Preheat Train",
    type: "P&ID",
    unit: "CDU-1",
    revision: "Rev C",
    date: "2021-02-15",
    ingestQuality: "scanned",
    language: "en",
    summary:
      "Piping & instrumentation diagram of the crude charge pumps, preheat exchanger, fired heater and atmospheric column.",
    chunks: [
      {
        id: "DOC-PID-CDU-001#c1",
        docId: "DOC-PID-CDU-001",
        locator: "Sheet 1/3",
        text: "Crude is drawn from surge drum V-100 by charge pumps P-101A (running) and P-101B (installed spare) through common suction header. Pump discharge routes through crude/product preheat exchanger E-101 to fired heater F-101 and into atmospheric column C-101. Reflux is collected in drum V-101. Column C-101 is protected by relief valve PSV-101 set at 3.5 barg discharging to flare.",
        entities: [
          "V-100",
          "P-101A",
          "P-101B",
          "E-101",
          "F-101",
          "C-101",
          "V-101",
          "PSV-101",
          "3.5 barg",
        ],
      },
      {
        id: "DOC-PID-CDU-001#c2",
        docId: "DOC-PID-CDU-001",
        locator: "Sheet 2/3",
        text: "A minimum-flow recirculation line with restriction orifice returns from P-101A/B discharge to V-100. Seal flush skid provides API Plan 53B barrier fluid to both pumps. Bearing temperature transmitters TI-1011 (P-101A) and TI-1012 (P-101B) alarm at 85 degC and trip at 95 degC.",
        entities: ["P-101A", "P-101B", "V-100", "TI-1011", "TI-1012", "85 degC", "95 degC"],
      },
    ],
  },

  // ---- SOP (current) -----------------------------------------------------
  {
    id: "DOC-SOP-CDU-STARTUP-R3",
    title: "SOP: CDU-1 Cold Startup — Crude Charge Pump Lineup",
    type: "SOP",
    unit: "CDU-1",
    revision: "Rev 3",
    date: "2024-01-10",
    author: "R. Sharma",
    ingestQuality: "clean",
    language: "en",
    supersedes: "DOC-SOP-CDU-STARTUP-R2",
    summary:
      "Current controlled procedure for lining up and starting crude charge pump P-101A during a cold start.",
    chunks: [
      {
        id: "DOC-SOP-CDU-STARTUP-R3#c1",
        docId: "DOC-SOP-CDU-STARTUP-R3",
        locator: "Step 3–5",
        text: "Confirm seal flush skid is in service and barrier fluid pressure is at least 2 bar above seal chamber before energising P-101A. Open minimum-flow recirculation valve to V-100 fully. Confirm suction valve from V-100 fully open and discharge valve throttled.",
        entities: ["P-101A", "V-100", "2 bar"],
      },
      {
        id: "DOC-SOP-CDU-STARTUP-R3#c2",
        docId: "DOC-SOP-CDU-STARTUP-R3",
        locator: "Step 6 (added Rev 3)",
        text: "NEW IN REV 3: After start, hold pump on minimum-flow recirculation for a 10-minute warm-up before slowly opening discharge to E-101. This warm-up hold was added following incident INC-2023-07 to avoid thermal shock and seal distortion. Do not bypass this hold.",
        entities: ["P-101A", "E-101", "Mechanical Seal Failure"],
      },
    ],
  },

  // ---- SOP (superseded, still floating in the DMS) -----------------------
  {
    id: "DOC-SOP-CDU-STARTUP-R2",
    title: "SOP: CDU-1 Cold Startup — Crude Charge Pump Lineup",
    type: "SOP",
    unit: "CDU-1",
    revision: "Rev 2 (SUPERSEDED)",
    date: "2020-08-22",
    author: "R. Sharma",
    ingestQuality: "scanned",
    language: "en",
    summary:
      "OUTDATED procedure — still present in the shared drive. Lacks the warm-up hold step. Kept to demonstrate version-conflict detection.",
    chunks: [
      {
        id: "DOC-SOP-CDU-STARTUP-R2#c1",
        docId: "DOC-SOP-CDU-STARTUP-R2",
        locator: "Step 6",
        text: "After start, open discharge valve to E-101 to establish full crude flow. (Note: this version does NOT include a warm-up hold; superseded by Rev 3 in Jan 2024.)",
        entities: ["P-101A", "E-101"],
      },
    ],
  },

  // ---- WORK ORDERS (the failure pattern) ---------------------------------
  {
    id: "DOC-WO-2022-0891",
    title: "Work Order WO-2022-0891 — P-101A Mechanical Seal Replacement",
    type: "WorkOrder",
    unit: "CDU-1",
    date: "2022-05-14",
    author: "M. Khan",
    ingestQuality: "clean",
    language: "en",
    summary: "First recorded seal replacement on P-101A.",
    chunks: [
      {
        id: "DOC-WO-2022-0891#c1",
        docId: "DOC-WO-2022-0891",
        locator: "Findings",
        text: "P-101A tripped on high bearing temperature TI-1011. On dismantling, mechanical seal faces found heavily worn and chipped. Replaced seal cartridge. Pump returned to service. Downtime 9 hours. Root cause not investigated.",
        entities: ["P-101A", "TI-1011", "Mechanical Seal Failure", "Bearing Overheat"],
      },
    ],
  },
  {
    id: "DOC-WO-2023-0456",
    title: "Work Order WO-2023-0456 — P-101A Mechanical Seal Replacement",
    type: "WorkOrder",
    unit: "CDU-1",
    date: "2023-07-19",
    author: "M. Khan",
    ingestQuality: "handwritten",
    language: "mixed",
    summary:
      "Second seal replacement within 14 months. Technician noted suspected coupling misalignment (handwritten).",
    chunks: [
      {
        id: "DOC-WO-2023-0456#c1",
        docId: "DOC-WO-2023-0456",
        locator: "Findings (handwritten)",
        text: "Seal failed again after ~14 months. Same wear pattern on seal faces. Technician note: 'coupling ka alignment theek nahi lag raha' (coupling alignment does not look correct). Recommended laser alignment check next shutdown. Downtime 11 hours.",
        entities: ["P-101A", "Mechanical Seal Failure", "Coupling Misalignment"],
      },
    ],
  },
  {
    id: "DOC-WO-2024-0212",
    title: "Work Order WO-2024-0212 — P-101A Mechanical Seal Replacement",
    type: "WorkOrder",
    unit: "CDU-1",
    date: "2024-09-03",
    author: "A. Iyer",
    ingestQuality: "clean",
    language: "en",
    summary: "Third seal replacement — pattern now unmistakable.",
    chunks: [
      {
        id: "DOC-WO-2024-0212#c1",
        docId: "DOC-WO-2024-0212",
        locator: "Findings",
        text: "Third mechanical seal failure on P-101A in ~28 months. Seal faces show identical asymmetric wear consistent with shaft misalignment. Laser alignment scheduled — see inspection INS-2024-P101. Recurring failure flagged to reliability team. Downtime 10 hours.",
        entities: ["P-101A", "Mechanical Seal Failure", "Coupling Misalignment"],
      },
    ],
  },

  // ---- INSPECTION (the root-cause evidence) ------------------------------
  {
    id: "DOC-INS-2024-P101",
    title: "Inspection Report INS-2024-P101 — Laser Alignment, P-101A",
    type: "Inspection",
    unit: "CDU-1",
    date: "2024-09-05",
    author: "A. Iyer",
    ingestQuality: "clean",
    language: "en",
    summary:
      "Precision laser alignment of P-101A driver-to-pump coupling — the smoking gun.",
    chunks: [
      {
        id: "DOC-INS-2024-P101#c1",
        docId: "DOC-INS-2024-P101",
        locator: "Result",
        text: "Laser alignment of P-101A motor-to-pump coupling measured a parallel offset of 0.35 mm — seven times the OEM maximum of 0.05 mm. Soft-foot detected at foundation bolt 3. This chronic misalignment fully explains the repeated mechanical-seal and bearing failures. Baseplate grouting also found degraded. Alignment corrected to 0.03 mm and soft-foot shimmed.",
        entities: ["P-101A", "0.35 mm", "0.05 mm", "Coupling Misalignment", "Mechanical Seal Failure"],
      },
    ],
  },
  {
    id: "DOC-INS-2024-E101",
    title: "Inspection Report INS-2024-E101 — E-101 Tube Fouling",
    type: "Inspection",
    unit: "CDU-1",
    date: "2024-04-11",
    author: "A. Iyer",
    ingestQuality: "clean",
    language: "en",
    summary: "Preheat exchanger E-101 fouling assessment.",
    chunks: [
      {
        id: "DOC-INS-2024-E101#c1",
        docId: "DOC-INS-2024-E101",
        locator: "Result",
        text: "E-101 crude-side pressure drop increased 40 % over 12 months indicating tube fouling. Cold-end outlet temperature down 12 degC, raising fired-heater F-101 duty and fuel gas consumption. Chemical cleaning recommended at next turnaround.",
        entities: ["E-101", "F-101", "Tube Fouling", "12 degC"],
      },
    ],
  },

  // ---- INCIDENT ----------------------------------------------------------
  {
    id: "DOC-INC-2023-07",
    title: "Incident Report INC-2023-07 — Hydrocarbon Leak & Near-Miss Fire, P-101A",
    type: "Incident",
    unit: "CDU-1",
    date: "2023-07-18",
    author: "R. Sharma",
    ingestQuality: "clean",
    language: "en",
    summary:
      "Seal failure on P-101A led to a hydrocarbon spray, near-miss fire and area evacuation.",
    chunks: [
      {
        id: "DOC-INC-2023-07#c1",
        docId: "DOC-INC-2023-07",
        locator: "Sequence",
        text: "Mechanical seal on P-101A failed catastrophically during a hot restart, spraying naphtha which contacted hot E-101 surface. No ignition occurred but the area was evacuated and the unit tripped. Investigation noted the pump had been restarted without a warm-up hold, causing thermal shock to an already-degraded seal.",
        entities: ["P-101A", "E-101", "Mechanical Seal Failure"],
      },
      {
        id: "DOC-INC-2023-07#c2",
        docId: "DOC-INC-2023-07",
        locator: "Actions",
        text: "Corrective actions: (1) add warm-up hold to startup SOP (done, Rev 3). (2) Review fixed fire-water/deluge coverage over P-101A per OISD-STD-116. Deluge review action REMAINS OPEN as of last audit.",
        entities: ["P-101A", "OISD-STD-116"],
      },
    ],
  },

  // ---- REGULATIONS -------------------------------------------------------
  {
    id: "DOC-REG-OISD-116",
    title: "OISD-STD-116 — Fire Protection Facilities for Petroleum Refineries",
    type: "Regulation",
    unit: "Plant-wide",
    date: "2018-03-01",
    ingestQuality: "clean",
    language: "en",
    summary:
      "Oil Industry Safety Directorate standard mandating fire-water and deluge coverage for hydrocarbon pumps.",
    chunks: [
      {
        id: "DOC-REG-OISD-116#c1",
        docId: "DOC-REG-OISD-116",
        locator: "Clause 7.4",
        text: "Clause 7.4: Hydrocarbon pumps handling flammable liquids above their auto-ignition considerations shall be provided with fixed water-spray (deluge) protection and adequate fire-water monitor coverage. Coverage adequacy shall be reviewed after any loss-of-containment incident.",
        entities: ["OISD-STD-116"],
      },
    ],
  },
  {
    id: "DOC-REG-OISD-119",
    title: "OISD-GDN-119 — Inspection & Maintenance of Rotating Equipment",
    type: "Regulation",
    unit: "Plant-wide",
    date: "2017-11-01",
    ingestQuality: "clean",
    language: "en",
    summary:
      "Guideline for predictive maintenance and alignment of critical rotating equipment.",
    chunks: [
      {
        id: "DOC-REG-OISD-119#c1",
        docId: "DOC-REG-OISD-119",
        locator: "Clause 5.2",
        text: "Clause 5.2: Critical rotating equipment shall undergo precision laser alignment at every major overhaul and whenever repeat seal/bearing failures occur. Vibration-based condition monitoring shall be trended. A recurring failure (two or more in 24 months) shall trigger a formal Root Cause Analysis.",
        entities: ["OISD-GDN-119", "Coupling Misalignment"],
      },
    ],
  },
  {
    id: "DOC-REG-PESO",
    title: "PESO License & Petroleum Rules 2002 — Storage & Handling",
    type: "Regulation",
    unit: "Plant-wide",
    date: "2023-12-31",
    ingestQuality: "clean",
    language: "en",
    summary:
      "Petroleum & Explosives Safety Organisation licence conditions and relief-valve certification.",
    chunks: [
      {
        id: "DOC-REG-PESO#c1",
        docId: "DOC-REG-PESO",
        locator: "Condition 9",
        text: "All pressure relief valves protecting petroleum service (e.g. PSV-101) shall be tested and certified at intervals not exceeding 24 months. Valid PESO licence must be maintained for storage installations.",
        entities: ["PESO", "PSV-101"],
      },
    ],
  },

  // ---- EMAIL (unstructured) ----------------------------------------------
  {
    id: "DOC-EMAIL-2024-0906",
    title: "Email — Re: P-101A again?? (Reliability thread)",
    type: "Email",
    unit: "CDU-1",
    date: "2024-09-06",
    author: "R. Sharma",
    ingestQuality: "clean",
    language: "mixed",
    summary:
      "Internal email thread expressing frustration at repeated P-101A failures — the kind of tacit knowledge that dies in inboxes.",
    chunks: [
      {
        id: "DOC-EMAIL-2024-0906#c1",
        docId: "DOC-EMAIL-2024-0906",
        locator: "Thread",
        text: "From R. Sharma: 'Team, this is the 3rd seal on P-101A. Har baar hum seal badal dete hain but root cause kabhi fix nahi hota. A. Iyer just did the laser alignment — 0.35 mm off! That's the real problem, not the seals. Please raise a permanent fix: re-grout baseplate and correct soft-foot. Otherwise we will be back here in a year.'",
        entities: ["P-101A", "Coupling Misalignment", "0.35 mm"],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// KNOWLEDGE GRAPH — nodes (entities) and edges (relationships across docs).
// This is what "no single team member can connect alone": a work order, an
// inspection, an incident, a regulation and an email all point at P-101A.
// ---------------------------------------------------------------------------

export const SEED_NODES: GraphNode[] = [
  { id: "CDU-1", label: "CDU-1 (Crude Distillation Unit)", type: "Unit" },
  {
    id: "P-101A",
    label: "P-101A · Crude Charge Pump",
    type: "Equipment",
    meta: { service: "Crude charge", oem: "KSB HGM 200-400", criticality: "High", status: "Running" },
    sources: ["DOC-OEM-P101", "DOC-PID-CDU-001"],
  },
  {
    id: "P-101B",
    label: "P-101B · Crude Charge Pump (spare)",
    type: "Equipment",
    meta: { service: "Crude charge", criticality: "High", status: "Standby" },
    sources: ["DOC-PID-CDU-001"],
  },
  { id: "E-101", label: "E-101 · Crude Preheat Exchanger", type: "Equipment", meta: { status: "Fouling" }, sources: ["DOC-PID-CDU-001"] },
  { id: "F-101", label: "F-101 · Fired Heater", type: "Equipment", sources: ["DOC-PID-CDU-001"] },
  { id: "C-101", label: "C-101 · Atmospheric Column", type: "Equipment", sources: ["DOC-PID-CDU-001"] },
  { id: "V-100", label: "V-100 · Crude Surge Drum", type: "Equipment", sources: ["DOC-PID-CDU-001"] },
  { id: "V-101", label: "V-101 · Reflux Drum", type: "Equipment", sources: ["DOC-PID-CDU-001"] },
  { id: "PSV-101", label: "PSV-101 · Column Relief Valve", type: "Equipment", meta: { setPressure: "3.5 barg" }, sources: ["DOC-PID-CDU-001", "DOC-REG-PESO"] },
  { id: "TI-1011", label: "TI-1011 · P-101A Bearing Temp", type: "Equipment", sources: ["DOC-PID-CDU-001"] },

  // failure modes
  { id: "Mechanical Seal Failure", label: "Mechanical Seal Failure", type: "FailureMode" },
  { id: "Coupling Misalignment", label: "Coupling Misalignment", type: "FailureMode" },
  { id: "Bearing Overheat", label: "Bearing Overheat", type: "FailureMode" },
  { id: "Tube Fouling", label: "Tube Fouling", type: "FailureMode" },
  { id: "Cavitation", label: "Cavitation", type: "FailureMode" },

  // regulations
  { id: "OISD-STD-116", label: "OISD-STD-116 · Fire Protection", type: "Regulation" },
  { id: "OISD-GDN-119", label: "OISD-GDN-119 · Rotating Equipment", type: "Regulation" },
  { id: "PESO", label: "PESO / Petroleum Rules 2002", type: "Regulation" },
  { id: "API 682", label: "API 682 · Shaft Sealing", type: "Regulation" },

  // people
  { id: "R. Sharma", label: "R. Sharma · Sr. Rotating Engineer", type: "Person" },
  { id: "A. Iyer", label: "A. Iyer · Inspection Engineer", type: "Person" },
  { id: "M. Khan", label: "M. Khan · Shift Operator", type: "Person" },

  // key parameters
  { id: "0.05 mm", label: "0.05 mm · Max alignment offset", type: "Parameter" },
  { id: "0.35 mm", label: "0.35 mm · Measured offset", type: "Parameter" },
  { id: "18 bar", label: "18 bar · Discharge pressure", type: "Parameter" },
  { id: "30 %", label: "30 % · Minimum flow", type: "Parameter" },
];

// documents also become nodes so the graph shows document<->entity linkage
for (const d of SEED_DOCUMENTS) {
  SEED_NODES.push({ id: d.id, label: `${d.type}: ${d.title}`, type: "Document", meta: { type: d.type } });
}

let _edgeId = 0;
const e = (source: string, target: string, type: GraphEdge["type"], evidence?: string[], label?: string): GraphEdge => ({
  id: `E${++_edgeId}`,
  source,
  target,
  type,
  evidence,
  label,
});

export const SEED_EDGES: GraphEdge[] = [
  // topology (from P&ID)
  e("V-100", "P-101A", "CONNECTED_TO", ["DOC-PID-CDU-001"], "suction"),
  e("P-101A", "E-101", "CONNECTED_TO", ["DOC-PID-CDU-001"], "discharge"),
  e("E-101", "F-101", "CONNECTED_TO", ["DOC-PID-CDU-001"]),
  e("F-101", "C-101", "CONNECTED_TO", ["DOC-PID-CDU-001"]),
  e("C-101", "V-101", "CONNECTED_TO", ["DOC-PID-CDU-001"]),
  e("PSV-101", "C-101", "GOVERNS", ["DOC-PID-CDU-001"], "protects"),
  e("TI-1011", "P-101A", "PART_OF", ["DOC-PID-CDU-001"]),
  e("P-101B", "P-101A", "CONNECTED_TO", ["DOC-PID-CDU-001"], "spare"),

  // unit membership
  ...["P-101A", "P-101B", "E-101", "F-101", "C-101", "V-100", "V-101", "PSV-101"].map((eq) =>
    e(eq, "CDU-1", "PART_OF")
  ),

  // failure history — the cross-document convergence on P-101A
  e("P-101A", "Mechanical Seal Failure", "EXHIBITS", [
    "DOC-WO-2022-0891",
    "DOC-WO-2023-0456",
    "DOC-WO-2024-0212",
    "DOC-INC-2023-07",
  ]),
  e("P-101A", "Coupling Misalignment", "EXHIBITS", ["DOC-WO-2023-0456", "DOC-INS-2024-P101", "DOC-EMAIL-2024-0906"]),
  e("P-101A", "Bearing Overheat", "EXHIBITS", ["DOC-WO-2022-0891"]),
  e("Coupling Misalignment", "Mechanical Seal Failure", "GOVERNS", ["DOC-INS-2024-P101", "DOC-OEM-P101"], "causes"),
  e("E-101", "Tube Fouling", "EXHIBITS", ["DOC-INS-2024-E101"]),

  // regulations applied
  e("OISD-STD-116", "P-101A", "APPLIES_TO", ["DOC-REG-OISD-116", "DOC-INC-2023-07"], "fire protection"),
  e("OISD-GDN-119", "P-101A", "APPLIES_TO", ["DOC-REG-OISD-119"], "RCA trigger"),
  e("PESO", "PSV-101", "APPLIES_TO", ["DOC-REG-PESO"], "valve cert"),
  e("API 682", "P-101A", "APPLIES_TO", ["DOC-OEM-P101"], "seal std"),

  // parameters
  e("0.05 mm", "P-101A", "APPLIES_TO", ["DOC-OEM-P101"], "spec limit"),
  e("0.35 mm", "P-101A", "APPLIES_TO", ["DOC-INS-2024-P101"], "measured"),
  e("18 bar", "P-101A", "APPLIES_TO", ["DOC-OEM-P101"]),
  e("30 %", "P-101A", "APPLIES_TO", ["DOC-OEM-P101"], "min flow"),
];

// document -> entity MENTIONS edges + person AUTHORED edges (built from corpus)
for (const d of SEED_DOCUMENTS) {
  const mentioned = new Set<string>();
  for (const c of d.chunks) for (const ent of c.entities) mentioned.add(ent);
  for (const ent of mentioned) {
    if (SEED_NODES.some((n) => n.id === ent)) {
      SEED_EDGES.push(e(d.id, ent, "MENTIONS"));
    }
  }
  if (d.author && SEED_NODES.some((n) => n.id === d.author)) {
    SEED_EDGES.push(e(d.author, d.id, "AUTHORED"));
  }
}
// version supersession
SEED_EDGES.push(e("DOC-SOP-CDU-STARTUP-R3", "DOC-SOP-CDU-STARTUP-R2", "SUPERSEDES"));

// ---------------------------------------------------------------------------
// COMPLIANCE MATRIX — regulatory requirements mapped against actual plant state
// ---------------------------------------------------------------------------

export const SEED_COMPLIANCE: ComplianceItem[] = [
  {
    id: "CMP-1",
    regulation: "OISD-STD-116 Cl. 7.4",
    requirement:
      "Fire-water/deluge coverage over hydrocarbon pumps must be reviewed after any loss-of-containment incident.",
    appliesTo: ["P-101A"],
    status: "gap",
    finding:
      "Loss of containment occurred in INC-2023-07 (Jul 2023). Deluge coverage review action is still OPEN. Non-conformance for 12+ months.",
    severity: "critical",
    evidence: "DOC-INC-2023-07",
    dueDate: "2023-10-18",
  },
  {
    id: "CMP-2",
    regulation: "OISD-GDN-119 Cl. 5.2",
    requirement:
      "Repeat seal/bearing failures (≥2 in 24 months) must trigger a formal Root Cause Analysis and precision alignment.",
    appliesTo: ["P-101A"],
    status: "at-risk",
    finding:
      "Three seal failures in 28 months. Alignment finally done (INS-2024-P101) but a formal documented RCA was only raised late. Close-out pending baseplate re-grouting.",
    severity: "major",
    evidence: "DOC-INS-2024-P101",
  },
  {
    id: "CMP-3",
    regulation: "PESO / Petroleum Rules 2002, Cond. 9",
    requirement:
      "Relief valves (PSV-101) tested & certified within 24 months; valid PESO licence maintained.",
    appliesTo: ["PSV-101"],
    status: "compliant",
    finding: "PSV-101 last certified within interval; PESO licence valid to 2025-12-31.",
    severity: "minor",
    evidence: "DOC-REG-PESO",
  },
  {
    id: "CMP-4",
    regulation: "API 682 / OEM §5.3",
    requirement:
      "Mechanical seal must run with an active API Plan 53B barrier-fluid flush at all times.",
    appliesTo: ["P-101A"],
    status: "compliant",
    finding: "Seal flush skid in service; SOP Rev 3 enforces barrier-fluid check before start.",
    severity: "minor",
    evidence: "DOC-SOP-CDU-STARTUP-R3",
  },
  {
    id: "CMP-5",
    regulation: "Document Control (QMS)",
    requirement: "Superseded procedures must be withdrawn from all points of use.",
    appliesTo: ["CDU-1"],
    status: "gap",
    finding:
      "Superseded SOP Rev 2 (without the warm-up hold) is still present on the shared drive and could be used during a startup — a latent repeat of INC-2023-07.",
    severity: "major",
    evidence: "DOC-SOP-CDU-STARTUP-R2",
  },
];

export const SEED_FAULTS: Fault[] = [
  {
    id: "F-001",
    title: "Hydraulic Pressure Variance",
    description: "Module B7 is reporting a +/- 15% fluctuation from the baseline pressure reading over the last 45 minutes. This variance exceeds the standard deviation threshold defined in the operating envelope for this module. The sudden spike and drop cycles could indicate potential air ingress in the hydraulic lines or a failing accumulator diaphragm. We recommend initiating a leak detection sweep and monitoring the reservoir levels closely for the next 12 hours. If left unchecked, this could lead to a cascading failure of the downstream hydraulic actuators, resulting in an emergency shutdown of the entire segment.",
    severity: "critical",
    status: "approved",
    timestamp: Date.now() - 2 * 60 * 1000,
    reportedBy: "System",
  },
  {
    id: "F-002",
    title: "Scheduled Lubrication Overdue",
    description: "Conveyor assembly 04 is currently 8 hours past its scheduled inspection and lubrication cycle. The preventive maintenance schedule (PM-104A) dictates that this assembly receives high-temperature grease every 72 hours of continuous operation due to the harsh operating environment (high dust and elevated temperatures). Operating past the lubrication window significantly increases the risk of bearing seizure and unexpected downtime. Please prioritize this maintenance task on the next shift.",
    severity: "warning",
    status: "approved",
    timestamp: Date.now() - 45 * 60 * 1000,
    reportedBy: "System",
  },
  {
    id: "F-003",
    title: "Firmware Deployment Success",
    description: "Global update v2.4.1 has been completed successfully across all 124 Gateway nodes in Sector 4. The rollout proceeded without any rollback triggers activated. This update includes critical security patches for the embedded HTTP server and optimizations for the telemetry payload sizes, reducing network overhead by approximately 18%. Post-deployment checks confirm all nodes are actively reporting back to the central broker with steady heartbeat signals.",
    severity: "success",
    status: "approved",
    timestamp: Date.now() - 60 * 60 * 1000,
    reportedBy: "System",
  },
  {
    id: "F-004",
    title: "Grid Power Optimization",
    description: "Automatic load balancing has been successfully engaged for the peak efficiency period. The AI-driven energy management module detected a 12% drop in baseline power availability from the regional grid and proactively shed non-critical HVAC and auxiliary lighting loads to maintain stable voltage across production-critical machinery. This dynamic load shifting has stabilized the power factor at 0.98, ensuring zero interruption to the ongoing batch processes.",
    severity: "info",
    status: "approved",
    timestamp: Date.now() - 3 * 60 * 60 * 1000,
    reportedBy: "System",
  },
  {
    id: "F-005",
    title: "Abnormal Vibration on P-101A",
    description: "The vibration sensor on the outboard bearing of crude charge pump P-101A is reading a sustained velocity of 6.2 mm/s RMS. This exceeds the ISO 10816-3 alarm limit of 4.5 mm/s. The spectrum analysis shows a dominant peak at 1X running speed, heavily suggesting an unbalance condition or potential looseness in the foundation bolts. Given the recent history of mechanical seal failures on this asset, we strongly advise switching to the installed spare (P-101B) immediately and conducting a comprehensive mechanical inspection.",
    severity: "critical",
    status: "approved",
    timestamp: Date.now() - 5 * 60 * 60 * 1000,
    reportedBy: "Field Agent - R. Sharma",
  },
  {
    id: "F-006",
    title: "Fugitive Emission Detected",
    description: "The perimeter gas detection array (Sensor Node 12, Area C) picked up a transient VOC spike of 250 ppm. The spike lasted for approximately 40 seconds before dissipating due to local wind conditions. This is the second such spike recorded in this quadrant over the past 48 hours. The most likely source is a passing relief valve or a leaking flange on the high-pressure overhead vapor line. We have dispatched a drone for thermal imaging, but a manual sniff test by the environmental team is requested.",
    severity: "warning",
    status: "approved",
    timestamp: Date.now() - 12 * 60 * 60 * 1000,
    reportedBy: "System",
  }
];
