import { NextRequest, NextResponse } from "next/server";
import { computeCompliance } from "@/lib/compliance";
import { getStore } from "@/lib/store";
import { PLANT } from "@/lib/data/seed";
import { verifyToken, SESSION_COOKIE } from "@/lib/session";
import { getUser } from "@/lib/users";

export const runtime = "nodejs";
export const maxDuration = 60;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Self-contained, print-ready audit evidence pack (PS: "auto-generating
// compliance evidence packages for audits"). Opens in a new tab; print to PDF.
export async function GET(req: NextRequest) {
  const session = await verifyToken(req.cookies.get(SESSION_COOKIE)?.value);
  const generatedBy = session ? getUser(session.username)?.displayName ?? session.username : "—";
  const items = await computeCompliance();
  const store = getStore();
  const docTitle = (id?: string) =>
    id ? store.documents.find((d) => d.id === id)?.title ?? id : "—";

  const counts = {
    total: items.length,
    compliant: items.filter((i) => i.status === "compliant").length,
    atRisk: items.filter((i) => i.status === "at-risk").length,
    gap: items.filter((i) => i.status === "gap").length,
    critical: items.filter((i) => i.severity === "critical" && i.status !== "compliant").length,
  };
  const now = new Date();

  const statusColor = { compliant: "#059669", "at-risk": "#d97706", gap: "#dc2626" } as const;
  const statusLabel = { compliant: "COMPLIANT", "at-risk": "AT RISK", gap: "GAP" } as const;

  const rows = items
    .map(
      (i) => `
    <section class="finding">
      <div class="finding-head">
        <span class="pill" style="background:${statusColor[i.status]}">${statusLabel[i.status]}</span>
        <strong>${esc(i.regulation)}</strong>
        <span class="sev sev-${i.severity}">${i.severity.toUpperCase()}</span>
      </div>
      <table>
        <tr><th>Requirement</th><td>${esc(i.requirement)}</td></tr>
        <tr><th>Applies to</th><td>${esc(i.appliesTo.join(", ") || "—")}</td></tr>
        <tr><th>Finding</th><td>${esc(i.finding)}</td></tr>
        <tr><th>Evidence</th><td>${esc(docTitle(i.evidence))}${i.evidence ? ` <span class="docid">(${esc(i.evidence)})</span>` : ""}</td></tr>
        ${i.dueDate ? `<tr><th>Target date</th><td>${esc(i.dueDate)}</td></tr>` : ""}
      </table>
    </section>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Compliance Evidence Pack — ${esc(PLANT.name)}</title>
<style>
  * { box-sizing: border-box; margin: 0; }
  body { font: 13px/1.55 -apple-system, "Segoe UI", Roboto, sans-serif; color: #111827; padding: 40px; max-width: 860px; margin: 0 auto; background: #fff; }
  header { border-bottom: 3px solid #0e7490; padding-bottom: 16px; margin-bottom: 20px; }
  h1 { font-size: 20px; color: #0e7490; }
  .meta { color: #6b7280; font-size: 12px; margin-top: 6px; }
  .summary { display: flex; gap: 12px; margin: 18px 0 26px; }
  .stat { flex: 1; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; text-align: center; }
  .stat b { display: block; font-size: 22px; }
  .finding { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; margin-bottom: 14px; page-break-inside: avoid; }
  .finding-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .pill { color: #fff; font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 99px; letter-spacing: .04em; }
  .sev { font-size: 10px; font-weight: 700; margin-left: auto; }
  .sev-critical { color: #dc2626; } .sev-major { color: #d97706; } .sev-minor { color: #6b7280; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; vertical-align: top; width: 110px; color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: .03em; padding: 3px 10px 3px 0; }
  td { padding: 3px 0; }
  .docid { color: #9ca3af; font-size: 11px; }
  .sign { margin-top: 40px; display: flex; gap: 40px; }
  .sign div { flex: 1; border-top: 1px solid #9ca3af; padding-top: 6px; font-size: 11px; color: #6b7280; }
  .print-btn { position: fixed; top: 14px; right: 14px; background: #0e7490; color: #fff; border: 0; border-radius: 8px; padding: 9px 16px; font-size: 13px; cursor: pointer; }
  footer { margin-top: 30px; font-size: 10px; color: #9ca3af; }
  @media print { .print-btn { display: none; } body { padding: 0; } }
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
<header>
  <h1>Compliance Evidence Pack</h1>
  <div class="meta">
    ${esc(PLANT.name)} · ${esc(PLANT.unit)} · ${esc(PLANT.capacity)}<br>
    Generated ${now.toLocaleString("en-IN")} by ${esc(generatedBy)} · Sutradhar Unified Asset &amp; Operations Brain
  </div>
</header>
<div class="summary">
  <div class="stat"><b>${counts.total}</b>requirements assessed</div>
  <div class="stat"><b style="color:#059669">${counts.compliant}</b>compliant</div>
  <div class="stat"><b style="color:#d97706">${counts.atRisk}</b>at risk</div>
  <div class="stat"><b style="color:#dc2626">${counts.gap}</b>gaps (${counts.critical} critical)</div>
</div>
${rows}
<div class="sign">
  <div>Prepared by (Sutradhar operator)</div>
  <div>Reviewed by (HSE / QA)</div>
  <div>Approved by (Plant Manager)</div>
</div>
<footer>
  Every finding above is grounded in the plant's connected document corpus; evidence citations reference
  controlled documents retrievable in Sutradhar. Auto-generated — verify before statutory submission.
</footer>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
