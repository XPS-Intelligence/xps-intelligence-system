"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Brain,
  Building2,
  Crown,
  FileText,
  Globe2,
  LayoutDashboard,
  Mail,
  Menu,
  MessageSquareText,
  Mic,
  PanelLeft,
  Search,
  Shield,
  Sparkles,
  Target,
  Users,
  Workflow,
} from "lucide-react";

import heroBg from "@/assets/hero-bg.jpg";
import xpsLogo from "@/assets/xps-logo.png";

type RouteCopy = {
  title: string;
  subtitle: string;
  summary: string;
  metrics: { label: string; value: string }[];
  notes: string[];
};

const workspaceRoutes: Record<string, RouteCopy> = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Operational briefing",
    summary: "A concise command view for live pipeline, activity, and team momentum.",
    metrics: [
      { label: "Active leads", value: "0" },
      { label: "Pipeline value", value: "$0" },
      { label: "Open proposals", value: "0" },
      { label: "Close rate", value: "0%" },
    ],
    notes: ["Awaiting live lead data", "Conversion watch begins after first ingest", "High-priority accounts will appear here"],
  },
  "/leads": {
    title: "Leads",
    subtitle: "Lead intelligence",
    summary: "Centralize fresh inbound and outbound opportunities with signal-rich context.",
    metrics: [
      { label: "New today", value: "0" },
      { label: "Hot", value: "0" },
      { label: "Qualified", value: "0%" },
      { label: "Average score", value: "0" },
    ],
    notes: ["Territory filters", "Scoring trends will appear after ingest", "Ownership queue initializes from first candidates"],
  },
  "/ai-assistant": {
    title: "AI Assistant",
    subtitle: "Rep copilot",
    summary: "A role-aware assistant for prep, follow-up, objection handling, and next-best actions.",
    metrics: [
      { label: "Drafts generated", value: "0" },
      { label: "Tasks closed", value: "0" },
      { label: "Latency", value: "pending" },
      { label: "Coverage", value: "setup" },
    ],
    notes: ["Prompt library", "Call prep", "Follow-up drafts"],
  },
  "/crm": {
    title: "CRM",
    subtitle: "Account workspace",
    summary: "Pipeline control with account history, contact detail, and stage progression.",
    metrics: [
      { label: "Accounts", value: "0" },
      { label: "Contacts", value: "0" },
      { label: "Deals", value: "0" },
      { label: "SLA", value: "pending" },
    ],
    notes: ["Account timeline", "Deal handoff", "Activity feed"],
  },
  "/research": {
    title: "Research Lab",
    subtitle: "Signal discovery",
    summary: "A workspace for web research, competitor scans, and pre-contact intelligence.",
    metrics: [
      { label: "Scans", value: "0" },
      { label: "Findings", value: "0" },
      { label: "Sources", value: "0" },
      { label: "Freshness", value: "pending" },
    ],
    notes: ["Web crawl queue", "Competitor watch", "Source tracing"],
  },
  "/scraper": {
    title: "Scraper",
    subtitle: "Capture pipeline",
    summary: "Automated and manual scraping controls for lead capture and enrichment.",
    metrics: [
      { label: "Jobs", value: "0" },
      { label: "Succeeded", value: "0%" },
      { label: "Queued", value: "0" },
      { label: "Output", value: "0" },
    ],
    notes: ["Seed list", "Crawl status", "Results populate after first queued job"],
  },
  "/analytics": {
    title: "Analytics",
    subtitle: "Performance view",
    summary: "Executive reporting for revenue, conversion, activity, and team output.",
    metrics: [
      { label: "Revenue", value: "$0" },
      { label: "Sessions", value: "0" },
      { label: "Conversion", value: "0%" },
      { label: "Trend", value: "0%" },
    ],
    notes: ["Trend line", "Pipeline stage mix", "Recent movement appears once candidates land"],
  },
  "/settings": {
    title: "Settings",
    subtitle: "System preferences",
    summary: "Control account access, routing defaults, integrations, and workspace behavior.",
    metrics: [
      { label: "Profiles", value: "0" },
      { label: "Connected apps", value: "0" },
      { label: "Policies", value: "0" },
      { label: "Updates", value: "pending" },
    ],
    notes: ["Auth policy", "Notification rules", "Integration health"],
  },
};

const authRoutes: Record<string, { title: string; subtitle: string; cta: string }> = {
  "/login": {
    title: "Welcome back",
    subtitle: "Sign in to the XPS Intelligence command center.",
    cta: "Enter workspace",
  },
  "/onboarding": {
    title: "Onboarding",
    subtitle: "Set up your profile, territory, and working defaults.",
    cta: "Continue setup",
  },
};

const primaryNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/ai-assistant", label: "AI Assistant", icon: Brain },
  { href: "/crm", label: "CRM", icon: Building2 },
  { href: "/research", label: "Research", icon: Search },
  { href: "/scraper", label: "Scraper", icon: Workflow },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

