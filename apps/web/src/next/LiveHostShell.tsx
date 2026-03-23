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
    subtitle: "Sales intelligence briefing",
    category: "core",
    template: "team-member",
    summary: "Your sales command center for active leads, pipeline movement, scoring, recommendations, and daily priorities.",
    notes: ["Track lead movement across the pipeline", "Review the strongest recommendations first", "Use Scraper to generate additional qualified volume"],
  },
  "/leads": {
    title: "Leads",
    subtitle: "Lead intelligence",
    category: "core",
    template: "team-member",
    summary: "Review scored leads, contact coverage, recommendations, and promotion readiness in one working queue.",
    notes: ["Lead score and recommendation stay visible", "Use contact links to move quickly into outreach", "Promote only validated leads into CRM"],
  },
  "/ai-assistant": {
    title: "AI Assistant",
    subtitle: "Sales copilot",
    category: "assistant",
    template: "team-member",
    summary: "XPS AI Sales Assistant for lead research, outreach drafting, objection handling, follow-up strategy, and next-best-action guidance.",
    notes: ["Stay in context while reviewing live leads", "Use summaries and drafts before making contact", "Keep assistant guidance attached to the active workspace"],
  },
  "/crm": {
    title: "CRM",
    subtitle: "CRM dashboard",
    category: "core",
    template: "team-leader",
    summary: "Manage validated leads, activation status, sync posture, and downstream account workflow in the CRM dashboard.",
    notes: ["Review activation-ready leads first", "Watch sync posture before scaling automation", "Keep CRM updates downstream from validation"],
  },
  "/research": {
    title: "Research Lab",
    subtitle: "Market and lead research",
    category: "intelligence",
    template: "team-member",
    summary: "Explore market signals, competitive positioning, and supporting research that can sharpen lead qualification and outreach.",
    notes: ["Watchlist important competitors and regions", "Use research findings to guide pipeline strategy", "Keep source evidence attached to the lead story"],
  },
  "/scraper": {
    title: "Scraper",
    subtitle: "Lead capture",
    category: "intelligence",
    template: "team-member",
    summary: "Run manual search, direct crawl, and preset-based capture jobs to feed new leads into the qualification pipeline.",
    notes: ["Use search presets to open new territories faster", "Use direct crawl when you already know the site or company", "Monitor queue status before promoting results"],
  },
  "/analytics": {
    title: "Analytics Center",
    subtitle: "Executive overview",
    category: "analytics",
    template: "team-leader",
    summary: "Track pipeline value, conversion posture, proposal activity, and the metrics that matter most to leadership.",
    notes: ["Watch score and activation trends together", "Use recent activity to catch shifts early", "Treat this as the operating summary for performance"],
  },
  "/admin": {
    title: "Admin Control Plane",
    subtitle: "Editor and system control",
    category: "system",
    template: "admin",
    summary: "Operate the system, edit governed files, launch routes, watch previews, and control how the platform evolves from one cockpit.",
    notes: ["Use the center editor and preview together", "Keep system changes governed and validated", "Expand tools from here instead of scattering admin controls"],
  },
  "/manager": {
    title: "Manager Dashboard",
    subtitle: "Team oversight",
    category: "role",
    template: "team-leader",
    summary: "Lead flow visibility, rep oversight, coaching signals, and operating metrics for managers running the team day to day.",
    notes: ["Watch lead quality and workload together", "Use this workspace for coaching and escalation", "Keep manager controls lighter than admin"],
  },
  "/owner": {
    title: "Owner Portal",
    subtitle: "Executive command view",
    category: "role",
    template: "owner",
    summary: "An executive portal for top-line visibility, pipeline quality, growth posture, and system awareness without day-to-day admin complexity.",
    notes: ["Keep strategy and pipeline health in one place", "Review major risks and opportunities quickly", "Use this as the executive operating surface"],
  },
  "/settings": {
    title: "Settings",
    subtitle: "Account and preferences",
    category: "system",
    template: "team-member",
    summary: "Manage your account, notification preferences, assistant settings, and team defaults from one place.",
    notes: ["Control how the assistant supports you", "Tune the experience without touching the system core", "Keep personal and team settings easy to reach"],
  },
} as const;

const authRoutes = {
  "/login": {
    title: "Welcome back",
    subtitle: "Sign in to your XPS Intelligence account.",
    cta: "Enter workspace",
  },
  "/onboarding": {
    title: "Onboarding",
    subtitle: "Set up your profile, territory, and assistant defaults.",
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
                AI-Powered Sales Intelligence Platform
              </div>
              <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
                The Command Center for
                <span className="block text-gradient-gold">Xtreme Sales</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">
                Empowering locations, sales staff, and leadership with AI-driven CRM, lead intelligence, proposal automation, and competitive insights.
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
                ["Qualified lead flow", "Scored candidates, recommendations, and follow-up guidance stay visible inside the same command center."],
                ["Manual plus search", "Direct crawl and category/location search can keep feeding the lead pipeline without leaving the app."],
                ["Operator control", "Admin, rep, manager, and owner workflows stay inside one governed operating surface."],
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
