"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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

import xpsLogo from "@/assets/xps-logo.png";
import { api } from "@/lib/api";
import { clearSessionCookies } from "@/lib/cookies";
import { clearAuth, getUser, type User } from "@/lib/auth";
import { AdminControlPlane } from "@/next/AdminControlPlane";

type RouteCopy = {
  title: string;
  subtitle: string;
  category?: string;
  template?: string;
  summary: string;
  notes: readonly string[];
};

type AnalyticsSummary = {
  total_leads: number;
  pipeline_value: number;
  proposals_sent: number;
  close_rate: number;
  recent_leads: Array<{ company_name: string; vertical: string; score: number; stage: string }>;
  recent_activities: Array<{ subject: string; created_at: string }>;
};

type LeadCandidate = {
  id: string;
  company_name: string;
  score: number;
  vertical: string;
  territory: string | null;
  candidate_status: string;
  recommendation_type: string | null;
};

type ScrapeJob = {
  id: string;
  job_type: string;
  status: string;
  created_at: string;
};

type AssistantBriefing = {
  role: User["role"];
  autonomy_mode: "minimal" | "hybrid" | "full";
  cards: Array<{
    id: string;
    title: string;
    priority: "high" | "medium" | "low";
    summary: string;
    action: string;
    route: string;
  }>;
  top_candidates: Array<{
    company_name: string;
    score: number;
    recommendation_type: string | null;
  }>;
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

const routeRoles: Record<string, User["role"][]> = {
  "/admin": ["admin"],
  "/manager": ["manager", "owner", "admin"],
  "/owner": ["owner", "admin"],
};

const scraperPresets = [
  { name: "Miami epoxy", city: "Miami", state: "FL", industry: "epoxy flooring contractor", keyword: "decorative concrete" },
  { name: "Tampa resin", city: "Tampa", state: "FL", industry: "resinous floor contractor", keyword: "polished concrete" },
  { name: "Orlando coatings", city: "Orlando", state: "FL", industry: "industrial coatings", keyword: "concrete polishing" },
];

function filterSystemNav(role: User["role"] | null) {
  return systemNav.filter((item) => {
    if (item.href === "/admin") return role === "admin";
    if (item.href === "/manager") return role === "manager" || role === "owner" || role === "admin";
    if (item.href === "/owner") return role === "owner" || role === "admin";
    return true;
  });
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-white/50">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-gold/40"
      />
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

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/60">{text}</div>;
}

export function LiveWorkspaceView({
  pathname,
  route,
}: {
  pathname: string;
  route: RouteCopy;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [leadCandidates, setLeadCandidates] = useState<LeadCandidate[]>([]);
  const [scrapeJobs, setScrapeJobs] = useState<ScrapeJob[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [briefing, setBriefing] = useState<AssistantBriefing | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchForm, setSearchForm] = useState({
    city: "Miami",
    state: "FL",
    industry: "epoxy flooring contractor",
    keyword: "decorative concrete",
    max_results: "5",
  });
  const [crawlForm, setCrawlForm] = useState({
    url: "https://www.sundek.com/",
    company_name: "",
    query: "",
    mode: "auto",
  });

  const filteredSystemNav = useMemo(() => filterSystemNav(currentUser?.role ?? null), [currentUser?.role]);
  const workspaceTemplate = route.template ?? "team-member";
  const workspaceCategory = route.category ?? "core";

  const refreshData = useCallback(async () => {
    setLoading(true);
    setRouteError(null);
    try {
      const me = await api.get<{ user: User }>("/auth/me");
      setCurrentUser(me.user);
      localStorage.setItem("xps_user", JSON.stringify(me.user));

      if (pathname === "/dashboard" || pathname === "/analytics") {
        setAnalytics(await api.get<AnalyticsSummary>("/analytics/summary"));
      }
      if (pathname === "/dashboard" || pathname === "/leads" || pathname === "/scraper") {
        const response = await api.get<{ items: LeadCandidate[] }>("/lead-candidates");
        setLeadCandidates(response.items);
      }
      if (pathname === "/scraper") {
        const response = await api.get<{ items: ScrapeJob[] }>("/scrape/jobs");
        setScrapeJobs(response.items);
      }
      if (["/ai-assistant", "/manager", "/owner", "/admin"].includes(pathname)) {
        setBriefing(await api.get<AssistantBriefing>("/assistants/briefing"));
      }
    } catch (error) {
      setRouteError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [pathname]);

  useEffect(() => {
    const token = localStorage.getItem("xps_token");
    const cachedUser = getUser();
    setCurrentUser(cachedUser);
    if (!token || !cachedUser) {
      router.replace("/login");
      return;
    }

    const allowedRoles = routeRoles[pathname];
    if (allowedRoles && !allowedRoles.includes(cachedUser.role)) {
      router.replace("/dashboard");
      return;
    }

    void refreshData();
  }, [pathname, refreshData, router]);

  async function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/scrape/search", { ...searchForm, max_results: Number(searchForm.max_results) || 5 });
      await refreshData();
    } catch (error) {
      setRouteError((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitCrawl(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/scrape/crawl", {
        ...crawlForm,
        url: crawlForm.url || undefined,
        company_name: crawlForm.company_name || undefined,
        query: crawlForm.query || undefined,
      });
      await refreshData();
    } catch (error) {
      setRouteError((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function promoteCandidate(candidateId: string) {
    setSubmitting(true);
    try {
      await api.post(`/lead-candidates/${candidateId}/promote`, {});
      await refreshData();
    } catch (error) {
      setRouteError((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function applyScraperPreset(preset: (typeof scraperPresets)[number]) {
    setSearchForm((prev) => ({
      ...prev,
      city: preset.city,
      state: preset.state,
      industry: preset.industry,
      keyword: preset.keyword,
    }));
  }

  const metrics =
    pathname === "/dashboard"
      ? [
          { label: "Active leads", value: String(analytics?.total_leads ?? 0) },
          { label: "Pipeline value", value: `$${(analytics?.pipeline_value ?? 0).toLocaleString()}` },
          { label: "Open proposals", value: String(analytics?.proposals_sent ?? 0) },
          { label: "Close rate", value: `${analytics?.close_rate ?? 0}%` },
        ]
      : pathname === "/leads"
        ? [
            { label: "Candidates", value: String(leadCandidates.length) },
            { label: "Hot", value: String(leadCandidates.filter((candidate) => candidate.score >= 70).length) },
            { label: "Qualified", value: `${leadCandidates.length ? Math.round((leadCandidates.filter((candidate) => candidate.score >= 60).length / leadCandidates.length) * 100) : 0}%` },
            { label: "Average score", value: String(leadCandidates.length ? Math.round(leadCandidates.reduce((sum, candidate) => sum + candidate.score, 0) / leadCandidates.length) : 0) },
          ]
        : pathname === "/scraper"
          ? [
              { label: "Jobs", value: String(scrapeJobs.length) },
              { label: "Succeeded", value: `${scrapeJobs.length ? Math.round((scrapeJobs.filter((job) => job.status === "completed").length / scrapeJobs.length) * 100) : 0}%` },
              { label: "Queued", value: String(scrapeJobs.filter((job) => job.status === "queued" || job.status === "running").length) },
              { label: "Output", value: String(leadCandidates.length) },
            ]
          : [
              { label: "Status", value: "Ready" },
              { label: "Route", value: pathname },
              { label: "API", value: "Live" },
              { label: "Mode", value: "Host" },
            ];

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
            <SidebarGroup title="System" items={filteredSystemNav} pathname={pathname} />
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
                  {route.subtitle}
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
                <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/55 sm:block">
                  {currentUser?.role ?? "guest"}
                </div>
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
                <p className="text-xs uppercase tracking-[0.26em] text-gold">{route.subtitle}</p>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">{route.title}</h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">{route.summary}</p>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map((metric) => (
                  <div key={metric.label} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/45">{metric.label}</div>
                    <div className="mt-2 text-2xl font-black text-white">{loading ? "..." : metric.value}</div>
                  </div>
                ))}
              </div>
            </section>

            <div className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_0.75fr_0.5fr]">
              <section className={pathname === "/admin" ? "" : "rounded-[2rem] border border-white/10 bg-card/75 p-6"}>
                {pathname === "/admin" ? <AdminControlPlane /> : null}
                {pathname !== "/admin" ? (
                <>
                <div className="text-sm font-semibold text-white">
                  {pathname === "/dashboard" ? "Recent movement" : pathname === "/leads" ? "Lead candidates" : pathname === "/scraper" ? "Scrape controls" : "Workspace notes"}
                </div>
                {routeError ? <div className="mt-4 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">{routeError}</div> : null}

                {pathname === "/dashboard" ? (
                  <div className="mt-4 space-y-3">
                    {(analytics?.recent_leads ?? []).map((lead) => (
                      <div key={`${lead.company_name}-${lead.stage}`} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-white">{lead.company_name}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/45">{lead.vertical}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-black text-gold">{lead.score}</div>
                            <div className="text-xs text-white/45">{lead.stage}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!analytics?.recent_leads.length ? route.notes.map((note) => (
                      <div key={note} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/25 p-4">
                        <div className="mt-1 h-2.5 w-2.5 rounded-full bg-gold" />
                        <div className="text-sm leading-6 text-white/70">{note}</div>
                      </div>
                    )) : null}
                  </div>
                ) : null}

                {pathname === "/leads" ? (
                  <div className="mt-4 space-y-3">
                    {leadCandidates.map((candidate) => (
                      <div key={candidate.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-white">{candidate.company_name}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/45">{candidate.vertical}</div>
                            <div className="mt-2 text-sm text-white/60">{candidate.territory ?? "Territory pending"}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-black text-gold">{candidate.score}</div>
                            <div className="text-xs text-white/45">{candidate.candidate_status}</div>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={submitting || candidate.candidate_status === "activated"}
                            onClick={() => promoteCandidate(candidate.id)}
                            className="rounded-full border border-gold/30 bg-gold/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold-light disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {candidate.candidate_status === "activated" ? "Synced" : "Promote to HubSpot"}
                          </button>
                          {candidate.recommendation_type ? (
                            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.18em] text-white/60">
                              {candidate.recommendation_type}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                    {!leadCandidates.length ? <EmptyState text="No lead candidates yet." /> : null}
                  </div>
                ) : null}

                {["/ai-assistant", "/manager", "/owner"].includes(pathname) ? (
                  <div className="mt-4 space-y-4">
                    {(briefing?.cards ?? []).map((card) => (
                      <div key={card.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-white">{card.title}</div>
                            <div className="mt-2 text-sm leading-6 text-white/65">{card.summary}</div>
                          </div>
                          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-gold-light">
                            {card.priority}
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="text-sm text-white/55">{card.action}</div>
                          <Link href={card.route} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.18em] text-white/80">
                            Open
                            <ArrowRight className="h-3.5 w-3.5 text-white/40" />
                          </Link>
                        </div>
                      </div>
                    ))}
                    {!briefing?.cards.length ? <EmptyState text="Assistant briefing will appear once live data is available." /> : null}
                  </div>
                ) : null}

                {pathname === "/scraper" ? (
                  <div className="mt-4 grid gap-4 xl:grid-cols-2">
                    <form onSubmit={submitSearch} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="mb-4 text-sm font-semibold text-white">Manual search</div>
                      <div className="grid gap-3">
                        <InputField label="City" value={searchForm.city} onChange={(value) => setSearchForm((prev) => ({ ...prev, city: value }))} />
                        <InputField label="State" value={searchForm.state} onChange={(value) => setSearchForm((prev) => ({ ...prev, state: value }))} />
                        <InputField label="Industry" value={searchForm.industry} onChange={(value) => setSearchForm((prev) => ({ ...prev, industry: value }))} />
                        <InputField label="Keyword" value={searchForm.keyword} onChange={(value) => setSearchForm((prev) => ({ ...prev, keyword: value }))} />
                        <InputField label="Max results" value={searchForm.max_results} onChange={(value) => setSearchForm((prev) => ({ ...prev, max_results: value }))} type="number" />
                        <button type="submit" disabled={submitting} className="rounded-2xl bg-gradient-gold px-4 py-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-70">
                          Queue search
                        </button>
                      </div>
                    </form>

                    <form onSubmit={submitCrawl} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="mb-4 text-sm font-semibold text-white">Direct crawl</div>
                      <div className="grid gap-3">
                        <InputField label="URL" value={crawlForm.url} onChange={(value) => setCrawlForm((prev) => ({ ...prev, url: value }))} />
                        <InputField label="Company name" value={crawlForm.company_name} onChange={(value) => setCrawlForm((prev) => ({ ...prev, company_name: value }))} />
                        <InputField label="Query" value={crawlForm.query} onChange={(value) => setCrawlForm((prev) => ({ ...prev, query: value }))} />
                        <div>
                          <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-white/50">Mode</label>
                          <select
                            value={crawlForm.mode}
                            onChange={(event) => setCrawlForm((prev) => ({ ...prev, mode: event.target.value }))}
                            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-gold/40"
                          >
                            <option value="auto">auto</option>
                            <option value="steel">steel</option>
                            <option value="firecrawl">firecrawl</option>
                          </select>
                        </div>
                        <button type="submit" disabled={submitting} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70">
                          Queue crawl
                        </button>
                      </div>
                    </form>
                  </div>
                ) : null}

                {!["/dashboard", "/leads", "/scraper"].includes(pathname) ? (
                  <div className="mt-4 space-y-3">
                    {route.notes.map((note) => (
                      <div key={note} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/25 p-4">
                        <div className="mt-1 h-2.5 w-2.5 rounded-full bg-gold" />
                        <div className="text-sm leading-6 text-white/70">{note}</div>
                      </div>
                    ))}
                  </div>
                ) : null}
                </>
                ) : null}
              </section>

              <section className="rounded-[2rem] border border-white/10 bg-card/75 p-6">
                <div className="text-sm font-semibold text-white">
                  {pathname === "/scraper" ? "Recent jobs" : pathname === "/dashboard" ? "Recent activity" : "Quick actions"}
                </div>
                {pathname === "/scraper" ? (
                  <div className="mt-4 space-y-3">
                    {scrapeJobs.map((job) => (
                      <div key={job.id} className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-white">{job.job_type}</div>
                            <div className="text-xs text-white/45">{job.created_at}</div>
                          </div>
                          <div className="text-xs uppercase tracking-[0.18em] text-gold">{job.status}</div>
                        </div>
                      </div>
                    ))}
                    {!scrapeJobs.length ? <EmptyState text="No scrape jobs yet." /> : null}
                  </div>
                ) : pathname === "/dashboard" ? (
                  <div className="mt-4 space-y-3">
                    {(analytics?.recent_activities ?? []).map((activity) => (
                      <div key={`${activity.subject}-${activity.created_at}`} className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                        <div className="text-sm font-semibold text-white">{activity.subject}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/45">{activity.created_at}</div>
                      </div>
                    ))}
                    {!analytics?.recent_activities.length ? <EmptyState text="Activity appears once recommendations are generated." /> : null}
                  </div>
                ) : ["/ai-assistant", "/manager", "/owner"].includes(pathname) ? (
                  <div className="mt-4 space-y-3">
                    {(briefing?.top_candidates ?? []).map((candidate) => (
                      <div key={`${candidate.company_name}-${candidate.score}`} className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-white">{candidate.company_name}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/45">
                              {candidate.recommendation_type ?? "recommendation pending"}
                            </div>
                          </div>
                          <div className="text-lg font-black text-gold">{candidate.score}</div>
                        </div>
                      </div>
                    ))}
                    {!briefing?.top_candidates.length ? <EmptyState text="Top candidates will appear as the pipeline fills." /> : null}
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {pathname === "/admin" ? (
                      <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/70">
                        Admin quick actions are moving into the always-on operator rail so the control plane stays consistent with every other workspace.
                      </div>
                    ) : null}
                    <Link href="/dashboard" className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/80 transition hover:border-gold/40">
                      Return to dashboard
                      <ArrowRight className="h-4 w-4 text-white/40" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        clearAuth();
                        clearSessionCookies();
                        router.push("/login");
                      }}
                      className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/80 transition hover:border-gold/40"
                    >
                      Switch account
                      <ArrowRight className="h-4 w-4 text-white/40" />
                    </button>
                  </div>
                )}
              </section>

              <aside className="space-y-4">
                <section className="rounded-[2rem] border border-white/10 bg-card/75 p-5">
                  <div className="text-sm font-semibold text-white">Workspace template</div>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Template</div>
                      <div className="mt-2 text-lg font-black text-white">{workspaceTemplate}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Category</div>
                      <div className="mt-2 text-lg font-black text-white">{workspaceCategory}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Role</div>
                      <div className="mt-2 text-lg font-black text-white">{currentUser?.role ?? "guest"}</div>
                    </div>
                  </div>
                </section>

                <section className="rounded-[2rem] border border-white/10 bg-card/75 p-5">
                  <div className="text-sm font-semibold text-white">AI partner</div>
                  <div className="mt-3 rounded-2xl border border-gold/20 bg-gold/10 p-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-gold-light">Autonomy mode</div>
                    <div className="mt-2 text-lg font-black text-white">{briefing?.autonomy_mode ?? "hybrid"}</div>
                    <div className="mt-2 text-sm leading-6 text-white/65">
                      Same shell, role-tailored tools, and proactive guidance live in this rail once the provider routing and blueprint catalog are fully connected.
                    </div>
                  </div>
                  <div className="mt-3 space-y-3">
                    {(briefing?.cards ?? []).slice(0, 2).map((card) => (
                      <div key={card.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                        <div className="text-sm font-semibold text-white">{card.title}</div>
                        <div className="mt-2 text-sm leading-6 text-white/60">{card.action}</div>
                      </div>
                    ))}
                    {!briefing?.cards.length ? (
                      <EmptyState text="Proactive assistant cards appear here as the live assistant rail fills out." />
                    ) : null}
                  </div>
                </section>

                {pathname === "/scraper" ? (
                  <section className="rounded-[2rem] border border-white/10 bg-card/75 p-5">
                    <div className="text-sm font-semibold text-white">Personal scraper presets</div>
                    <div className="mt-3 space-y-3">
                      {scraperPresets.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => applyScraperPreset(preset)}
                          className="block w-full rounded-2xl border border-white/10 bg-black/25 p-4 text-left transition hover:border-gold/30"
                        >
                          <div className="text-sm font-semibold text-white">{preset.name}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/45">
                            {preset.city}, {preset.state}
                          </div>
                          <div className="mt-2 text-sm leading-6 text-white/60">
                            {preset.industry} · {preset.keyword}
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-6 text-white/60">
                      Next step: bind this panel to per-user scraper profiles, Playwright browser search, and admin-managed source permissions.
                    </div>
                  </section>
                ) : null}
              </aside>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
