import { AppLayout } from "@/components/layout/AppLayout";
import { BookOpen, Search, FileText, Shield, Lightbulb, GraduationCap, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";

const categories = [
  { title: "SOPs & Procedures", count: 42, icon: FileText, desc: "Standard operating procedures for sales, operations, and support" },
  { title: "Playbooks", count: 18, icon: Shield, desc: "Sales playbooks for polishing, epoxy, decorative, and industrial verticals" },
  { title: "Battle Cards", count: 24, icon: Lightbulb, desc: "Competitive battle cards and objection handling guides" },
  { title: "Training Modules", count: 12, icon: GraduationCap, desc: "Onboarding and certification training for all roles" },
  { title: "Proposal Examples", count: 36, icon: FileText, desc: "Template proposals organized by service type and project size" },
  { title: "Product Knowledge", count: 58, icon: BookOpen, desc: "Materials, systems, and application technical specifications" },
];

const recentDocs = [
  { title: "Epoxy Floor Coating — Residential Sales Playbook", category: "Playbooks", updated: "2 days ago" },
  { title: "Objection: 'Your price is too high'", category: "Battle Cards", updated: "3 days ago" },
  { title: "Metallic Epoxy Application SOP v3.2", category: "SOPs", updated: "1 week ago" },
  { title: "New Employee Onboarding Checklist", category: "Training", updated: "1 week ago" },
  { title: "Commercial Warehouse Proposal Template", category: "Proposals", updated: "2 weeks ago" },
];

const KnowledgePage = () => (
  <AppLayout title="Knowledge Base">
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Knowledge Base</h2>
        <p className="text-sm text-muted-foreground">Enterprise knowledge, training, and reference materials</p>
      </div>

      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search knowledge base..." className="pl-9 bg-card border-border" />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div key={cat.title} className="bg-gradient-card border border-border rounded-xl p-5 hover:border-gold transition-all duration-300 cursor-pointer group">
            <div className="flex items-center justify-between mb-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <cat.icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs text-primary font-medium">{cat.count} docs</span>
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">{cat.title}</h3>
            <p className="text-xs text-muted-foreground">{cat.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-gradient-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Recently Updated</h3>
        <div className="space-y-2">
          {recentDocs.map((doc) => (
            <div key={doc.title} className="flex items-center justify-between py-2.5 border-b border-border last:border-0 hover:bg-accent/30 px-2 rounded-lg cursor-pointer transition-colors">
              <div>
                <div className="text-sm text-foreground">{doc.title}</div>
                <div className="text-xs text-muted-foreground">{doc.category} · {doc.updated}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </AppLayout>
);

export default KnowledgePage;
