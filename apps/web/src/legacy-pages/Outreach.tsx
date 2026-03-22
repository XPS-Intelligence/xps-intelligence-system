import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Mail, Plus, Clock, CheckCircle2, Send, Edit } from "lucide-react";

const templates = [
  { name: "Initial Outreach — Polishing", type: "Email", status: "Active", uses: 342, lastUsed: "Today" },
  { name: "Follow-Up — No Response (7 day)", type: "Email", status: "Active", uses: 218, lastUsed: "Yesterday" },
  { name: "Proposal Follow-Up", type: "Email", status: "Active", uses: 156, lastUsed: "2 days ago" },
  { name: "Promo Code — Seasonal Offer", type: "Email", status: "Draft", uses: 0, lastUsed: "N/A" },
  { name: "Post-Sale Thank You", type: "Email", status: "Active", uses: 89, lastUsed: "3 days ago" },
  { name: "Appointment Confirmation", type: "SMS", status: "Active", uses: 412, lastUsed: "Today" },
  { name: "Quick Check-In", type: "SMS", status: "Active", uses: 267, lastUsed: "Yesterday" },
  { name: "Reactivation — Dormant Lead", type: "Email", status: "Active", uses: 74, lastUsed: "1 week ago" },
];

const OutreachPage = () => (
  <AppLayout title="Outreach">
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Outreach Center</h2>
          <p className="text-sm text-muted-foreground">Email and SMS templates, sequences, and campaign management</p>
        </div>
        <Button variant="gold" size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" />New Template</Button>
      </div>

      <div className="bg-gradient-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {["Template", "Type", "Status", "Uses", "Last Used", ""].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.name} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      {t.type === "SMS" ? <Send className="h-3.5 w-3.5 text-primary" /> : <Mail className="h-3.5 w-3.5 text-primary" />}
                    </div>
                    <span className="text-sm font-medium text-foreground">{t.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{t.type}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${t.status === "Active" ? "bg-green-500/10 text-green-400" : "bg-muted text-muted-foreground"}`}>{t.status}</span>
                </td>
                <td className="px-4 py-3 text-sm text-foreground">{t.uses}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{t.lastUsed}</td>
                <td className="px-4 py-3">
                  <Button variant="ghost" size="icon"><Edit className="h-3.5 w-3.5" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </AppLayout>
);

export default OutreachPage;
