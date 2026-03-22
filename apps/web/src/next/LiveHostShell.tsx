"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";

import heroBg from "@/assets/hero-bg.jpg";
import xpsLogo from "@/assets/xps-logo.png";
import { LiveAuthView } from "@/next/LiveAuthView";
import { LiveWorkspaceView } from "@/next/LiveWorkspaceView";

const workspaceRoutes = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Operational briefing",
    summary: "Live lead, scoring, and recommendation status from the canonical XPS pipeline.",
    notes: ["Recent movement updates from live API data", "Pipeline stages reflect canonical candidates", "Use the scraper route to generate additional volume"],
  },
  "/leads": {
    title: "Leads",
    subtitle: "Lead intelligence",
    summary: "A scored candidate stream backed by canonical companies, contacts, recommendations, and worker ingest.",
    notes: ["Sorted by freshest activity", "Candidate score and recommendation stay visible", "CRM sync comes after validation"],
  },
  "/ai-assistant": {
    title: "AI Assistant",
    subtitle: "Rep copilot",
    summary: "This route is reserved for Groq/Ollama-backed lead summaries, recommendations, and sales assistance.",
    notes: ["Next step: connect provider routing", "Prompt library follows canonical lead detail", "Outbound recommendations will land here"],
  },
  "/crm": {
    title: "CRM",
    subtitle: "Account workspace",
    summary: "HubSpot-bound activation lives here once approved candidates are promoted.",
    notes: ["Promotion path is next", "HubSpot sync log will surface here", "Keep CRM activation downstream from validation"],
  },
  "/research": {
    title: "Research Lab",
    subtitle: "Signal discovery",
    summary: "Research and intelligence will sit on top of the same canonical company records.",
    notes: ["Web signal intake", "Competitive watchlists", "Source provenance lives in the ingest tables"],
  },
  "/scraper": {
    title: "Scraper",
    subtitle: "Capture pipeline",
    summary: "Manual crawl and category/location search now queue into Redis and persist through the canonical ingest path.",
    notes: ["Search uses provider APIs first, then public-search fallback", "Direct crawl uses Firecrawl or HTML fetch fallback", "Job state is visible below"],
  },
  "/analytics": {
    title: "Analytics",
    subtitle: "Performance view",
    summary: "Live topline metrics derived from the candidate, score, and recommendation tables.",
    notes: ["Pipeline value uses the current scoring snapshot", "Recent activity comes from open recommendations", "This view now mirrors the dashboard contract"],
  },
  "/admin": {
    title: "Admin Control Plane",
    subtitle: "Editor, governance, and system control",
    summary: "The protected admin surface now hosts a donor-aligned center editor, live preview, and the first runtime controls for operating the XPS platform safely.",
    notes: ["Admin-only route protection is active", "Editor reads and writes against the host repo allow list", "Next step: sandbox and agent-builder expansion"],
  },
  "/manager": {
    title: "Manager Workspace",
    subtitle: "Team oversight",
    summary: "Managers get lead flow visibility, assignment context, and operational metrics without the full creation surface of the admin plane.",
    notes: ["Route access is role-gated", "Lead quality and activity stay visible", "Escalations and coaching will land here"],
  },
  "/owner": {
    title: "Owner Workspace",
    subtitle: "Executive command view",
    summary: "Owners see topline performance, pipeline quality, and intelligence posture without needing to touch the editor or lower-level system controls.",
    notes: ["Role-specific route guard is active", "Pipeline and system health should converge here", "This page is the executive operations surface"],
  },
  "/settings": {
    title: "Settings",
    subtitle: "System preferences",
    summary: "Environment, integration, and policy controls belong here once provider setup is finalized.",
    notes: ["Supabase wiring", "HubSpot and Twilio config", "Auth and route policy"],
  },
} as const;

const authRoutes = {
  "/login": {
    title: "Welcome back",
    subtitle: "Sign in to the XPS Intelligence command center.",
    cta: "Enter workspace",
  },
  "/onboarding": {
    title: "Onboarding",
    subtitle: "Set up your profile, territory, and working defaults.",
    cta: "Create workspace session",
  },
} as const;

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
                Canonical XPS Runtime
              </div>
              <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
                Lead intelligence, validation, and routing in one command surface.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">
                The clean host is now a real Next.js runtime backed by live API routes, Redis queueing, and canonical ingest tables.
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
                ["Live ingest path", "Canonical company, contact, score, and recommendation records now persist in Postgres."],
                ["Manual plus search", "Direct crawl and category/location search both queue through Redis workers."],
                ["Railway-ready host", "Next, API, worker, Docker, and env contracts are aligned for deployment."],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-black/45 p-5 shadow-elevated backdrop-blur">
                  <div className="text-sm font-semibold text-white">{title}</div>
                  <div className="mt-1 text-sm text-white/65">{copy}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export function LiveHostShell() {
  const pathname = usePathname() ?? "/";
  const normalizedPath = pathname === "/" ? "/" : pathname.replace(/\/$/, "");

  if (normalizedPath === "/") {
    return <LandingView />;
  }

  if (normalizedPath in authRoutes) {
    return <LiveAuthView pathname={normalizedPath} auth={authRoutes[normalizedPath as keyof typeof authRoutes]} />;
  }

  const route = workspaceRoutes[normalizedPath as keyof typeof workspaceRoutes] ?? {
    title: "Workspace",
    subtitle: "Runtime route",
    summary: "This route is reserved while the clean host continues to absorb donor features.",
    notes: ["Return to the dashboard", "Keep the host stable first", "Layer in additional modules after the core flow is proven"],
  } satisfies {
    title: string;
    subtitle: string;
    summary: string;
    notes: readonly string[];
  };

  return <LiveWorkspaceView pathname={normalizedPath} route={route} />;
}
