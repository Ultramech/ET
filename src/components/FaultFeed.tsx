"use client";

import { useState } from "react";
import { AlertTriangle, AlertCircle, CheckCircle2, Zap, ChevronRight, X, ArrowRight } from "lucide-react";
import type { Fault } from "@/lib/types";
import { cn } from "@/lib/utils";
import { reportFault, approveFault, resolveFault, requestResolveFault, denyResolveFault } from "@/app/actions";
import { Badge } from "@/components/ui";

function formatTimeAgo(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function FaultFeed({ faults, isAdmin }: { faults: Fault[]; isAdmin: boolean }) {
  const [filter, setFilter] = useState<"all" | "critical" | "pending">("all");
  const [selectedFault, setSelectedFault] = useState<Fault | null>(null);
  const [isReporting, setIsReporting] = useState(false);

  // Form state
  const [reportTitle, setReportTitle] = useState("");
  const [reportDesc, setReportDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter logic
  const visibleFaults = faults.filter((f) => {
    if (f.status === "pending" && !isAdmin) return false; // Non-admins don't see pending
    if (filter === "critical") return f.severity === "critical" && (f.status === "approved" || f.status === "resolve_requested");
    if (filter === "pending") return f.status === "pending" || f.status === "resolve_requested";
    if (f.status === "resolved") return false; // Hide resolved by default in the main view
    return true;
  });

  const getIcon = (severity: Fault["severity"]) => {
    switch (severity) {
      case "critical": return <AlertCircle size={20} />;
      case "warning": return <AlertTriangle size={20} />;
      case "success": return <CheckCircle2 size={20} />;
      case "info": return <Zap size={20} />;
    }
  };

  const getColorClass = (severity: Fault["severity"]) => {
    switch (severity) {
      case "critical": return "bg-[var(--color-danger)]/15 text-[var(--color-danger)]";
      case "warning": return "bg-[var(--color-warn)]/15 text-[var(--color-warn)]";
      case "success": return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
      case "info": return "bg-[var(--color-accent)]/15 text-[var(--color-accent)]";
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await reportFault(reportTitle, reportDesc, isAdmin ? "Admin User" : "Field Agent");
    setReportTitle("");
    setReportDesc("");
    setIsSubmitting(false);
    setIsReporting(false);
  };

  const handleApprove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await approveFault(id);
  };

  return (
    <div className="card-md flex flex-col p-5 bg-[var(--color-panel)] border-[var(--color-border)] shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
        <h2 className="text-[18px] font-bold text-[var(--color-fg)]">Fault Feed</h2>
        
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => setIsReporting(true)}
            className="text-[12px] font-medium px-3 py-1.5 rounded-full bg-[var(--color-accent)] text-white hover:opacity-90 transition"
          >
            Report Problem
          </button>
          
          <div className="flex bg-[var(--color-panel-2)] rounded-full p-1 border border-[var(--color-border)]">
            <button
              onClick={() => setFilter("all")}
              className={cn("text-[11px] font-semibold px-3 py-1 rounded-full transition", filter === "all" ? "bg-[var(--color-panel)] text-[var(--color-fg)] shadow-sm" : "text-[var(--color-muted)] hover:text-[var(--color-fg)]")}
            >
              All Types
            </button>
            <button
              onClick={() => setFilter("critical")}
              className={cn("text-[11px] font-semibold px-3 py-1 rounded-full transition", filter === "critical" ? "bg-[var(--color-panel)] text-[var(--color-fg)] shadow-sm" : "text-[var(--color-muted)] hover:text-[var(--color-fg)]")}
            >
              Critical Only
            </button>
            {isAdmin && (
              <button
                onClick={() => setFilter("pending")}
                className={cn("text-[11px] font-semibold px-3 py-1 rounded-full transition", filter === "pending" ? "bg-[var(--color-panel)] text-[var(--color-fg)] shadow-sm" : "text-[var(--color-muted)] hover:text-[var(--color-fg)]")}
              >
                Pending
                {faults.some(f => f.status === "pending" || f.status === "resolve_requested") && (
                  <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-danger)]"></span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col max-h-[400px] overflow-y-auto mt-2 space-y-1 pr-1">
        {visibleFaults.length === 0 ? (
          <div className="py-8 text-center text-sm text-[var(--color-muted)]">No faults to display.</div>
        ) : (
          visibleFaults.map((fault) => (
            <div 
              key={fault.id}
              onClick={() => setSelectedFault(fault)}
              className="flex items-start gap-4 p-3 rounded-xl hover:bg-[var(--color-panel-2)] transition cursor-pointer border border-transparent hover:border-[var(--color-border)]"
            >
              <div className={cn("shrink-0 rounded-xl p-2.5", getColorClass(fault.severity))}>
                {getIcon(fault.severity)}
              </div>
              
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[13px] font-bold text-[var(--color-fg)] truncate flex items-center gap-2">
                    {fault.title}
                    {fault.status === "pending" && <Badge color="warn">Pending Approval</Badge>}
                    {fault.status === "resolve_requested" && <Badge color="green">Pending Solve Approval</Badge>}
                  </h3>
                  <span className="text-[11px] text-[var(--color-muted)] shrink-0">{formatTimeAgo(fault.timestamp)}</span>
                </div>
                <p className="mt-1 text-[12px] text-[var(--color-muted)] line-clamp-1">{fault.description}</p>
                {(fault.status === "pending" || fault.status === "resolve_requested") && isAdmin && (
                  <div className="mt-2 flex gap-2">
                    {fault.status === "pending" && (
                      <button 
                        onClick={(e) => handleApprove(fault.id, e)}
                        className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-3 py-1 rounded-full hover:bg-emerald-500/25 transition"
                      >
                        Accept & Publish
                      </button>
                    )}
                    {fault.status === "resolve_requested" && (
                      <>
                        <button 
                          onClick={async (e) => { e.stopPropagation(); await resolveFault(fault.id); }}
                          className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-3 py-1 rounded-full hover:bg-emerald-500/25 transition"
                        >
                          Approve Solve
                        </button>
                        <button 
                          onClick={async (e) => { e.stopPropagation(); await denyResolveFault(fault.id); }}
                          className="text-[11px] font-bold text-[var(--color-danger)] bg-[var(--color-danger)]/15 px-3 py-1 rounded-full hover:bg-[var(--color-danger)]/25 transition"
                        >
                          Deny Solve
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              <div className="shrink-0 self-center text-[var(--color-muted)] pl-2">
                <ChevronRight size={16} />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--color-border)] text-center">
        <button className="text-[12px] font-semibold text-[var(--color-accent)] hover:underline">
          View Comprehensive History
        </button>
      </div>

      {/* Fault Details Modal */}
      {selectedFault && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[var(--color-panel)] rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start p-5 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <div className={cn("shrink-0 rounded-xl p-2.5", getColorClass(selectedFault.severity))}>
                  {getIcon(selectedFault.severity)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--color-fg)]">{selectedFault.title}</h2>
                  <p className="text-[12px] text-[var(--color-muted)]">Reported by {selectedFault.reportedBy} · {formatTimeAgo(selectedFault.timestamp)}</p>
                </div>
              </div>
              <button onClick={() => setSelectedFault(null)} className="p-1.5 rounded-full hover:bg-[var(--color-panel-2)] text-[var(--color-muted)] transition">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 text-sm text-[var(--color-fg)] leading-relaxed max-h-[300px] overflow-y-auto">
              {selectedFault.description}
            </div>

            <div className="p-5 border-t border-[var(--color-border)] bg-[var(--color-panel-2)] flex justify-end gap-3">
              {selectedFault.status === "resolve_requested" ? (
                isAdmin ? (
                  <>
                    <button 
                      onClick={async () => { await resolveFault(selectedFault.id); setSelectedFault(null); }}
                      className="px-4 py-2 rounded-xl text-[13px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-transparent hover:bg-emerald-500/25 transition"
                    >
                      Approve Solve
                    </button>
                    <button 
                      onClick={async () => { await denyResolveFault(selectedFault.id); setSelectedFault(null); }}
                      className="px-4 py-2 rounded-xl text-[13px] font-semibold text-[var(--color-danger)] border border-transparent bg-[var(--color-danger)]/15 hover:bg-[var(--color-danger)]/25 transition"
                    >
                      Deny Solve
                    </button>
                  </>
                ) : (
                  <button disabled className="px-4 py-2 rounded-xl text-[13px] font-semibold text-[var(--color-muted)] border border-[var(--color-border)] bg-[var(--color-panel)] cursor-not-allowed">
                    Solve Requested...
                  </button>
                )
              ) : (
                <button 
                  onClick={async () => {
                    if (isAdmin) {
                      await resolveFault(selectedFault.id);
                    } else {
                      await requestResolveFault(selectedFault.id);
                    }
                    setSelectedFault(null);
                  }}
                  className="px-4 py-2 rounded-xl text-[13px] font-semibold text-[var(--color-fg)] border border-[var(--color-border)] bg-[var(--color-panel)] hover:bg-[var(--color-panel-2)] transition"
                >
                  Mark as Solved
                </button>
              )}
              <button className="px-4 py-2 rounded-xl text-[13px] font-semibold bg-[var(--color-danger)] text-white hover:opacity-90 transition flex items-center gap-2">
                Run RCA <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Problem Modal */}
      {isReporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[var(--color-panel)] rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-[var(--color-border)]">
              <h2 className="text-lg font-bold text-[var(--color-fg)]">Report a Problem</h2>
              <button onClick={() => setIsReporting(false)} className="p-1.5 rounded-full hover:bg-[var(--color-panel-2)] text-[var(--color-muted)] transition">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleReport} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-[12px] font-bold text-[var(--color-muted)] mb-1 uppercase tracking-wider">Problem Title</label>
                <input 
                  type="text" 
                  required
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="w-full bg-[var(--color-panel-2)] border border-[var(--color-border)] rounded-xl px-4 py-2 text-[14px] text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-accent)] transition"
                  placeholder="e.g., Abnormal vibration on P-101A"
                />
              </div>
              
              <div>
                <label className="block text-[12px] font-bold text-[var(--color-muted)] mb-1 uppercase tracking-wider">Description</label>
                <textarea 
                  required
                  rows={4}
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  className="w-full bg-[var(--color-panel-2)] border border-[var(--color-border)] rounded-xl px-4 py-2 text-[14px] text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-accent)] transition resize-none"
                  placeholder="Provide details about the issue..."
                />
              </div>
              
              {!isAdmin && (
                <div className="text-[12px] text-[var(--color-muted)] bg-[var(--color-warn)]/10 text-[var(--color-warn)] p-3 rounded-xl flex items-start gap-2">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <p>Your report will be submitted to the Admin team for review before appearing in the main feed.</p>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-2">
                <button 
                  type="button"
                  onClick={() => setIsReporting(false)}
                  className="px-4 py-2 rounded-xl text-[13px] font-semibold text-[var(--color-fg)] hover:bg-[var(--color-panel-2)] transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-[13px] font-semibold bg-[var(--color-accent)] text-white hover:opacity-90 transition disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