const intelligenceNav = [
  { href: "/outreach", label: "Outreach", icon: Mail },
  { href: "/proposals", label: "Proposals", icon: FileText },
  { href: "/knowledge", label: "Knowledge", icon: MessageSquareText },
  { href: "/competition", label: "Competition", icon: Globe2 },
];

const systemNav = [
  { href: "/intelligence", label: "Intelligence", icon: Mic },
  { href: "/connectors", label: "Connectors", icon: PanelLeft },
  { href: "/admin", label: "Admin", icon: Shield },
  { href: "/manager", label: "Manager", icon: Users },
  { href: "/owner", label: "Owner", icon: Crown },
  { href: "/settings", label: "Settings", icon: Sparkles },
  { href: "/sales-staff", label: "Sales Staff", icon: Target },
  { href: "/sales-flow", label: "Sales Flow", icon: Workflow },
];

export function NextHostShell() {
  const pathname = usePathname() ?? "/";
  const normalizedPath = pathname === "/" ? "/" : pathname.replace(/\/$/, "");

  if (normalizedPath in authRoutes) {
    return <AuthView pathname={normalizedPath} />;
  }

  if (normalizedPath === "/") {
    return <LandingView />;
  }

  const route = workspaceRoutes[normalizedPath] ?? null;
  return <WorkspaceView pathname={normalizedPath} route={route} />;
}

