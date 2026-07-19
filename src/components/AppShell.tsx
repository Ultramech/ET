"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  MessagesSquare,
  Share2,
  Wrench,
  ShieldCheck,
  Lightbulb,
  Upload,
  FileText,
  Menu,
  X,
  Cpu,
  Gauge,
  LogOut,
  HardHat,
  BrainCircuit,
  ShieldCheck as AdminIcon,
  Moon,
  Sun,
} from "lucide-react";

interface Me {
  role: "admin" | "user";
  username: string;
  displayName: string;
  title: string;
}

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/copilot", label: "Expert Copilot", icon: MessagesSquare },
  { href: "/graph", label: "Knowledge Graph", icon: Share2 },
  { href: "/maintenance", label: "Maintenance & RCA", icon: Wrench },
  { href: "/compliance", label: "Compliance", icon: ShieldCheck },
  { href: "/lessons", label: "Lessons Learned", icon: Lightbulb },
  { href: "/gaps", label: "Knowledge Gaps", icon: BrainCircuit },
  { href: "/documents", label: "Documents", icon: FileText },
];

const ADMIN_NAV = [
  { href: "/admin", label: "Admin Dashboard", icon: Gauge },
  { href: "/ingest", label: "Ingest", icon: Upload },
];

const MOBILE_NAV = NAV.filter((n) =>
  ["/", "/copilot", "/graph", "/maintenance", "/compliance"].includes(n.href)
);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [llm, setLlm] = useState<boolean | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const isLogin = pathname === "/login";

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (isLogin) return;
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setLlm(!!d.llm))
      .catch(() => setLlm(false));
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setMe(d))
      .catch(() => {});
  }, [isLogin]);

  if (isLogin) return <>{children}</>;

  const nav = me?.role === "admin" ? [...NAV, ...ADMIN_NAV] : NAV;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className="sidebar-shadow sticky top-0 hidden h-screen w-[220px] shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-panel)] md:flex"
      >
        <Brand />

        <div className="px-4 pb-1 pt-3">
          <span className="section-label">Main Menu</span>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-1">
          {nav.map((n) => (
            <NavItem key={n.href} {...n} active={pathname === n.href} />
          ))}
        </nav>

        <UserChip me={me} onLogout={logout} />
        <ThemeToggle />
        <EngineStatus llm={llm} />
      </aside>

      {/* Mobile top bar */}
      <div
        className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-panel)]/96 px-4 py-3 backdrop-blur md:hidden"
        style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}
      >
        <Brand compact />
        <div className="flex items-center gap-1">
          <ThemeToggle compact />
          <button onClick={() => setOpen((v) => !v)} aria-label="Menu" className="rounded-full p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-panel-2)] transition">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 top-[52px] z-20 overflow-y-auto bg-[var(--color-panel)] p-4 md:hidden">
          <nav className="space-y-0.5">
            {nav.map((n) => (
              <NavItem key={n.href} {...n} active={pathname === n.href} />
            ))}
          </nav>
          <div className="mt-4">
            <UserChip me={me} onLogout={logout} />
            <ThemeToggle />
            <EngineStatus llm={llm} />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="grid-bg min-h-screen min-w-0 flex-1 overflow-x-hidden px-4 pb-24 pt-[68px] md:px-8 md:pb-10 md:pt-8">
        <div className="mx-auto w-full min-w-0 max-w-6xl">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[var(--color-border)] bg-[var(--color-panel)]/97 backdrop-blur md:hidden"
        style={{ boxShadow: "0 -1px 8px rgba(0,0,0,0.06)" }}
      >
        {MOBILE_NAV.map((n) => {
          const Icon = n.icon;
          const active = pathname === n.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition",
                active ? "text-[var(--color-accent)]" : "text-[var(--color-muted)]"
              )}
            >
              <div
                className={cn(
                  "grid h-[26px] w-[52px] place-items-center rounded-full transition-colors",
                  active ? "bg-[var(--color-panel-2)] text-[var(--color-accent)]" : "bg-transparent text-[var(--color-muted)]"
                )}
              >  <Icon size={20} />
              </div>
              {n.label.split(" ")[0]}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", compact ? "" : "px-4 py-4 pb-2")}>
      <div
        className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl text-[15px] font-bold text-white"
        style={{
          background: "linear-gradient(135deg, #1A73E8 0%, #0D47A1 100%)",
          boxShadow: "0 2px 8px rgba(26,115,232,0.35)",
        }}
      >
        सू
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="text-[13px] font-bold tracking-wide text-[var(--color-fg)]">Sutradhar</div>
          <div className="text-[10px] font-medium text-[var(--color-muted)]">Operations Brain</div>
        </div>
      )}
      {compact && (
        <div className="text-[13px] font-bold text-[var(--color-fg)]">Sutradhar</div>
      )}
    </Link>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-3 rounded-2xl px-3 py-2 text-[13px] font-medium transition-all duration-150",
        active
          ? "nav-active-bar bg-[var(--color-panel-2)] text-[var(--color-accent)]"
          : "text-[var(--color-muted)] hover:bg-[var(--color-panel-2)] hover:text-[var(--color-fg)]"
      )}
    >
      <span
        className={cn(
          "grid h-7 w-7 shrink-0 place-items-center rounded-xl transition-colors",
          active ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]" : "text-[var(--color-muted)]"
        )}
      >
        <Icon size={16} />
      </span>
      {label}
    </Link>
  );
}

