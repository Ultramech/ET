import { getStore } from "./store";

// ---------------------------------------------------------------------------
// Lessons Learned & Failure Intelligence. Scans the corpus for recurring
// signatures — the same failure mode hitting equipment more than once, or a
// mode shared across similar equipment — and turns them into proactive warnings
// that would otherwise stay buried in individual work orders and inboxes.
// ---------------------------------------------------------------------------

export interface Lesson {
  id: string;
  title: string;
  pattern: string;
  severity: "high" | "medium" | "low";
  equipment: string[];
  failureMode: string;
  occurrences: number;
  sources: string[];
  recommendation: string;
  proactiveWarning: string;
}

export function deriveLessons(): Lesson[] {
  const store = getStore();
  const lessons: Lesson[] = [];

  // 1) recurring failure mode on a single asset
  const exhibits = store.edges.filter((e) => e.type === "EXHIBITS");
  for (const edge of exhibits) {
    const occurrences = edge.evidence?.length ?? 0;
    if (occurrences >= 2) {
      const eq = store.nodes.find((n) => n.id === edge.source);
      lessons.push({
        id: `L-${edge.source}-${edge.target}`.replace(/\s+/g, "-"),
        title: `Recurring ${edge.target} on ${edge.source}`,
        pattern: `${edge.source} has experienced ${edge.target} ${occurrences} times, indicating an unaddressed root cause rather than random component wear.`,
        severity: occurrences >= 3 ? "high" : "medium",
        equipment: [edge.source],
        failureMode: edge.target,
        occurrences,
        sources: edge.evidence ?? [],
        recommendation:
          "Trigger a formal RCA (OISD-GDN-119 Cl. 5.2) and fix the underlying mechanical cause, not just the failed component.",
        proactiveWarning: `Before the next restart of ${edge.source}, verify the permanent corrective action is closed — otherwise the ${edge.target.toLowerCase()} signature is expected to repeat.`,
      });
    }
  }

  // 2) same failure mode across multiple assets (fleet-wide pattern)
  const modeToAssets = new Map<string, Set<string>>();
  for (const edge of exhibits) {
    if (!modeToAssets.has(edge.target)) modeToAssets.set(edge.target, new Set());
    modeToAssets.get(edge.target)!.add(edge.source);
  }
  for (const [mode, assets] of modeToAssets) {
    if (assets.size >= 2) {
      lessons.push({
        id: `L-FLEET-${mode}`.replace(/\s+/g, "-"),
        title: `Fleet-wide pattern: ${mode}`,
        pattern: `${mode} observed on ${assets.size} assets (${[...assets].join(", ")}). May indicate a common design, installation or operating-practice cause.`,
        severity: "medium",
        equipment: [...assets],
        failureMode: mode,
        occurrences: assets.size,
        sources: exhibits.filter((e) => e.target === mode).flatMap((e) => e.evidence ?? []),
        recommendation:
          "Review shared root cause across the fleet; propagate the fix and the alignment/monitoring standard to all similar assets.",
        proactiveWarning: `Apply the lesson from the most-affected asset to sister assets showing ${mode.toLowerCase()} early indicators before they escalate.`,
      });
    }
  }

  const rank = { high: 0, medium: 1, low: 2 };
  return lessons.sort((a, b) => rank[a.severity] - rank[b.severity] || b.occurrences - a.occurrences);
}