function LandingView() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image src={xpsLogo} alt="XPS" className="h-10 w-10 rounded-lg" priority />
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-[0.24em] text-white">XPS INTELLIGENCE</div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-white/55">Command center</div>
            </div>
          </Link>
          <div className="hidden items-center gap-3 sm:flex">
            <Link href="/login" className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:border-gold/50 hover:text-white">
              Sign in
            </Link>
            <Link href="/dashboard" className="rounded-full bg-gradient-gold px-4 py-2 text-sm font-semibold text-black transition hover:shadow-gold">
              Open app
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-16">
        <section className="relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0">
            <Image src={heroBg} alt="" fill priority className="object-cover opacity-35" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/70 to-background" />
            <div className="absolute inset-0 bg-gradient-hero" />
          </div>

          <div className="relative mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl items-center px-4 py-20 sm:px-6 lg:grid-cols-[1.25fr_0.75fr] lg:px-8">
            <div className="max-w-3xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-black/40 px-4 py-2 text-xs uppercase tracking-[0.24em] text-gold-light">
                <Sparkles className="h-3.5 w-3.5" />
                XPS Intelligence Platform
              </div>
              <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
                Sales intelligence, routing, and operations in one dark command surface.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">
                The v.5 shell is preserved as a focused landing page and route map while the Next host becomes the production runtime.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-gold px-6 py-3 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:shadow-gold">
                  Launch dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white/90 transition hover:border-white/25 hover:bg-white/10">
                  Sign in
                </Link>
              </div>
            </div>

            <div className="mt-12 grid gap-4 lg:mt-0">
              {[
                ["0 live locations", "Single operating view once data sources connect"],
                ["0 pipeline records", "Lead, proposal, and follow-up flow comes online after ingest"],
                ["Role-aware", "Sales staff through owner coverage"],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-black/45 p-5 shadow-elevated backdrop-blur">
                  <div className="text-sm font-semibold text-white">{title}</div>
                  <div className="mt-1 text-sm text-white/65">{copy}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Enterprise security", "Role-based access, guarded routes, and auditable actions."],
              ["AI-assisted work", "Quick briefs, prepared replies, and knowledge retrieval."],
              ["Reusable shell", "A single Next host that keeps the v.5 structure readable."],
              ["Railway ready", "Deterministic host setup with explicit app-router entrypoints."],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-card/70 p-5">
                <div className="text-sm font-semibold text-white">{title}</div>
                <p className="mt-2 text-sm leading-6 text-white/65">{copy}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function AuthView({ pathname }: { pathname: string }) {
  const auth = authRoutes[pathname] ?? authRoutes["/login"];

  return (
    <div className="grid min-h-screen bg-background text-foreground lg:grid-cols-[1.05fr_0.95fr]">
      <aside className="relative hidden overflow-hidden border-r border-white/10 lg:block">
        <Image src={heroBg} alt="" fill priority className="object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/75 to-background" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Link href="/" className="flex items-center gap-3">
            <Image src={xpsLogo} alt="XPS" className="h-11 w-11 rounded-lg" priority />
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-[0.22em] text-white">XPS INTELLIGENCE</div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-white/55">Command center</div>
            </div>
          </Link>

          <div className="max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-black/40 px-4 py-2 text-xs uppercase tracking-[0.24em] text-gold-light">
              <Shield className="h-3.5 w-3.5" />
              Secure workspace
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white">A darker, faster home for every rep, manager, and owner.</h1>
            <p className="mt-5 max-w-lg text-sm leading-7 text-white/68">
              The Next host keeps the branded shell, the route names, and the first impression while the underlying app continues its migration.
            </p>
          </div>
        </div>
      </aside>

      <main className="flex items-center justify-center px-4 py-12 sm:px-6 lg:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Image src={xpsLogo} alt="XPS" className="h-10 w-10 rounded-lg" priority />
            <div>
              <div className="text-sm font-semibold tracking-[0.22em] text-foreground">XPS INTELLIGENCE</div>
              <div className="text-[10px] uppercase tracking-[0.26em] text-muted-foreground">Command center</div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-card/80 p-6 shadow-elevated backdrop-blur-xl sm:p-8">
            <div className="mb-8">
              <p className="text-xs uppercase tracking-[0.26em] text-gold">{auth.subtitle}</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white">{auth.title}</h2>
              <p className="mt-3 text-sm leading-6 text-white/65">{auth.subtitle}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-white/50">Email</label>
                <input
                  type="email"
                  placeholder="you@xpsxpress.com"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-gold/40"
                />
              </div>
              {pathname !== "/onboarding" && (
                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-white/50">Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-gold/40"
                  />
                </div>
              )}
              <Link
                href={pathname === "/onboarding" ? "/dashboard" : "/dashboard"}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-gold px-4 py-3 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:shadow-gold"
              >
                {auth.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function WorkspaceView({ pathname, route }: { pathname: string; route: RouteCopy | null }) {
  const current = route ?? {
    title: "Not found",
    subtitle: "Route unavailable",
    summary: "This route is not mapped in the scaffold yet.",
    metrics: [
      { label: "Status", value: "404" },
      { label: "Location", value: pathname },
      { label: "Fallback", value: "Active" },
      { label: "Action", value: "Back" },
    ],
    notes: ["Return to the dashboard", "Check route registry", "Add the next page"],
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-r border-white/10 bg-black/50 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
            <Image src={xpsLogo} alt="XPS" className="h-9 w-9 rounded-lg" priority />
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold tracking-[0.24em] text-white">XPS INTELLIGENCE</div>
              <div className="text-[10px] uppercase tracking-[0.26em] text-white/50">Command center</div>
            </div>
          </div>

          <div className="space-y-6 px-4 py-5">
            <SidebarGroup title="Main" items={primaryNav} pathname={pathname} />
            <SidebarGroup title="Intelligence" items={intelligenceNav} pathname={pathname} />
            <SidebarGroup title="System" items={systemNav} pathname={pathname} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
            <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 lg:hidden">
                  <Menu className="h-4 w-4" />
                </button>
                <div className="hidden items-center gap-2 text-xs uppercase tracking-[0.26em] text-white/45 sm:flex">
                  <PanelLeft className="h-3.5 w-3.5" />
                  {current.subtitle}
                </div>
              </div>

              <div className="hidden w-full max-w-xl items-center gap-3 md:flex">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    type="search"
                    placeholder="Search leads, accounts, or actions"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-gold/40"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-gold">
                  Live
                </div>
                <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70">
                  <Sparkles className="h-4 w-4" />
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <section className="rounded-[2rem] border border-white/10 bg-gradient-to-b from-white/6 to-transparent p-6 shadow-elevated sm:p-8">
              <div className="max-w-3xl">
                <p className="text-xs uppercase tracking-[0.26em] text-gold">{current.subtitle}</p>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">{current.title}</h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">{current.summary}</p>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {current.metrics.map((metric) => (
                  <div key={metric.label} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/45">{metric.label}</div>
                    <div className="mt-2 text-2xl font-black text-white">{metric.value}</div>
                  </div>
                ))}
              </div>
            </section>

            <div className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <section className="rounded-[2rem] border border-white/10 bg-card/75 p-6">
                <div className="text-sm font-semibold text-white">Workspace notes</div>
                <div className="mt-4 space-y-3">
                  {current.notes.map((note) => (
                    <div key={note} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-gold" />
                      <div className="text-sm leading-6 text-white/70">{note}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[2rem] border border-white/10 bg-card/75 p-6">
                <div className="text-sm font-semibold text-white">Quick actions</div>
                <div className="mt-4 space-y-3">
                  <Link href="/dashboard" className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/80 transition hover:border-gold/40">
                    Return to dashboard
                    <ArrowRight className="h-4 w-4 text-white/40" />
                  </Link>
                  <Link href="/login" className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/80 transition hover:border-gold/40">
                    Switch account
                    <ArrowRight className="h-4 w-4 text-white/40" />
                  </Link>
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function SidebarGroup({
  title,
  items,
  pathname,
}: {
  title: string;
  items: { href: string; label: string; icon: typeof LayoutDashboard }[];
  pathname: string;
}) {
  return (
    <section>
      <div className="mb-3 text-[11px] uppercase tracking-[0.26em] text-white/35">{title}</div>
      <div className="space-y-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition ${
                active ? "bg-gold/12 text-gold-light ring-1 ring-gold/20" : "text-white/72 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
