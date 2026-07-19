"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { CopilotAnswer } from "@/lib/types";
import { Card, Badge, ConfidenceMeter, SectionTitle } from "@/components/ui";
import {
  MessagesSquare,
  Send,
  Mic,
  FileText,
  ShieldAlert,
  AlertTriangle,
  Sparkles,
  Timer,
  Cpu,
} from "lucide-react";

interface Turn {
  q: string;
  a?: CopilotAnswer & { latencyMs?: number; gapId?: string };
  loading?: boolean;
}

const SAMPLES = [
  "Why does pump P-101A keep failing?",
  "What alignment tolerance does the OEM specify for P-101A?",
  "Are we compliant with OISD fire protection after the 2023 incident?",
  "What's the correct startup procedure for the crude charge pump?",
  "Can I bypass the seal flush to keep P-101A running?",
  "Who worked on P-101A and what did they find?",
];

export default function CopilotPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  async function ask(q: string) {
    if (!q.trim()) return;
    setInput("");
    const idx = turns.length;
    setTurns((t) => [...t, { q, loading: true }]);
    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      setTurns((t) => t.map((x, i) => (i === idx ? { q, a: data } : x)));
    } catch {
      setTurns((t) => t.map((x, i) => (i === idx ? { q, loading: false } : x)));
    }
  }

  function startVoice() {
    if (typeof window !== "undefined" && !window.isSecureContext) {
      alert(
        "Voice input requires a secure connection (HTTPS or localhost) to access the microphone.\n\n" +
        "To test on your mobile phone, you must either:\n" +
        "1. Use Chrome's local port forwarding (so you can use localhost:3000 on your phone)\n" +
        "2. Use a secure tunnel like 'npx localtunnel --port 3000'\n" +
        "3. Run Next.js with HTTPS enabled."
      );
      return;
    }
    const SR =
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition; SpeechRecognition?: new () => SpeechRecognition })
        .webkitSpeechRecognition ||
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition;
    if (!SR) {
      alert("Voice input isn't supported in this browser. Use Chrome for the field-tech voice demo.");
      return;
    }
    const rec = new SR();
    rec.lang = "en-IN";
    rec.interimResults = false;
    setListening(true);
    rec.onresult = (e: SpeechRecognitionEvent) => setInput(e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
  }

  return (
    <div className="flex h-[calc(100h-210px)] flex-col md:-mb-10 md:h-[calc(100vh-50px)]">
      <SectionTitle
        icon={<MessagesSquare size={18} />}
        title="Expert Knowledge Copilot"
        desc="Conversational answers across every connected document — cited, confidence-scored, and built for a technician's phone in the field."
      />

      {/* Conversation */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto pb-4">
        {turns.length === 0 && <EmptyState onPick={ask} />}
        {turns.map((t, i) => (
          <div key={i} className="space-y-3 fade-up">
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-cyan-400/15 px-4 py-2 text-sm text-cyan-900 dark:text-cyan-50">
                {t.q}
              </div>
            </div>
            {t.loading && <Thinking />}
            {t.a && <AnswerCard a={t.a} />}
          </div>
        ))}
      </div>

      {/* Composer */}
      <div className="border-t border-[var(--color-border)] pt-3">
        {/* <div className="mb-2 flex gap-2 overflow-x-auto pb-1 text-xs">
          {SAMPLES.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-1.5 text-[var(--color-muted)] transition hover:border-cyan-400/40 hover:text-cyan-700 dark:hover:text-cyan-700 dark:text-cyan-200"
            >
              {s}
            </button>
          ))}
        </div> */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="flex items-center gap-3"
        >
          <button
            type="button"
            onClick={startVoice}
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${
              listening ? "animate-pulse border-rose-400/50 text-rose-600 dark:text-rose-300" : "border-[var(--color-border)] text-[var(--color-muted)]"
            }`}
            aria-label="Voice input"
          >
            <Mic size={18} />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about equipment, procedures, failures, compliance…"
            className="h-12 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 text-sm outline-none focus:border-cyan-400/50"
          />
          <button
            type="submit"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cyan-400 text-black transition hover:bg-cyan-300"
            aria-label="Send"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <Card className="p-6 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-cyan-400/20 to-emerald-400/20 text-cyan-700 dark:text-cyan-300">
        <Sparkles size={22} />
      </div>
      <h2 className="mt-3 text-sm font-semibold">Ask the plant anything</h2>
      <p className="mx-auto mt-1 max-w-md text-xs text-[var(--color-muted)]">
        Answers are grounded in the actual documents with source citations and a confidence score.
        On safety-critical requests, Sutradhar refuses to guess.
      </p>
      <div className="mx-auto mt-4 grid max-w-md gap-2 sm:grid-cols-2">
        {SAMPLES.slice(0, 4).map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 py-2 text-left text-xs text-[var(--color-muted)] transition hover:border-cyan-400/40 hover:text-cyan-700 dark:hover:text-cyan-800 dark:text-cyan-100"
          >
            {s}
          </button>
        ))}
      </div>
    </Card>
  );
}

function Thinking() {
  return (
    <Card className="w-fit p-3">
      <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
        <span className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-cyan-400 pulse-dot"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </span>
        Retrieving & reasoning over the corpus…
      </div>
    </Card>
  );
}

function AnswerCard({ a }: { a: CopilotAnswer & { latencyMs?: number; gapId?: string } }) {
  return (
    <Card
      className={`overflow-hidden ${
        a.refused ? "border-amber-400/40" : a.band === "insufficient" ? "border-rose-400/30" : ""
      }`}
    >
      {a.refused && (
        <div className="flex items-center gap-2 border-b border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs text-amber-700 dark:text-amber-200">
          <ShieldAlert size={15} /> Safety guardrail engaged — request to bypass a protection was declined.
        </div>
      )}
      <div className="p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <ConfidenceMeter value={a.confidence} band={a.band} />
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-[var(--color-muted)]">
            <Cpu size={12} /> {a.engine === "llm" ? "LLM-synthesised" : "Grounded fallback"}
          </span>
          {a.latencyMs != null && (
            <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-muted)]">
              <Timer size={12} /> {(a.latencyMs / 1000).toFixed(2)}s
            </span>
          )}
        </div>

        <AnswerText text={a.answer} citations={a.citations} />

        {a.gapId && (
          <Link
            href="/gaps"
            className="mt-3 flex items-center gap-2 rounded-lg border border-rose-400/25 bg-rose-400/[0.06] p-2.5 text-xs text-rose-700 dark:text-rose-200 transition hover:bg-rose-400/10"
          >
            <Sparkles size={13} className="shrink-0" />
            Logged as a knowledge gap. Know the answer? Capture it before it&apos;s lost →
          </Link>
        )}

        {a.conflicts && a.conflicts.length > 0 && (
          <div className="mt-3 rounded-lg border border-amber-400/25 bg-amber-400/[0.06] p-2.5 text-xs text-amber-700 dark:text-amber-200">
            <div className="mb-1 flex items-center gap-1.5 font-medium">
              <AlertTriangle size={13} /> Version reconciliation
            </div>
            <ul className="list-disc space-y-0.5 pl-4">
              {a.conflicts.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        {a.relatedEntities.length > 0 && (
          <div className="mt-3">
            <div className="mb-1 text-[11px] uppercase tracking-wide text-[var(--color-muted)]">Related in graph</div>
            <div className="flex flex-wrap gap-1.5">
              {a.relatedEntities.map((e) => (
                <Link key={e} href={`/graph?focus=${encodeURIComponent(e)}`}>
                  <Badge color="accent" className="hover:bg-cyan-400/20">{e}</Badge>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Citations */}
      {a.citations.length > 0 && (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-panel-2)]/50 p-4">
          <div className="mb-2 text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
            Sources ({a.citations.length})
          </div>
          <div className="space-y-2">
            {a.citations.map((c, i) => (
              <Link
                key={i}
                href={`/documents?id=${c.docId}`}
                className="block rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] p-2.5 transition hover:border-cyan-400/40"
              >
                <div className="flex items-center gap-2 text-xs">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-cyan-400/15 text-[10px] font-semibold text-cyan-700 dark:text-cyan-300">
                    {i + 1}
                  </span>
                  <FileText size={13} className="text-[var(--color-muted)]" />
                  <span className="truncate font-medium">{c.docTitle}</span>
                  <Badge color="muted" className="ml-auto shrink-0">{c.docType}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 pl-7 text-[11px] text-[var(--color-muted)]">
                  <span className="text-[var(--color-fg)]/70">{c.locator}:</span> {c.snippet}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// render inline [[n]] markers as citation pills
function AnswerText({ text, citations }: { text: string; citations: { docTitle: string }[] }) {
  const parts = text.split(/(\[\[\d+\]\])/g);
  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-fg)]/95">
      {parts.map((p, i) => {
        const m = p.match(/\[\[(\d+)\]\]/);
        if (m) {
          const n = Number(m[1]);
          return (
            <sup
              key={i}
              title={citations[n - 1]?.docTitle}
              className="mx-0.5 cursor-help rounded bg-cyan-400/20 px-1 text-[10px] font-semibold text-cyan-700 dark:text-cyan-300"
            >
              {n}
            </sup>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </div>
  );
}
