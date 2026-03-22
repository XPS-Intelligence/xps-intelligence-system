import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plug, CheckCircle2, XCircle, AlertCircle, Settings, ExternalLink } from "lucide-react";

const connectors = [
  { name: "HubSpot CRM", desc: "Sync leads, contacts, and deals with HubSpot", status: "connected", category: "CRM" },
  { name: "Gmail / Google Workspace", desc: "Email sending, tracking, and calendar sync", status: "connected", category: "Email" },
  { name: "Twilio SMS", desc: "SMS outreach and automated messaging", status: "configured", category: "SMS" },
  { name: "Google Calendar", desc: "Schedule meetings, reminders, and follow-ups", status: "connected", category: "Calendar" },
  { name: "Firecrawl", desc: "Web scraping and company research automation", status: "configured", category: "Research" },
  { name: "Steel Browser", desc: "Advanced browser automation for research workflows", status: "pending", category: "Research" },
  { name: "Square Payments", desc: "Payment processing for proposals and invoices", status: "pending", category: "Payments" },
  { name: "Playwright Workflows", desc: "Automated testing and research task runners", status: "pending", category: "DevOps" },
  { name: "GitHub", desc: "Repository sync and deployment tracking", status: "connected", category: "DevOps" },
  { name: "Railway", desc: "Backend deployment and service management", status: "configured", category: "DevOps" },
  { name: "Proposal Export", desc: "PDF/DOCX export for proposals and estimates", status: "configured", category: "Documents" },
  { name: "Slack", desc: "Team notifications and deal alerts", status: "pending", category: "Communication" },
];

const statusConfig: Record<string, { icon: typeof CheckCircle2; label: string; className: string }> = {
  connected: { icon: CheckCircle2, label: "Connected", className: "text-green-400" },
  configured: { icon: AlertCircle, label: "Configured", className: "text-primary" },
  pending: { icon: XCircle, label: "Not Connected", className: "text-muted-foreground" },
};

const ConnectorsPage = () => (
  <AppLayout title="Connectors">
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Connector Hub</h2>
          <p className="text-sm text-muted-foreground">Manage integrations and external service connections</p>
        </div>
        <Button variant="gold" size="sm"><Plug className="h-3.5 w-3.5 mr-1.5" />Add Connector</Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {connectors.map((c) => {
          const st = statusConfig[c.status];
          return (
            <div key={c.name} className="bg-gradient-card border border-border rounded-xl p-5 hover:border-gold transition-all duration-300 group">
              <div className="flex items-start justify-between mb-3">
                <div className="rounded-lg bg-primary/10 p-2.5">
                  <Plug className="h-4 w-4 text-primary" />
                </div>
                <div className={`flex items-center gap-1.5 text-xs ${st.className}`}>
                  <st.icon className="h-3.5 w-3.5" />
                  {st.label}
                </div>
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">{c.name}</h3>
              <p className="text-xs text-muted-foreground mb-3">{c.desc}</p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">{c.category}</span>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Settings className="h-3.5 w-3.5 mr-1" />Configure
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </AppLayout>
);

export default ConnectorsPage;
