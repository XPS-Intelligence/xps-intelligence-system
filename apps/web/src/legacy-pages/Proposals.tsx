import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { FileText, Plus, DollarSign, CheckCircle2, Clock, Send, Eye } from "lucide-react";

const proposals = [
  { id: "P-2024-0342", client: "Gulf Coast Logistics", service: "Industrial Epoxy", value: "$120,000", status: "Sent", date: "Mar 15, 2026" },
  { id: "P-2024-0341", client: "Ace Hardware Distribution", service: "Polished Concrete", value: "$45,000", status: "Viewed", date: "Mar 14, 2026" },
  { id: "P-2024-0340", client: "Tampa Bay Brewing Co.", service: "Decorative Epoxy", value: "$28,000", status: "Draft", date: "Mar 13, 2026" },
  { id: "P-2024-0339", client: "Palm Medical Center", service: "Healthcare Flooring", value: "$85,000", status: "Approved", date: "Mar 12, 2026" },
  { id: "P-2024-0338", client: "Sunshine Auto Group", service: "Garage Floor Coating", value: "$62,000", status: "Sent", date: "Mar 10, 2026" },
  { id: "P-2024-0337", client: "Metro Fitness Chain", service: "Rubber Flooring Prep", value: "$34,000", status: "Approved", date: "Mar 8, 2026" },
];

const statusStyle: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground",
  Sent: "bg-blue-500/10 text-blue-400",
  Viewed: "bg-primary/10 text-primary",
  Approved: "bg-green-500/10 text-green-400",
};

const ProposalsPage = () => (
  <AppLayout title="Proposals">
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Proposal Engine</h2>
          <p className="text-sm text-muted-foreground">AI-powered proposals, estimates, and invoices</p>
        </div>
        <Button variant="gold" size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" />Create Proposal</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Proposals", value: "342", icon: FileText },
          { label: "Pipeline Value", value: "$2.1M", icon: DollarSign },
          { label: "Approval Rate", value: "68%", icon: CheckCircle2 },
          { label: "Avg Response", value: "2.4 days", icon: Clock },
        ].map((m) => (
          <div key={m.label} className="bg-gradient-card border border-border rounded-xl p-5">
            <m.icon className="h-4 w-4 text-primary mb-2" />
            <div className="text-2xl font-bold text-foreground">{m.value}</div>
            <div className="text-xs text-muted-foreground">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-gradient-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {["Proposal ID", "Client", "Service", "Value", "Status", "Date"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {proposals.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors cursor-pointer">
                <td className="px-4 py-3 text-sm font-mono text-primary">{p.id}</td>
                <td className="px-4 py-3 text-sm font-medium text-foreground">{p.client}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{p.service}</td>
                <td className="px-4 py-3 text-sm font-semibold text-foreground">{p.value}</td>
                <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyle[p.status]}`}>{p.status}</span></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{p.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </AppLayout>
);

export default ProposalsPage;
