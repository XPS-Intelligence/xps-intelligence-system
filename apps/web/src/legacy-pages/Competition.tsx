import { AppLayout } from "@/components/layout/AppLayout";
import { Eye, TrendingUp, TrendingDown, Building2, DollarSign, Star, Globe, Minus } from "lucide-react";

const competitors = [
  { name: "PolyCoat Pro", type: "Contractor", territory: "Southeast FL", threat: "High", priceLevel: "$$", lastChange: "New promo: 15% off garage floors", changeDate: "2 days ago", strengths: ["Fast turnaround", "Low pricing"], weaknesses: ["Limited warranty", "No industrial"] },
  { name: "FloorCraft Systems", type: "Contractor", territory: "Central FL", threat: "Medium", priceLevel: "$$$", lastChange: "Added metallic epoxy service line", changeDate: "1 week ago", strengths: ["Premium finishes", "Strong reviews"], weaknesses: ["Slow response time", "Small team"] },
  { name: "EpoxyMaster Supply", type: "Distributor", territory: "National", threat: "High", priceLevel: "$$", lastChange: "Price increase on polyaspartic systems +8%", changeDate: "3 days ago", strengths: ["Wide distribution", "Training programs"], weaknesses: ["No installation", "Minimum orders"] },
  { name: "GrindTech Industries", type: "Manufacturer", territory: "National", threat: "Low", priceLevel: "$$$$", lastChange: "Launched new diamond tooling line", changeDate: "2 weeks ago", strengths: ["Premium quality", "Innovation"], weaknesses: ["Premium pricing", "Long lead times"] },
  { name: "SurfacePro Coatings", type: "Contractor", territory: "Southwest FL", threat: "Medium", priceLevel: "$$", lastChange: "Hired 3 new sales reps in Naples area", changeDate: "1 week ago", strengths: ["Aggressive pricing", "Local presence"], weaknesses: ["Quality concerns", "High turnover"] },
];

const threatColor: Record<string, string> = {
  High: "text-red-400 bg-red-500/10",
  Medium: "text-orange-400 bg-orange-500/10",
  Low: "text-green-400 bg-green-500/10",
};

const CompetitionPage = () => (
  <AppLayout title="Competition Watch">
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Competition Intelligence</h2>
        <p className="text-sm text-muted-foreground">Public-source competitor monitoring and market intelligence</p>
      </div>

      {/* Competitor Cards */}
      <div className="space-y-4">
        {competitors.map((c) => (
          <div key={c.name} className="bg-gradient-card border border-border rounded-xl p-5 hover:border-gold transition-all duration-300">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-3 shrink-0">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-base font-semibold text-foreground">{c.name}</h3>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${threatColor[c.threat]}`}>{c.threat} Threat</span>
                    <span className="text-xs text-muted-foreground">{c.type}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{c.territory}</span>
                    <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{c.priceLevel}</span>
                  </div>
                  <div className="bg-accent/50 border border-border rounded-lg px-3 py-2 mb-3">
                    <div className="text-xs text-muted-foreground mb-0.5">Latest Change · {c.changeDate}</div>
                    <div className="text-sm text-foreground">{c.lastChange}</div>
                  </div>
                  <div className="flex gap-6">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-green-400 mb-1">Strengths</div>
                      {c.strengths.map((s) => <div key={s} className="text-xs text-muted-foreground">• {s}</div>)}
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-red-400 mb-1">Weaknesses</div>
                      {c.weaknesses.map((w) => <div key={w} className="text-xs text-muted-foreground">• {w}</div>)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground/50 text-center">All competitive intelligence is gathered from publicly available sources only.</p>
    </div>
  </AppLayout>
);

export default CompetitionPage;
