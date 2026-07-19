"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, Badge } from "@/components/ui";
import { Loader2, LogIn, ShieldCheck, HardHat } from "lucide-react";

function LoginForm() {
  const params = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function done(data: { role: string }) {
    const from = params.get("from");
    // hard navigation so the shell re-reads the session
    window.location.href =
      data.role === "admin" ? "/admin" : from && !from.startsWith("/admin") && from !== "/ingest" ? from : "/";
  }

  async function login(u: string, p: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password: p }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }
      done(data);
    } catch {
      setError("Network error — is the server running?");
      setLoading(false);
    }
  }

  async function signup() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, displayName, title }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Signup failed");
        setLoading(false);
        return;
      }
      done(data);
    } catch {
      setError("Network error — is the server running?");
      setLoading(false);
    }
  }

  return (
    <div className="grid-bg flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-xl font-bold text-black">
            सू
          </div>
          <h1 className="mt-3 text-xl font-semibold tracking-tight">Sutradhar</h1>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Unified Asset &amp; Operations Brain · Bharat Refinery Ltd, Vadodara
          </p>
        </div>

        <Card className="p-5">
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] p-1 text-xs">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError("");
                }}
                className={`rounded-md py-1.5 font-medium transition ${
                  mode === m ? "bg-cyan-400/15 text-cyan-700 dark:text-cyan-300" : "text-[var(--color-muted)]"
                }`}
              >
                {m === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (mode === "login") login(username, password);
              else signup();
            }}
            className="space-y-3"
          >
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoComplete="username"
              className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 text-sm outline-none focus:border-cyan-400/50"
            />
            {mode === "signup" && (
              <>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Full name (e.g. S. Iyer)"
                  className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 text-sm outline-none focus:border-cyan-400/50"
                />
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Role title (e.g. Shift Supervisor)"
                  className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 text-sm outline-none focus:border-cyan-400/50"
                />
              </>
            )}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 text-sm outline-none focus:border-cyan-400/50"
            />
            {error && <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p>}
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 py-2.5 text-sm font-medium text-black transition hover:bg-cyan-300 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
              {mode === "login" ? "Sign in" : "Create account & sign in"}
            </button>
            {mode === "signup" && (
              <p className="text-center text-[10px] text-[var(--color-muted)]">
                New accounts start as field-engineer users; an admin can promote them.
              </p>
            )}
          </form>

          <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
            <div className="h-px flex-1 bg-[var(--color-border)]" /> demo accounts
            <div className="h-px flex-1 bg-[var(--color-border)]" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => login("user", "user")}
              disabled={loading}
              className="flex flex-col items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] p-3 text-xs transition hover:border-cyan-400/40 disabled:opacity-50"
            >
              <HardHat size={16} className="text-cyan-700 dark:text-cyan-300" />
              <span className="font-medium">Field Engineer</span>
              <span className="text-[10px] text-[var(--color-muted)]">user / user</span>
            </button>
            <button
              onClick={() => login("admin", "admin")}
              disabled={loading}
              className="flex flex-col items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] p-3 text-xs transition hover:border-emerald-400/40 disabled:opacity-50"
            >
              <ShieldCheck size={16} className="text-emerald-700 dark:text-emerald-300" />
              <span className="font-medium">Admin</span>
              <span className="text-[10px] text-[var(--color-muted)]">admin / admin</span>
            </button>
          </div>
        </Card>

        <div className="flex justify-center gap-2">
          <Badge color="accent">Cited answers</Badge>
          <Badge color="green">Safety guardrails</Badge>
          <Badge color="purple">Knowledge graph</Badge>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
