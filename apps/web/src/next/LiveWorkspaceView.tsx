"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Bell,
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
  MapPin,
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

type ScraperPreset = {
  id: string;
  name: string;
  city: string;
  state: string;
  industry: string;
  keyword: string;
  persona: string;
  brief: string;
  recommendedMode: "auto" | "steel" | "firecrawl";
  browserLane: string;
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

type IntelligenceSummary = {
  generated_at: string;
  workspace_root: string | null;
  status: "available" | "partial" | "missing";
  repositories: {
    intel: {
      status: "available" | "partial" | "missing";
      root: string | null;
      totals: { files: number; available_files: number; headings: number; bullets: number };
    };
    distallation: {
      status: "available" | "partial" | "missing";
      root: string | null;
      totals: { files: number; available_files: number; headings: number; bullets: number };
    };
  };
  summary: {
    taxonomy_files: number;
    seed_files: number;
    benchmark_files: number;
    distillation_files: number;
    validation_files: number;
    reflection_files: number;
  };
};

const primaryNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sales-staff", label: "Sales Staff", icon: Target },
  { href: "/sales-flow", label: "Sales Flow", icon: Workflow },
  { href: "/crm", label: "CRM", icon: Building2 },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/ai-assistant", label: "AI Assistant", icon: Brain },
  { href: "/scraper", label: "Scraper", icon: Workflow },
  { href: "/research", label: "Research Lab", icon: Search },
  { href: "/outreach", label: "Outreach", icon: Mail },
  { href: "/proposals", label: "Proposals", icon: FileText },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

const intelligenceNav = [
  { href: "/intelligence", label: "Intelligence", icon: Mic },
  { href: "/knowledge", label: "Knowledge Base", icon: MessageSquareText },
  { href: "/competition", label: "Competition", icon: Globe2 },
  { href: "/connectors", label: "Connectors", icon: PanelLeft },
];

const systemNav = [
  { href: "/admin", label: "Admin", icon: Shield },
  { href: "/manager", label: "Manager", icon: Users },
  { href: "/owner", label: "Owner Portal", icon: Crown },
  { href: "/settings", label: "Settings", icon: Sparkles },
];

const shellCardClass = "rounded-xl border border-border bg-gradient-card shadow-card";
const shellInsetClass = "rounded-xl border border-border bg-background/70";

const routeRoles: Record<string, User["role"][]> = {
  "/admin": ["admin"],
  "/manager": ["manager", "owner", "admin"],
  "/owner": ["owner", "admin"],
};

const defaultSearchForm = {
  city: "Miami",
  state: "FL",
  industry: "epoxy flooring contractor",
  keyword: "decorative concrete",
  max_results: "5",
};

const defaultCrawlForm = {
  url: "https://www.sundek.com/",
  company_name: "",
  query: "",
  mode: "auto",
};

const scraperPresets: ScraperPreset[] = [
  {
    id: "miami-epoxy",
    name: "Miami epoxy",
    city: "Miami",
    state: "FL",
    industry: "epoxy flooring contractor",
    keyword: "decorative concrete",
    persona: "Territory opener",
    brief: "Good first pass for South Florida commercial resurfacing targets and showroom-led operators.",
    recommendedMode: "auto",
    browserLane: "Playwright review after queue",
  },
  {
    id: "tampa-resin",
    name: "Tampa resin",
    city: "Tampa",
    state: "FL",
    industry: "resinous floor contractor",
    keyword: "polished concrete",
    persona: "Industrial hunter",
    brief: "Targets industrial and warehouse coating providers with stronger qualification potential.",
    recommendedMode: "steel",
    browserLane: "Browser validation for facility fit",
  },
  {
    id: "orlando-coatings",
    name: "Orlando coatings",
    city: "Orlando",
    state: "FL",
    industry: "industrial coatings",
    keyword: "concrete polishing",
    persona: "Mixed commercial",
    brief: "Balanced preset for mixed commercial coatings, showrooms, and service-heavy teams.",
    recommendedMode: "firecrawl",
    browserLane: "Firecrawl first, browser second",
  },
];

function filterSystemNav(role: User["role"] | null) {
  return systemNav.filter((item) => {
    if (item.href === "/admin") return role === "admin";
    if (item.href === "/manager") return role === "manager" || role === "owner" || role === "admin";
    if (item.href === "/owner") return role === "owner" || role === "admin";
    return true;
  });
}

function getUserInitials(user: User | null) {
  const source = user?.full_name?.trim() || user?.email || user?.role || "XPS";
  const tokens = source
    .split(/[\s@._-]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  return tokens
    .slice(0, 2)
    .map((token) => token[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2) || "XP";
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
      <label className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/50"
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
      <div className="mb-3 text-[10px] uppercase tracking-widest text-muted-foreground/60">{title}</div>
      <div className="space-y-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
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
  return <div className={`${shellInsetClass} px-4 py-3 text-sm text-muted-foreground`}>{text}</div>;
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
  const [intelligenceSummary, setIntelligenceSummary] = useState<IntelligenceSummary | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(scraperPresets[0]?.id ?? "");
  const [searchForm, setSearchForm] = useState(defaultSearchForm);
  const [crawlForm, setCrawlForm] = useState(defaultCrawlForm);

  const filteredSystemNav = useMemo(() => filterSystemNav(currentUser?.role ?? null), [currentUser?.role]);
  const workspaceTemplate = route.template ?? "team-member";
  const workspaceCategory = route.category ?? "core";
  const activeScraperPreset = useMemo(
    () => scraperPresets.find((preset) => preset.id === selectedPresetId) ?? null,
    [selectedPresetId],
  );
  const routeAssistantPresence = useMemo(() => {
    if (pathname === "/scraper") {
      return {
        title: "Scraper copilot",
        summary:
          "The assistant stays attached to the search package, browser lane, and output candidates so operators can move from prospecting to validation without leaving the workspace.",
        actions: [
          activeScraperPreset
            ? `Apply ${activeScraperPreset.name} and review the generated search package before queueing.`
            : "Select a preset or switch to custom territory inputs before queueing work.",
          "Use the browser lane after queueing to verify fit, site quality, and territory relevance.",
          "Promote only scored and validated candidates into HubSpot once the recommendation is clear.",
        ],
      };
    }

    if (pathname === "/admin") {
      return {
        title: "Operator copilot",
        summary:
          "The admin rail should help you move between route launch, file editing, preview validation, and assistant guidance without context switching out of the cockpit.",
        actions: [
          "Open a live route from the manifest, then jump directly into its source file from the center pane.",
          "Preview the active route after each save and keep validation scoped to the workspace you are changing.",
          "Use the control plane to edit only governed files, then hand the result back to the runtime shell for verification.",
        ],
      };
    }

    return {
      title: "AI partner",
      summary:
        "This rail carries the current workspace context, role, and autonomy mode so the assistant remains attached to the exact operating surface the user is in.",
      actions: [
        "Review the active workspace context before triggering recommendations or outbound actions.",
        "Use proactive cards to move between lead review, intelligence, and CRM promotion.",
        "Keep autonomy mode aligned with the user's role and current task risk.",
      ],
    };
  }, [activeScraperPreset, pathname]);
  const scraperSearchPackage = useMemo(
    () => `${searchForm.city}, ${searchForm.state} · ${searchForm.industry} · ${searchForm.keyword}`,
    [searchForm.city, searchForm.industry, searchForm.keyword, searchForm.state],
  );

  const refreshData = useCallback(async () => {
    setLoading(true);
    setRouteError(null);
    try {
      const [me, analyticsSummary, candidateResponse, assistantBriefing, intelligence] = await Promise.all([
        api.get<{ user: User }>("/auth/me"),
        api.get<AnalyticsSummary>("/analytics/summary"),
        api.get<{ items: LeadCandidate[] }>("/lead-candidates"),
        api.get<AssistantBriefing>("/assistants/briefing"),
        api.get<IntelligenceSummary>("/intelligence/summary"),
      ]);

      setCurrentUser(me.user);
      localStorage.setItem("xps_user", JSON.stringify(me.user));
      setAnalytics(analyticsSummary);
      setLeadCandidates(candidateResponse.items);
      setBriefing(assistantBriefing);
      setIntelligenceSummary(intelligence);
      if (pathname === "/scraper") {
        const response = await api.get<{ items: ScrapeJob[] }>("/scrape/jobs");
        setScrapeJobs(response.items);
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
    setSelectedPresetId(preset.id);
    setSearchForm((prev) => ({
      ...prev,
      city: preset.city,
      state: preset.state,
      industry: preset.industry,
      keyword: preset.keyword,
    }));
    setCrawlForm((prev) => ({
      ...prev,
      query: `${preset.city} ${preset.state} ${preset.industry} ${preset.keyword}`,
      mode: preset.recommendedMode,
    }));
  }

  function resetScraperWorkspace() {
    setSelectedPresetId("");
    setSearchForm(defaultSearchForm);
    setCrawlForm(defaultCrawlForm);
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
          : pathname === "/crm"
            ? [
                { label: "Activated", value: String(leadCandidates.filter((candidate) => candidate.candidate_status === "activated").length) },
                { label: "Ready", value: String(leadCandidates.filter((candidate) => candidate.score >= 60 && candidate.candidate_status !== "activated").length) },
                { label: "Recommended", value: String(leadCandidates.filter((candidate) => candidate.recommendation_type).length) },
                { label: "Autonomy", value: briefing?.autonomy_mode ?? "hybrid" },
              ]
            : ["/research", "/knowledge", "/competition", "/connectors", "/intelligence"].includes(pathname)
              ? [
                  { label: "Taxonomy", value: String(intelligenceSummary?.summary.taxonomy_files ?? 0) },
                  { label: "Seeds", value: String(intelligenceSummary?.summary.seed_files ?? 0) },
                  { label: "Benchmarks", value: String(intelligenceSummary?.summary.benchmark_files ?? 0) },
                  { label: "Validation", value: String(intelligenceSummary?.summary.validation_files ?? 0) },
                ]
              : pathname === "/outreach"
                ? [
                    { label: "Hot leads", value: String(leadCandidates.filter((candidate) => candidate.score >= 75).length) },
                    { label: "Recommended", value: String(leadCandidates.filter((candidate) => candidate.recommendation_type).length) },
                    { label: "Activated", value: String(leadCandidates.filter((candidate) => candidate.candidate_status === "activated").length) },
                    { label: "Mode", value: briefing?.autonomy_mode ?? "hybrid" },
                  ]
                : pathname === "/proposals"
                  ? [
                      { label: "Pipeline", value: `$${(analytics?.pipeline_value ?? 0).toLocaleString()}` },
                      { label: "Open", value: String(analytics?.proposals_sent ?? 0) },
                      { label: "Close rate", value: `${analytics?.close_rate ?? 0}%` },
                      { label: "Scored", value: String(leadCandidates.filter((candidate) => candidate.score > 0).length) },
                    ]
                  : pathname === "/settings"
                    ? [
                        { label: "Role", value: currentUser?.role ?? "guest" },
                        { label: "Mode", value: briefing?.autonomy_mode ?? "hybrid" },
                        { label: "Intel", value: intelligenceSummary?.status ?? "unknown" },
                        { label: "Runtime", value: "Live" },
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
        <aside className="border-r border-border bg-sidebar-background">
          <div className="flex h-14 items-center gap-3 border-b border-border px-4">
            <Image src={xpsLogo} alt="XPS" className="h-8 w-8 rounded-lg" priority />
            <div className="min-w-0">
              <div className="truncate text-xs font-bold tracking-wider text-foreground">XPS INTELLIGENCE</div>
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground">COMMAND CENTER</div>
            </div>
          </div>

          <div className="space-y-6 px-4 py-4">
            <SidebarGroup title="Main" items={primaryNav} pathname={pathname} />
            <SidebarGroup title="Intelligence" items={intelligenceNav} pathname={pathname} />
            <SidebarGroup title="System" items={filteredSystemNav} pathname={pathname} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-20 border-b border-border glass">
            <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
              <div className="flex items-center gap-3">
                <button className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground lg:hidden">
                  <Menu className="h-4 w-4" />
                </button>
                <div className="hidden items-center gap-3 sm:flex">
                  <PanelLeft className="h-4 w-4 text-muted-foreground" />
                  <h1 className="text-sm font-semibold text-foreground">{route.title}</h1>
                </div>
              </div>

              <div className="hidden w-full max-w-md items-center gap-3 md:flex">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    placeholder="Search leads, companies, proposals..."
                    className="h-9 w-full rounded-lg border border-border bg-card py-2 pl-9 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:text-foreground">
                  <Sparkles className="h-4 w-4" />
                </button>
                <button className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:text-foreground">
                  <Bell className="h-4 w-4" />
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
                </button>
                <div className="hidden items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 sm:flex">
                  <MapPin className="h-3 w-3 text-primary" />
                  <span className="text-xs text-muted-foreground">{currentUser?.territory ?? "Tampa, FL"}</span>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gold bg-primary/20">
                  <span className="text-xs font-bold text-primary">{getUserInitials(currentUser)}</span>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 sm:p-6">
            <section className={`${shellCardClass} p-6`}>
              <div className="max-w-3xl">
                <div className="text-xs uppercase tracking-[0.22em] text-primary">{route.subtitle}</div>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-foreground sm:text-4xl">{route.title}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">{route.summary}</p>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map((metric) => (
                  <div key={metric.label} className={`${shellInsetClass} p-4`}>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{metric.label}</div>
                    <div className="mt-2 text-2xl font-black text-foreground">{loading ? "..." : metric.value}</div>
                  </div>
                ))}
              </div>
            </section>

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-6">
              <section className={pathname === "/admin" ? "" : `${shellCardClass} p-6`}>
                {pathname === "/admin" ? <AdminControlPlane /> : null}
                {pathname !== "/admin" ? (
                <>
                <div className="text-sm font-semibold text-foreground">
                  {pathname === "/dashboard" ? "Recent movement" : pathname === "/leads" ? "Lead candidates" : pathname === "/scraper" ? "Scrape controls" : "Workspace notes"}
                </div>
                {routeError ? <div className="mt-4 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">{routeError}</div> : null}

                {pathname === "/dashboard" ? (
                  <div className="mt-4 space-y-3">
                    {(analytics?.recent_leads ?? []).map((lead) => (
                      <div key={`${lead.company_name}-${lead.stage}`} className={`${shellInsetClass} p-4`}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-foreground">{lead.company_name}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{lead.vertical}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-black text-primary">{lead.score}</div>
                            <div className="text-xs text-muted-foreground">{lead.stage}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!analytics?.recent_leads.length ? route.notes.map((note) => (
                      <div key={note} className={`flex items-start gap-3 ${shellInsetClass} p-4`}>
                        <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                        <div className="text-sm leading-6 text-muted-foreground">{note}</div>
                      </div>
                    )) : null}
                  </div>
                ) : null}

                {pathname === "/leads" ? (
                  <div className="mt-4 space-y-3">
                    {leadCandidates.map((candidate) => (
                      <div key={candidate.id} className={`${shellInsetClass} p-4`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-foreground">{candidate.company_name}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{candidate.vertical}</div>
                            <div className="mt-2 text-sm text-muted-foreground">{candidate.territory ?? "Territory pending"}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-black text-primary">{candidate.score}</div>
                            <div className="text-xs text-muted-foreground">{candidate.candidate_status}</div>
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
                      <div key={card.id} className={`${shellInsetClass} p-4`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-foreground">{card.title}</div>
                            <div className="mt-2 text-sm leading-6 text-muted-foreground">{card.summary}</div>
                          </div>
                          <div className="rounded-full border border-border bg-card px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-primary">
                            {card.priority}
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="text-sm text-muted-foreground">{card.action}</div>
                          <Link href={card.route} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs uppercase tracking-[0.18em] text-foreground">
                            Open
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                          </Link>
                        </div>
                      </div>
                    ))}
                    {!briefing?.cards.length ? <EmptyState text="Assistant briefing will appear once live data is available." /> : null}
                  </div>
                ) : null}

                {pathname === "/scraper" ? (
                  <div className="mt-4 grid gap-4 xl:grid-cols-2">
                    <form onSubmit={submitSearch} className={`${shellInsetClass} p-4`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-foreground">Preset-driven manual search</div>
                          <div className="mt-1 text-sm leading-6 text-muted-foreground">
                            Queue a governed search package for a user-owned territory, then let the assistant carry the context into review and promotion.
                          </div>
                        </div>
                        <div className="rounded-full border border-border bg-card px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                          {activeScraperPreset ? activeScraperPreset.persona : "custom"}
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {scraperPresets.map((preset) => {
                          const active = selectedPresetId === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => applyScraperPreset(preset)}
                              className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                                active
                                  ? "border-primary/40 bg-primary/10 text-primary"
                                  : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                              }`}
                            >
                              {preset.name}
                            </button>
                          );
                        })}
                      </div>
                      <div className="grid gap-3">
                        <InputField label="City" value={searchForm.city} onChange={(value) => setSearchForm((prev) => ({ ...prev, city: value }))} />
                        <InputField label="State" value={searchForm.state} onChange={(value) => setSearchForm((prev) => ({ ...prev, state: value }))} />
                        <InputField label="Industry" value={searchForm.industry} onChange={(value) => setSearchForm((prev) => ({ ...prev, industry: value }))} />
                        <InputField label="Keyword" value={searchForm.keyword} onChange={(value) => setSearchForm((prev) => ({ ...prev, keyword: value }))} />
                        <InputField label="Max results" value={searchForm.max_results} onChange={(value) => setSearchForm((prev) => ({ ...prev, max_results: value }))} type="number" />
                      </div>
                      <div className={`mt-4 ${shellInsetClass} p-4`}>
                        <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Search package</div>
                        <div className="mt-2 text-sm font-semibold text-foreground">{scraperSearchPackage}</div>
                        <div className="mt-2 text-sm leading-6 text-muted-foreground">
                          {activeScraperPreset?.brief ??
                            "Custom package: use this when you need a manual territory or keyword combination outside the preset catalog."}
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="submit" disabled={submitting} className="rounded-2xl bg-gradient-gold px-4 py-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-70">
                          Queue manual search
                        </button>
                        <button
                          type="button"
                          onClick={resetScraperWorkspace}
                          className="rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:border-primary/30"
                        >
                          Reset workspace
                        </button>
                      </div>
                    </form>

                    <form onSubmit={submitCrawl} className={`${shellInsetClass} p-4`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-foreground">Browser-assisted direct crawl</div>
                          <div className="mt-1 text-sm leading-6 text-muted-foreground">
                            Use this lane when you already know the company or URL and want a governed crawl job paired with browser review.
                          </div>
                        </div>
                        <div className="rounded-full border border-border bg-card px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                          {activeScraperPreset?.browserLane ?? "manual review"}
                        </div>
                      </div>
                      <div className="grid gap-3">
                        <InputField label="URL" value={crawlForm.url} onChange={(value) => setCrawlForm((prev) => ({ ...prev, url: value }))} />
                        <InputField label="Company name" value={crawlForm.company_name} onChange={(value) => setCrawlForm((prev) => ({ ...prev, company_name: value }))} />
                        <InputField label="Query" value={crawlForm.query} onChange={(value) => setCrawlForm((prev) => ({ ...prev, query: value }))} />
                        <div>
                          <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-white/50">Mode</label>
                          <select
                            value={crawlForm.mode}
                            onChange={(event) => setCrawlForm((prev) => ({ ...prev, mode: event.target.value }))}
                            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary/50"
                          >
                            <option value="auto">auto</option>
                            <option value="steel">steel</option>
                            <option value="firecrawl">firecrawl</option>
                          </select>
                        </div>
                      </div>
                      <div className={`mt-4 ${shellInsetClass} p-4`}>
                        <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Dispatch summary</div>
                        <div className="mt-2 text-sm font-semibold text-foreground">
                          {crawlForm.company_name || "Unassigned company"} · {crawlForm.mode}
                        </div>
                        <div className="mt-2 text-sm leading-6 text-muted-foreground">
                          {crawlForm.query || "No browser query attached yet. Apply a preset or write a guided query to improve review quality."}
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="submit" disabled={submitting} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70">
                          Queue direct crawl
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setCrawlForm((prev) => ({
                              ...prev,
                              query: `${searchForm.city} ${searchForm.state} ${searchForm.industry} ${searchForm.keyword}`,
                            }))
                          }
                          className="rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:border-primary/30"
                        >
                          Copy search package
                        </button>
                      </div>
                    </form>
                  </div>
                ) : null}

                {!["/dashboard", "/leads", "/scraper", "/ai-assistant", "/manager", "/owner", "/admin"].includes(pathname) ? (
                  <div className="mt-4 grid gap-4 xl:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="text-sm font-semibold text-white">Live workspace context</div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {[
                          ["Scored candidates", String(leadCandidates.filter((candidate) => candidate.score > 0).length)],
                          ["Recommended", String(leadCandidates.filter((candidate) => candidate.recommendation_type).length)],
                          ["Pipeline value", `$${(analytics?.pipeline_value ?? 0).toLocaleString()}`],
                          ["Intel status", intelligenceSummary?.status ?? "unknown"],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                            <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">{label}</div>
                            <div className="mt-2 text-lg font-black text-white">{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="text-sm font-semibold text-white">Assistant focus</div>
                      <div className="mt-4 space-y-3">
                        {(briefing?.cards ?? []).slice(0, 3).map((card) => (
                          <div key={card.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-white">{card.title}</div>
                                <div className="mt-2 text-sm leading-6 text-white/65">{card.summary}</div>
                              </div>
                              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-gold-light">
                                {card.priority}
                              </div>
                            </div>
                          </div>
                        ))}
                        {!briefing?.cards.length ? <EmptyState text="Assistant context will populate here as live briefing data expands." /> : null}
                      </div>
                    </div>
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

              <section className={`${shellCardClass} p-6`}>
                <div className="text-sm font-semibold text-foreground">
                  {pathname === "/scraper" ? "Recent jobs" : pathname === "/dashboard" ? "Recent activity" : "Quick actions"}
                </div>
                {pathname === "/scraper" ? (
                  <div className="mt-4 space-y-3">
                    {scrapeJobs.map((job) => (
                      <div key={job.id} className={`${shellInsetClass} px-4 py-3`}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-foreground">{job.job_type}</div>
                            <div className="text-xs text-muted-foreground">{job.created_at}</div>
                          </div>
                          <div className="text-xs uppercase tracking-[0.18em] text-primary">{job.status}</div>
                        </div>
                      </div>
                    ))}
                    {!scrapeJobs.length ? <EmptyState text="No scrape jobs yet." /> : null}
                  </div>
                ) : pathname === "/dashboard" ? (
                  <div className="mt-4 space-y-3">
                    {(analytics?.recent_activities ?? []).map((activity) => (
                      <div key={`${activity.subject}-${activity.created_at}`} className={`${shellInsetClass} px-4 py-3`}>
                        <div className="text-sm font-semibold text-foreground">{activity.subject}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{activity.created_at}</div>
                      </div>
                    ))}
                    {!analytics?.recent_activities.length ? <EmptyState text="Activity appears once recommendations are generated." /> : null}
                  </div>
                ) : ["/ai-assistant", "/manager", "/owner", "/crm", "/research", "/outreach", "/proposals", "/knowledge", "/competition", "/connectors", "/intelligence", "/settings", "/sales-staff", "/sales-flow"].includes(pathname) ? (
                  <div className="mt-4 space-y-3">
                    {(briefing?.top_candidates ?? []).map((candidate) => (
                      <div key={`${candidate.company_name}-${candidate.score}`} className={`${shellInsetClass} px-4 py-3`}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-foreground">{candidate.company_name}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              {candidate.recommendation_type ?? "recommendation pending"}
                            </div>
                          </div>
                          <div className="text-lg font-black text-primary">{candidate.score}</div>
                        </div>
                      </div>
                    ))}
                    {!briefing?.top_candidates.length ? <EmptyState text="Top candidates will appear as the pipeline fills." /> : null}
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {pathname === "/admin" ? (
                      <>
                        <div className={`${shellInsetClass} p-4`}>
                          <div className="text-sm font-semibold text-foreground">Operator handoff</div>
                          <div className="mt-2 text-sm leading-6 text-muted-foreground">
                            Use the center pane to launch a route, open its source file, save, and refresh preview without leaving the control plane.
                          </div>
                        </div>
                        <Link href="/scraper" className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground transition hover:border-primary/30">
                          Open scraper workspace
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </Link>
                        <Link href="/leads" className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground transition hover:border-primary/30">
                          Review lead candidates
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </Link>
                      </>
                    ) : null}
                    <Link href="/dashboard" className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground transition hover:border-primary/30">
                      Return to dashboard
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        clearAuth();
                        clearSessionCookies();
                        router.push("/login");
                      }}
                      className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground transition hover:border-primary/30"
                    >
                      Switch account
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                )}
              </section>

              </div>

              <aside className="space-y-6">
                <section className={`${shellCardClass} p-5`}>
                  <div className="text-sm font-semibold text-foreground">Workspace template</div>
                  <div className="mt-4 space-y-3">
                    <div className={`${shellInsetClass} p-4`}>
                      <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Template</div>
                      <div className="mt-2 text-lg font-black text-foreground">{workspaceTemplate}</div>
                    </div>
                    <div className={`${shellInsetClass} p-4`}>
                      <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Category</div>
                      <div className="mt-2 text-lg font-black text-foreground">{workspaceCategory}</div>
                    </div>
                    <div className={`${shellInsetClass} p-4`}>
                      <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Role</div>
                      <div className="mt-2 text-lg font-black capitalize text-foreground">{currentUser?.role ?? "guest"}</div>
                    </div>
                  </div>
                </section>

                <section className={`${shellCardClass} p-5`}>
                  <div className="text-sm font-semibold text-foreground">{routeAssistantPresence.title}</div>
                  <div className="mt-3 rounded-xl border border-primary/25 bg-primary/10 p-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-primary">Autonomy mode</div>
                    <div className="mt-2 text-lg font-black capitalize text-foreground">{briefing?.autonomy_mode ?? "hybrid"}</div>
                    <div className="mt-2 text-sm leading-6 text-muted-foreground">
                      {routeAssistantPresence.summary}
                    </div>
                  </div>
                  <div className="mt-3 space-y-3">
                    {routeAssistantPresence.actions.map((action) => (
                      <div key={action} className={`${shellInsetClass} p-4 text-sm leading-6 text-muted-foreground`}>
                        {action}
                      </div>
                    ))}
                    {(briefing?.cards ?? []).slice(0, 2).map((card) => (
                      <div key={card.id} className={`${shellInsetClass} p-4`}>
                        <div className="text-sm font-semibold text-foreground">{card.title}</div>
                        <div className="mt-2 text-sm leading-6 text-muted-foreground">{card.action}</div>
                      </div>
                    ))}
                    {!briefing?.cards.length ? (
                      <EmptyState text="Proactive assistant cards appear here as the live assistant rail fills out." />
                    ) : null}
                  </div>
                  <div className={`mt-4 ${shellInsetClass} p-4 text-sm leading-6 text-muted-foreground`}>
                    This rail now follows every workspace with route-aware context. The next layer is persistent conversation threads, settings, and live execution against the same workspace state.
                  </div>
                </section>

                {pathname === "/scraper" ? (
                  <section className={`${shellCardClass} p-5`}>
                    <div className="text-sm font-semibold text-foreground">Personal scraper presets</div>
                    <div className="mt-3 space-y-3">
                      {scraperPresets.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => applyScraperPreset(preset)}
                          className={`block w-full rounded-2xl border p-4 text-left transition ${
                            selectedPresetId === preset.id
                              ? "border-primary/40 bg-primary/10"
                              : "border-border bg-background hover:border-primary/30"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="text-sm font-semibold text-foreground">{preset.name}</div>
                            <div className="rounded-full border border-border bg-card px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                              {preset.persona}
                            </div>
                          </div>
                          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            {preset.city}, {preset.state}
                          </div>
                          <div className="mt-2 text-sm leading-6 text-muted-foreground">
                            {preset.industry} · {preset.keyword}
                          </div>
                          <div className="mt-2 text-sm leading-6 text-muted-foreground">{preset.brief}</div>
                        </button>
                      ))}
                    </div>
                    <div className={`mt-4 ${shellInsetClass} p-4 text-sm leading-6 text-muted-foreground`}>
                      Active workspace: {activeScraperPreset?.name ?? "custom search"} · {activeScraperPreset?.browserLane ?? "manual browser lane"}.
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
