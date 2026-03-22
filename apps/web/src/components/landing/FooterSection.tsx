import xpsLogo from "@/assets/xps-logo.png";
import { assetSrc } from "@/lib/assets";

export const FooterSection = () => (
  <footer className="border-t border-border bg-card/30 py-12">
    <div className="container mx-auto px-4">
      <div className="grid md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <img src={assetSrc(xpsLogo)} alt="XPS" className="h-8 w-8" />
            <span className="text-sm font-bold tracking-wider text-foreground">XPS INTELLIGENCE</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">AI-powered sales intelligence for Xtreme Polishing Systems & XPS Xpress. 60+ locations nationwide.</p>
        </div>
        {[
          { title: "Platform", links: ["AI Assistant", "CRM", "Proposals", "Analytics", "Research Lab"] },
          { title: "Company", links: ["About XPS", "Careers", "Coverage Map", "Contact"] },
          { title: "Resources", links: ["Knowledge Base", "Playbooks", "Training", "Support"] },
        ].map((col) => (
          <div key={col.title}>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-foreground mb-3">{col.title}</h4>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link}><a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{link}</a></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-3">
        <p className="text-xs text-muted-foreground">© 2026 Xtreme Polishing Systems. All rights reserved.</p>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
          <a href="#" className="hover:text-foreground transition-colors">Terms</a>
          <a href="#" className="hover:text-foreground transition-colors">Security</a>
        </div>
      </div>
    </div>
  </footer>
);