function UserChip({ me, onLogout }: { me: Me | null; onLogout: () => void }) {
  if (!me) return null;
  const admin = me.role === "admin";
  return (
    <div className="border-t border-[var(--color-border)] px-3 py-3">
      <div className="flex items-center gap-2.5 rounded-2xl px-1">
        <div
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold",
            admin ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
          )}
        >
          {admin ? <AdminIcon size={14} /> : <HardHat size={14} />}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[12px] font-semibold text-[var(--color-fg)]">{me.displayName}</div>
          <div className="truncate text-[10px] text-[var(--color-muted)]">
            {me.title} · {admin ? "Admin" : "User"}
          </div>
        </div>
        <button
          onClick={onLogout}
          title="Sign out"
          className="rounded-full p-1.5 text-[var(--color-muted)] transition hover:bg-[var(--color-danger)]/15 hover:text-[var(--color-danger)]"
        >
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );
}

function EngineStatus({ llm }: { llm: boolean | null }) {
  return (
    <div className="border-t border-[var(--color-border)] px-4 py-3">
      <div className="flex items-center gap-2 text-[12px] text-[var(--color-muted)]">
        <Cpu size={13} />
        <span className="font-medium">AI engine</span>
        <span
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
            llm
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-[var(--color-warn)]/30 bg-[var(--color-warn)]/10 text-[var(--color-warn)]"
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full pulse-dot", llm ? "bg-[#34A853]" : "bg-[#FBBC04]")} />
          {llm === null ? "…" : llm ? "LLM" : "Fallback"}
        </span>
      </div>
    </div>
  );
}

function ThemeToggle({ compact }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const isDark = theme === "dark";

  if (compact) {
    return (
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label="Toggle theme"
        className="rounded-full p-1.5 text-[var(--color-muted)] transition hover:bg-[var(--color-panel-2)]"
      >
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>
    );
  }

  return (
    <div className="px-3 pb-2">
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="flex w-full items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel-2)] p-2 text-xs transition hover:border-[var(--color-accent)]/40"
      >
        <div className="grid h-6 w-6 place-items-center rounded-lg bg-[var(--color-panel)] text-[var(--color-muted)] shadow-sm">
          {isDark ? <Sun size={13} /> : <Moon size={13} />}
        </div>
        <div className="flex flex-col items-start leading-tight">
          <span className="font-semibold text-[var(--color-fg)]">
            {isDark ? "Light Mode" : "Dark Mode"}
          </span>
          <span className="text-[10px] text-[var(--color-muted)]">
            {isDark ? "Switch to light theme" : "Switch to dark theme"}
          </span>
        </div>
      </button>
    </div>
  );
}
