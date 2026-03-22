import { motion } from "framer-motion";
import {
  Brain, Users, FileText, BarChart3, Search, Mail,
  Layers, Globe, Shield, Wrench, BookOpen, Plug
} from "lucide-react";

const features = [
  { icon: Brain, title: "AI Sales Assistant", desc: "Personal AI workspace for every rep — objection handling, call prep, lead research, and outreach drafting." },
  { icon: Users, title: "CRM & Lead Intelligence", desc: "Full-featured CRM with AI-enhanced company profiles, scoring, pipeline management, and territory tracking." },
  { icon: Search, title: "Research Lab", desc: "Manual and automated web research console for competitive intelligence and lead discovery." },
  { icon: Mail, title: "Outreach Automation", desc: "AI-powered email and SMS template builder with sequences, scheduling, and per-location branding." },
  { icon: FileText, title: "Proposal Engine", desc: "AI proposal creator with service-specific templates, material estimators, and approval workflows." },
  { icon: BarChart3, title: "Analytics Center", desc: "Executive dashboards with pipeline metrics, territory performance, and campaign analytics." },
  { icon: Layers, title: "Pre-Bid Intelligence", desc: "Construction project research, takeoff workspaces, and pre-bid scraping tools." },
  { icon: Globe, title: "Competition Watch", desc: "Public-source competitor monitoring with pricing, promotions, and material tracking." },
  { icon: BookOpen, title: "Knowledge Base", desc: "Enterprise knowledge system with SOPs, playbooks, battle cards, and onboarding modules." },
  { icon: Shield, title: "Role-Based Access", desc: "Employee, Manager, Owner, and Admin portals with dedicated dashboards and permissions." },
  { icon: Wrench, title: "DevOps Factory", desc: "System integrations, deployment status, audit logs, and AI factory management." },
  { icon: Plug, title: "Connector Hub", desc: "Extensible integration hub for CRM, email, SMS, payments, and research services." },
];

export const FeaturesSection = () => (
  <section id="platform" className="py-24 bg-background">
    <div className="container mx-auto px-4">
      <div className="text-center mb-16">
        <span className="text-xs text-primary font-semibold uppercase tracking-widest">Platform Modules</span>
        <h2 className="text-3xl md:text-4xl font-bold mt-3 text-foreground">Everything Your Sales Army Needs</h2>
        <p className="text-muted-foreground mt-3 max-w-xl mx-auto">A unified command center purpose-built for polishing, epoxy, and decorative concrete sales teams.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="group bg-gradient-card border border-border rounded-xl p-6 hover:border-gold hover:shadow-gold transition-all duration-300"
          >
            <div className="rounded-lg bg-primary/10 p-2.5 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
              <f.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);
