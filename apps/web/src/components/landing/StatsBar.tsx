import { Shield, Zap, Target, TrendingUp } from "lucide-react";

const stats = [
  { icon: Shield, label: "Enterprise Security", desc: "SOC2-ready infrastructure" },
  { icon: Zap, label: "AI-Powered", desc: "Intelligent lead scoring & outreach" },
  { icon: Target, label: "Multi-Tenant", desc: "60+ locations, one platform" },
  { icon: TrendingUp, label: "Revenue Engine", desc: "End-to-end sales automation" },
];

export const StatsBar = () => (
  <section className="border-y border-border bg-card/50">
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((s) => (
          <div key={s.label} className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <s.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">{s.label}</div>
              <div className="text-xs text-muted-foreground">{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
